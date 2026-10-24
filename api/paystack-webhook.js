// Paystack webhook — set this URL in Paystack: Settings → API Keys & Webhooks → Live Webhook URL
//   https://app.churchcare.online/api/paystack-webhook
// Receives payments from both the website and the app, so a plan is activated even if the
// payer closes the browser before the app hears back.
import crypto from 'node:crypto';
import { adminClient, recordPayment, verifyTransaction } from './_billing.js';

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks).toString('utf8');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const raw = await readRawBody(req);
  const expected = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY || '')
    .update(raw)
    .digest('hex');
  if (req.headers['x-paystack-signature'] !== expected) return res.status(401).end();

  let event;
  try { event = JSON.parse(raw); } catch { return res.status(400).end(); }
  if (event.event !== 'charge.success') return res.status(200).end();

  try {
    // Re-check with Paystack rather than trusting the payload
    const tx = await verifyTransaction(event.data.reference);
    const result = await recordPayment(adminClient(), tx);
    if (!result.ok) console.warn('Payment not applied', event.data.reference, result.reason);
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook error', event.data?.reference, err);
    // Non-2xx makes Paystack retry later
    return res.status(500).json({ error: 'processing_failed' });
  }
}
