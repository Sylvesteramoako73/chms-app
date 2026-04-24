/**
 * ChurchCare WhatsApp + SMS Gateway Server
 *
 * Uses @whiskeysockets/baileys for WhatsApp (QR scan).
 * Uses mNotify (https://mnotify.com) for bulk SMS.
 *
 * Endpoints:
 *   GET  /api/whatsapp/events     — SSE stream (QR codes & status updates)
 *   GET  /api/whatsapp/status     — Current connection status
 *   POST /api/whatsapp/connect    — Start connection / show QR
 *   POST /api/whatsapp/disconnect — Logout and clear session
 *   POST /api/whatsapp/send       — Send a single WA message { number, message }
 *   POST /api/whatsapp/send-bulk  — Send WA to many { numbers[], message }
 *   POST /api/sms/send-bulk       — Send SMS via mNotify { numbers[], message, senderId? }
 *   GET  /api/sms/balance         — Check mNotify SMS credit balance
 */

import express from 'express';
import cors from 'cors';
import qrcode from 'qrcode';
import { existsSync, rmSync } from 'fs';
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import pino from 'pino';

const SESSION_DIR = './session';
const PORT = process.env.PORT || 3001;

// ── mNotify SMS config ────────────────────────────────────────────────────────
const MNOTIFY_API_KEY = process.env.MNOTIFY_API_KEY || 'nC6pJx6aV7YMll0tF94y3SNDt';
const MNOTIFY_BASE    = 'https://apps.mnotify.net/smsapi';
const SMS_SENDER_ID   = process.env.SMS_SENDER_ID || 'ChurchCare';

/** Normalise a phone number to the format mNotify expects: 233XXXXXXXXX */
function normaliseMsisdn(raw) {
  let n = raw.replace(/\D/g, '');       // strip non-digits
  if (n.startsWith('00')) n = n.slice(2);
  if (n.startsWith('0')) n = '233' + n.slice(1);  // local GH format 0XXXXXXXXX
  if (!n.startsWith('233')) n = '233' + n;         // bare 9-digit number
  return n;
}

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

// Suppress Baileys internal logs — we do our own logging
const logger = pino({ level: 'silent' });

// ---------- State ----------
let waSocket = null;
let status = 'disconnected'; // 'disconnected' | 'connecting' | 'qr' | 'connected'
let currentQR = null;        // base64 data URL of latest QR code
let connectedPhone = null;   // phone number once connected
const sseClients = new Set();

// ---------- SSE helpers ----------
function broadcast(payload) {
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  sseClients.forEach(res => res.write(data));
}

function sendCurrentState(res) {
  res.write(`data: ${JSON.stringify({ type: 'state', status, qr: currentQR, phone: connectedPhone })}\n\n`);
}

// ---------- SSE endpoint ----------
app.get('/api/whatsapp/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering if present
  res.flushHeaders();

  sendCurrentState(res);
  sseClients.add(res);
  req.on('close', () => sseClients.delete(res));
});

// ---------- Status endpoint ----------
app.get('/api/whatsapp/status', (_req, res) => {
  res.json({ status, qr: currentQR, phone: connectedPhone });
});

// ---------- Connect ----------
async function startConnection() {
  if (waSocket || status === 'connecting' || status === 'qr') return;

  status = 'connecting';
  broadcast({ type: 'state', status, qr: null, phone: null });

  try {
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
    const { version } = await fetchLatestBaileysVersion();

    waSocket = makeWASocket({
      version,
      auth: state,
      logger,
      browser: ['ChurchCare', 'Chrome', '3.0'],
      generateHighQualityLinkPreview: false,
    });

    waSocket.ev.on('creds.update', saveCreds);

    waSocket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        currentQR = await qrcode.toDataURL(qr);
        status = 'qr';
        broadcast({ type: 'state', status, qr: currentQR, phone: null });
        console.log('[WA] QR code ready — scan with WhatsApp on your phone.');
      }

      if (connection === 'open') {
        currentQR = null;
        status = 'connected';
        connectedPhone = waSocket.user?.id?.split(':')[0] ?? 'Unknown';
        broadcast({ type: 'state', status, qr: null, phone: connectedPhone });
        console.log(`[WA] Connected as +${connectedPhone}`);
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const loggedOut = statusCode === DisconnectReason.loggedOut;

        waSocket = null;
        currentQR = null;
        connectedPhone = null;
        status = 'disconnected';
        broadcast({ type: 'state', status, qr: null, phone: null });
        console.log(`[WA] Disconnected (code: ${statusCode})`);

        if (loggedOut) {
          // Session is invalid — delete it so the next connect shows a fresh QR
          if (existsSync(SESSION_DIR)) rmSync(SESSION_DIR, { recursive: true, force: true });
          console.log('[WA] Logged out — session cleared.');
        } else {
          // Network/timeout disconnect — auto-retry in 5 s
          console.log('[WA] Reconnecting in 5 s…');
          setTimeout(startConnection, 5000);
        }
      }
    });
  } catch (err) {
    waSocket = null;
    status = 'disconnected';
    broadcast({ type: 'error', message: err.message });
    console.error('[WA] Connection error:', err.message);
  }
}

