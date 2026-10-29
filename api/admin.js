// Platform admin API: lets the ChurchCare owner see every church and activate,
// extend, suspend or reactivate it. Runs with the service role key, so every
// request is checked against PLATFORM_ADMIN_EMAILS first.
//
// Required Vercel environment variable (in addition to the billing ones):
//   PLATFORM_ADMIN_EMAILS   comma separated, e.g. "you@gmail.com,info@churchcare.online"
import { adminClient, MONTHLY_GHS } from './_billing.js';

const PLANS = [...Object.keys(MONTHLY_GHS), 'custom'];

function adminEmails() {
  return String(process.env.PLATFORM_ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
}

async function requireAdmin(db, req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data: { user }, error } = await db.auth.getUser(token);
  if (error || !user?.email) return null;
  return adminEmails().includes(user.email.toLowerCase()) ? user : null;
}

/** Every church that exists, from settings rows and from user profiles. */
async function listChurches(db) {
  const [{ data: settings, error: sErr }, { data: profiles, error: pErr }, { data: payments }] = await Promise.all([
    db.from('church_settings').select('*'),
    db.from('profiles').select('id, name, email, role, church_id, phone, created_at'),
    db.from('payments').select('church_id, amount_pesewas, paid_at, plan, months, reference').not('church_id', 'is', null),
  ]);
  if (sErr) throw new Error(sErr.message);
  if (pErr) throw new Error(pErr.message);

  const byChurch = new Map();
  const get = id => {
    if (!byChurch.has(id)) byChurch.set(id, { church_id: id, settings: null, users: [], payments: [] });
    return byChurch.get(id);
  };
  for (const s of settings ?? []) get(s.church_id).settings = s;
  for (const p of profiles ?? []) if (p.church_id) get(p.church_id).users.push(p);
  for (const p of payments ?? []) get(p.church_id).payments.push(p);

  const ids = [...byChurch.keys()];
  const counts = await Promise.all(
    ids.map(id => db.from('members').select('id', { count: 'exact', head: true }).eq('church_id', id)),
  );

  return ids.map((id, i) => {
    const c = byChurch.get(id);
    const s = c.settings ?? {};
    const owner = c.users.find(u => u.role === 'Administrator') ?? c.users[0] ?? null;
    const paymentName = c.payments.find(p => p.church_name)?.church_name;
    const signedUp = [s.created_at, ...c.users.map(u => u.created_at)].filter(Boolean).sort()[0] ?? null;
    return {
      churchId: id,
      name: s.name || paymentName || null,
      ownerName: owner?.name ?? null,
      ownerEmail: owner?.email ?? null,
      ownerPhone: owner?.phone ?? null,
      userCount: c.users.length,
      memberCount: counts[i].count ?? 0,
      plan: s.plan ?? 'free',
      trialEndsAt: s.trial_ends_at ?? null,
      planExpiresAt: s.plan_expires_at ?? null,
      billingMonths: s.billing_months ?? null,
      status: s.status ?? 'active',
      suspendedReason: s.suspended_reason ?? null,
      suspendedAt: s.suspended_at ?? null,
      signedUpAt: signedUp,
      totalPaidGHS: c.payments.reduce((sum, p) => sum + p.amount_pesewas, 0) / 100,
      lastPaymentAt: c.payments.map(p => p.paid_at).sort().pop() ?? null,
    };
  });
}

async function updateChurch(db, churchId, patch) {
  const { error } = await db
    .from('church_settings')
    .upsert({ church_id: churchId, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'church_id' });
  if (error) throw new Error(error.message);
}

export default async function handler(req, res) {
  try {
    const db = adminClient();
    const admin = await requireAdmin(db, req);
    if (!admin) return res.status(403).json({ error: 'You do not have access to the admin panel.' });

    if (req.method === 'GET') {
      return res.status(200).json({ churches: await listChurches(db), admin: admin.email });
    }
    if (req.method !== 'POST') return res.status(405).end();

    const { action, churchId } = req.body || {};
    if (!churchId || typeof churchId !== 'string') return res.status(400).json({ error: 'Missing church.' });

    switch (action) {
      case 'activate': {
        // Give a paid plan for N months (or no expiry when months is 0 / empty)
        const plan = String(req.body.plan || '').toLowerCase();
        const months = Number(req.body.months) || 0;
        if (!PLANS.includes(plan)) return res.status(400).json({ error: 'Unknown plan.' });
        let expires = null;
        if (months > 0) {
          expires = new Date();
          expires.setMonth(expires.getMonth() + months);
        }
        await updateChurch(db, churchId, {
          plan,
          plan_expires_at: expires ? expires.toISOString() : null,
          billing_months: months || null,
          status: 'active',
          suspended_reason: null,
          suspended_at: null,
        });
        break;
      }
      case 'extend_trial': {
        const days = Math.min(365, Math.max(1, Number(req.body.days) || 0));
        const { data: cur } = await db.from('church_settings').select('trial_ends_at').eq('church_id', churchId).maybeSingle();
        const now = new Date();
        const from = cur?.trial_ends_at && new Date(cur.trial_ends_at) > now ? new Date(cur.trial_ends_at) : now;
        from.setDate(from.getDate() + days);
        await updateChurch(db, churchId, { trial_ends_at: from.toISOString() });
        break;
      }
      case 'suspend':
        await updateChurch(db, churchId, {
          status: 'suspended',
          suspended_reason: String(req.body.reason || '').slice(0, 500) || null,
          suspended_at: new Date().toISOString(),
        });
        break;
      case 'unsuspend':
        await updateChurch(db, churchId, { status: 'active', suspended_reason: null, suspended_at: null });
        break;
      case 'deactivate_plan':
        // Remove the paid plan; the church falls back to its trial (if any) or gets locked
        await updateChurch(db, churchId, { plan: 'free', plan_expires_at: null, billing_months: null });
        break;
      default:
        return res.status(400).json({ error: 'Unknown action.' });
    }

    const churches = await listChurches(db);
    return res.status(200).json({ church: churches.find(c => c.churchId === churchId) ?? null });
  } catch (err) {
    console.error('admin api error', err);
    return res.status(500).json({ error: err.message || 'Something went wrong.' });
  }
}
