// Called by the app (logged-in user) after a Paystack payment, and on login.
// Verifies the payment with Paystack, attaches any website payments made with the
// user's email, extends the plan and returns the church's current billing status.
import { adminClient, claimPaymentsByEmail, recordPayment, verifyTransaction } from './_billing.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Not signed in.' });

  try {
    const db = adminClient();
    const { data: { user }, error } = await db.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Not signed in.' });

    // Same rule as auth_church_id() in the database
    const churchId = user.user_metadata?.church_id || user.id;

    const reference = req.body?.reference;
    if (reference) {
      const tx = await verifyTransaction(String(reference));
      const result = await recordPayment(db, tx);
      if (!result.ok) return res.status(400).json({ error: result.reason });
    }

    if (user.email) await claimPaymentsByEmail(db, user.email, churchId);

    const { data: settings } = await db
      .from('church_settings')
      .select('plan, plan_expires_at, trial_ends_at, billing_months')
      .eq('church_id', churchId)
      .maybeSingle();

    return res.status(200).json({ settings });
  } catch (err) {
    console.error('billing-sync error', err);
    return res.status(500).json({ error: 'Could not confirm your payment. If you were charged, contact support with your reference.' });
  }
}