app.post('/api/whatsapp/connect', async (_req, res) => {
  startConnection();
  res.json({ ok: true });
});

// ---------- Disconnect ----------
app.post('/api/whatsapp/disconnect', async (_req, res) => {
  if (waSocket) {
    try { await waSocket.logout(); } catch (_) { /* ignore */ }
    waSocket = null;
  }
  if (existsSync(SESSION_DIR)) rmSync(SESSION_DIR, { recursive: true, force: true });
  currentQR = null;
  connectedPhone = null;
  status = 'disconnected';
  broadcast({ type: 'state', status, qr: null, phone: null });
  res.json({ ok: true });
});

// ---------- Send single message ----------
app.post('/api/whatsapp/send', async (req, res) => {
  const { number, message } = req.body ?? {};

  if (!waSocket || status !== 'connected') {
    return res.status(400).json({ error: 'WhatsApp not connected' });
  }
  if (!number || !message) {
    return res.status(400).json({ error: 'number and message are required' });
  }

  try {
    const jid = number.replace(/\D/g, '') + '@s.whatsapp.net';
    await waSocket.sendMessage(jid, { text: message });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- Send to multiple numbers ----------
app.post('/api/whatsapp/send-bulk', async (req, res) => {
  const { numbers, message } = req.body ?? {};

  if (!waSocket || status !== 'connected') {
    return res.status(400).json({ error: 'WhatsApp not connected' });
  }
  if (!Array.isArray(numbers) || numbers.length === 0 || !message) {
    return res.status(400).json({ error: 'numbers (array) and message are required' });
  }

  const results = [];
  for (const number of numbers) {
    try {
      const jid = number.replace(/\D/g, '') + '@s.whatsapp.net';
      await waSocket.sendMessage(jid, { text: message });
      results.push({ number, ok: true });
    } catch (err) {
      results.push({ number, ok: false, error: err.message });
    }
    // 500 ms gap between messages to avoid WhatsApp rate-limiting
    await new Promise(r => setTimeout(r, 500));
  }

  const sent = results.filter(r => r.ok).length;
  const failed = results.length - sent;
  res.json({ results, sent, failed });
});

// ── SMS: send bulk via mNotify v3 REST API ────────────────────────────────────
app.post('/api/sms/send-bulk', async (req, res) => {
  const { numbers, message, senderId, apiKey } = req.body ?? {};

  if (!Array.isArray(numbers) || numbers.length === 0 || !message) {
    return res.status(400).json({ error: 'numbers (array) and message are required' });
  }

  const key    = (apiKey || MNOTIFY_API_KEY).trim();
  const sender = ((senderId || SMS_SENDER_ID) + '').slice(0, 11);
  const normalised = numbers.map(normaliseMsisdn).filter(n => n.length >= 11);

  if (normalised.length === 0) {
    return res.status(400).json({ error: 'No valid phone numbers after normalisation' });
  }

  try {
    // mNotify v3 REST API — returns JSON
    const url = `https://api.mnotify.com/api/sms/quick?key=${encodeURIComponent(key)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient:     normalised,
        sender:        sender,
        message:       message,
        is_schedule:   false,
        schedule_date: '',
      }),
    });

    const data = await response.json();
    console.log('[SMS] mNotify response:', JSON.stringify(data));

    if (data.status === 'success' || data.code === 1000) {
      res.json({ ok: true, sent: normalised.length, failed: 0 });
    } else {
      // Forward the real mNotify error message to the frontend
      const hint = data.code === 1004
        ? ' Check your API key in Settings → SMS.'
        : data.code === 1006
        ? ' Top up your mNotify balance.'
        : '';
      res.status(400).json({ error: (data.message ?? `mNotify error ${data.code}`) + hint, code: data.code });
    }
  } catch (err) {
    console.error('[SMS] mNotify request failed:', err.message);
    res.status(500).json({ error: 'Could not reach mNotify API: ' + err.message });
  }
});

// ── SMS: check credit balance ─────────────────────────────────────────────────
app.get('/api/sms/balance', async (req, res) => {
  const key = (req.query.key || MNOTIFY_API_KEY).trim();
  try {
    const url = `https://api.mnotify.com/api/balance?key=${encodeURIComponent(key)}`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- Start ----------
app.listen(PORT, () => {
  console.log(`[ChurchCare] WhatsApp server listening on http://localhost:${PORT}`);
  // Auto-connect if a saved session already exists
  if (existsSync(SESSION_DIR)) {
    console.log('[WA] Saved session found — reconnecting…');
    startConnection();
  }
});
