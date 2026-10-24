// Shared billing logic for the /api functions (files starting with _ are not exposed as routes).
//
// Required Vercel environment variables (Project → Settings → Environment Variables):
//   PAYSTACK_SECRET_KEY        sk_live_...  (never expose to the browser)
//   SUPABASE_SERVICE_ROLE_KEY  Supabase → Project Settings → API → service_role
//   SUPABASE_URL               optional; falls back to VITE_SUPABASE_URL
import { createClient } from '@supabase/supabase-js';

// Keep in sync with src/lib/billing.ts and the website's Pricing.tsx
export const MONTHLY_GHS = { starter: 200, growth: 350, pro: 500 };
export const DISCOUNT_PCT = { 3: 0, 6: 5, 12: 100 / 6 };

export const priceGHS = (plan, months) =>
  Math.round(MONTHLY_GHS[plan] * months * (1 - DISCOUNT_PCT[months] / 100));

export function adminClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Ask Paystack (with the secret key) for the real status of a transaction. */
export async function verifyTransaction(reference) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) throw new Error('PAYSTACK_SECRET_KEY not configured');
  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.status) throw new Error(body.message || 'Could not verify payment with Paystack');
  return body.data;
}

/** Plan, period and church from the transaction metadata (website and app both send these). */
function readMetadata(tx) {
  let m = tx.metadata || {};
  if (typeof m === 'string') {
    try { m = JSON.parse(m); } catch { m = {}; }
  }
  // The app's older react-paystack format puts values in custom_fields
  for (const f of m.custom_fields || []) {
    if (f?.variable_name && m[f.variable_name] === undefined) m[f.variable_name] = f.value;
  }
  return {
    plan: String(m.plan || '').toLowerCase(),
    months: Number(m.months),
    churchId: m.church_id || null,
    churchName: m.church_name || null,
    source: m.source || (m.church_id ? 'app' : 'website'),
  };
}

async function findChurchByEmail(db, email) {
  const { data } = await db
    .from('profiles')
    .select('church_id, role')
    .eq('email', email);
  if (!data?.length) return null;
  return (data.find(p => p.role === 'Administrator') ?? data[0]).church_id;
}

/**
 * Record a verified Paystack transaction. Safe to call any number of times for the
 * same reference (webhook + browser both call it). Returns the church it was applied to, if any.
 */
export async function recordPayment(db, tx) {
  if (tx.status !== 'success') return { ok: false, reason: 'Payment was not successful.' };
  if (tx.currency !== 'GHS') return { ok: false, reason: 'Unexpected currency.' };

  const { plan, months, churchId, churchName, source } = readMetadata(tx);
  if (!MONTHLY_GHS[plan] || !(months in DISCOUNT_PCT)) return { ok: false, reason: 'Unknown plan or period.' };
  if (tx.amount < priceGHS(plan, months) * 100) return { ok: false, reason: 'Amount paid does not match the plan price.' };

  const email = String(tx.customer?.email || '').toLowerCase();
  const church = churchId || (await findChurchByEmail(db, email));

  const { error } = await db.from('payments').upsert(
    {
      reference: tx.reference,
      church_id: church,
      email,
      plan,
      months,
      amount_pesewas: tx.amount,
      church_name: churchName,
      source,
      paid_at: tx.paid_at || new Date().toISOString(),
    },
    { onConflict: 'reference', ignoreDuplicates: true },
  );
  if (error) throw new Error(`Could not record payment: ${error.message}`);

  if (church) await applyPendingPayments(db, church);
  return { ok: true, churchId: church };
}

/** Attach website payments made with this email to the church (after sign-up / login). */
export async function claimPaymentsByEmail(db, email, churchId) {
  await db
    .from('payments')
    .update({ church_id: churchId })
    .is('church_id', null)
    .eq('email', email.toLowerCase());
  await applyPendingPayments(db, churchId);
}

/** Extend the church's plan once per payment that hasn't been applied yet. */
export async function applyPendingPayments(db, churchId) {
  const { data: pending } = await db
    .from('payments')
    .select('id, plan, months')
    .eq('church_id', churchId)
    .is('applied_at', null)
    .order('paid_at', { ascending: true });

  for (const p of pending ?? []) {
    // Claim atomically so a webhook and a browser call can't both apply the same payment
    const { data: claimed } = await db
      .from('payments')
      .update({ applied_at: new Date().toISOString() })
      .eq('id', p.id)
      .is('applied_at', null)
      .select('id');
    if (!claimed?.length) continue;

    const { data: current } = await db
      .from('church_settings')
      .select('plan_expires_at')
      .eq('church_id', churchId)
      .maybeSingle();

    // Renewing early adds time on top of what's left
    const now = new Date();
    const from = current?.plan_expires_at && new Date(current.plan_expires_at) > now
      ? new Date(current.plan_expires_at)
      : now;
    const expires = new Date(from);
    expires.setMonth(expires.getMonth() + p.months);

    const { error } = await db.from('church_settings').upsert(
      {
        church_id: churchId,
        plan: p.plan,
        plan_expires_at: expires.toISOString(),
        billing_months: p.months,
        updated_at: now.toISOString(),
      },
      { onConflict: 'church_id' },
    );
    if (error) {
      // Un-claim so the next call retries
      await db.from('payments').update({ applied_at: null }).eq('id', p.id);
      throw new Error(`Could not update plan: ${error.message}`);
    }
  }
}
