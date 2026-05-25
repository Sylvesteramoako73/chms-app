/**
 * ChurchCare WhatsApp + SMS Gateway Server
 *
 * Supports multiple independent WhatsApp sessions, one per user (sessionId = Supabase user ID).
 *
 * Endpoints:
 *   GET  /api/whatsapp/events?sessionId=   — SSE stream for one session
 *   GET  /api/whatsapp/status?sessionId=   — Status of one session
 *   POST /api/whatsapp/connect             — { sessionId } start / show QR
 *   POST /api/whatsapp/disconnect          — { sessionId } logout & clear
 *   POST /api/whatsapp/send               — { sessionId, number, message }
 *   POST /api/whatsapp/send-bulk          — { sessionId, numbers[], message }
 *   POST /api/sms/send-bulk               — { numbers[], message, senderId? }
 *   GET  /api/sms/balance                 — check mNotify balance
 */

import express from 'express';
import cors from 'cors';
import qrcode from 'qrcode';
import { existsSync, rmSync, readdirSync, mkdirSync } from 'fs';
import path from 'path';
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import pino from 'pino';

const SESSIONS_BASE = './sessions';
const PORT = process.env.PORT || 3001;
const DEFAULT_SESSION = 'default';

// ── mNotify SMS config ────────────────────────────────────────────────────────
const MNOTIFY_API_KEY = process.env.MNOTIFY_API_KEY || '';
const SMS_SENDER_ID   = process.env.SMS_SENDER_ID || 'ChurchCare';

function normaliseMsisdn(raw) {
  let n = raw.replace(/\D/g, '');
  if (n.startsWith('00')) n = n.slice(2);
  if (n.startsWith('0'))  n = '233' + n.slice(1);
  if (!n.startsWith('233')) n = '233' + n;
  return n;
}

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const logger = pino({ level: 'silent' });

// ── Per-session state ─────────────────────────────────────────────────────────
// Map<sessionId, { socket, status, qr, phone, sseClients: Set }>
const sessions = new Map();

function sessionDir(sessionId) {
  return path.join(SESSIONS_BASE, sessionId);
}

function getOrCreate(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      socket: null,
      status: 'disconnected',
      qr: null,
      phone: null,
      sseClients: new Set(),
    });
  }
  return sessions.get(sessionId);
}

function broadcast(sessionId, payload) {
  const s = sessions.get(sessionId);
  if (!s) return;
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  s.sseClients.forEach(res => res.write(data));
}

// ── SSE ───────────────────────────────────────────────────────────────────────
app.get('/api/whatsapp/events', (req, res) => {
  const sessionId = req.query.sessionId || DEFAULT_SESSION;
  const s = getOrCreate(sessionId);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Send current state immediately
  res.write(`data: ${JSON.stringify({ type: 'state', status: s.status, qr: s.qr, phone: s.phone })}\n\n`);

  s.sseClients.add(res);
  req.on('close', () => s.sseClients.delete(res));
});

// ── Status ────────────────────────────────────────────────────────────────────
app.get('/api/whatsapp/status', (req, res) => {
  const sessionId = req.query.sessionId || DEFAULT_SESSION;
  const s = getOrCreate(sessionId);
  res.json({ status: s.status, qr: s.qr, phone: s.phone });
});

// ── Connect ───────────────────────────────────────────────────────────────────
async function startConnection(sessionId) {
  const s = getOrCreate(sessionId);
  if (s.socket || s.status === 'connecting' || s.status === 'qr') return;

  s.status = 'connecting';
  broadcast(sessionId, { type: 'state', status: s.status, qr: null, phone: null });

  const dir = sessionDir(sessionId);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  try {
    const { state, saveCreds } = await useMultiFileAuthState(dir);
    const { version } = await fetchLatestBaileysVersion();

    s.socket = makeWASocket({
      version,
      auth: state,
      logger,
      browser: ['ChurchCare', 'Chrome', '3.0'],
      generateHighQualityLinkPreview: false,
    });

    s.socket.ev.on('creds.update', saveCreds);

    s.socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        s.qr = await qrcode.toDataURL(qr);
        s.status = 'qr';
        broadcast(sessionId, { type: 'state', status: s.status, qr: s.qr, phone: null });
        console.log(`[WA:${sessionId}] QR ready`);
      }

      if (connection === 'open') {
        s.qr = null;
        s.status = 'connected';
        s.phone = s.socket.user?.id?.split(':')[0] ?? 'Unknown';
        broadcast(sessionId, { type: 'state', status: s.status, qr: null, phone: s.phone });
        console.log(`[WA:${sessionId}] Connected as +${s.phone}`);
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const loggedOut = statusCode === DisconnectReason.loggedOut;

        s.socket = null;
        s.qr = null;
        s.phone = null;
        s.status = 'disconnected';
        broadcast(sessionId, { type: 'state', status: s.status, qr: null, phone: null });
        console.log(`[WA:${sessionId}] Disconnected (code: ${statusCode})`);

        if (loggedOut) {
          if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
          console.log(`[WA:${sessionId}] Logged out — session cleared.`);
        } else {
          console.log(`[WA:${sessionId}] Reconnecting in 5 s…`);
          setTimeout(() => startConnection(sessionId), 5000);
        }
      }
    });
  } catch (err) {
    s.socket = null;
    s.status = 'disconnected';
    broadcast(sessionId, { type: 'error', message: err.message });
    console.error(`[WA:${sessionId}] Error:`, err.message);
  }
}

app.post('/api/whatsapp/connect', async (req, res) => {
  const sessionId = req.body?.sessionId || DEFAULT_SESSION;
  startConnection(sessionId);
  res.json({ ok: true });
});

// ── Disconnect ────────────────────────────────────────────────────────────────
app.post('/api/whatsapp/disconnect', async (req, res) => {
  const sessionId = req.body?.sessionId || DEFAULT_SESSION;
  const s = sessions.get(sessionId);
  if (s?.socket) {
    try { await s.socket.logout(); } catch (_) { /* ignore */ }
    s.socket = null;
  }
  const dir = sessionDir(sessionId);
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  if (s) {
    s.qr = null;
    s.phone = null;
    s.status = 'disconnected';
    broadcast(sessionId, { type: 'state', status: 'disconnected', qr: null, phone: null });
  }
  res.json({ ok: true });
});

// ── Send single ───────────────────────────────────────────────────────────────
app.post('/api/whatsapp/send', async (req, res) => {
  const { sessionId = DEFAULT_SESSION, number, message } = req.body ?? {};
  const s = sessions.get(sessionId);

  if (!s?.socket || s.status !== 'connected') {
    return res.status(400).json({ error: 'WhatsApp not connected for this session' });
  }
  if (!number || !message) {
    return res.status(400).json({ error: 'number and message are required' });
  }

  try {
    const jid = number.replace(/\D/g, '') + '@s.whatsapp.net';
    await s.socket.sendMessage(jid, { text: message });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Send bulk ─────────────────────────────────────────────────────────────────
app.post('/api/whatsapp/send-bulk', async (req, res) => {
  const { sessionId = DEFAULT_SESSION, numbers, message } = req.body ?? {};
  const s = sessions.get(sessionId);

  if (!s?.socket || s.status !== 'connected') {
    return res.status(400).json({ error: 'WhatsApp not connected for this session' });
  }
  if (!Array.isArray(numbers) || numbers.length === 0 || !message) {
    return res.status(400).json({ error: 'numbers (array) and message are required' });
  }

  const results = [];
  for (const number of numbers) {
    try {
      const jid = number.replace(/\D/g, '') + '@s.whatsapp.net';
      await s.socket.sendMessage(jid, { text: message });
      results.push({ number, ok: true });
    } catch (err) {
      results.push({ number, ok: false, error: err.message });
    }
    await new Promise(r => setTimeout(r, 500));
  }

  const sent = results.filter(r => r.ok).length;
  res.json({ results, sent, failed: results.length - sent });
});

// ── SMS: send bulk ────────────────────────────────────────────────────────────
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
    const url = `https://api.mnotify.com/api/sms/quick?key=${encodeURIComponent(key)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient:     normalised,
        sender,
        message,
        is_schedule:   false,
        schedule_date: '',
      }),
    });

    const raw = await response.text();
    let data;
    try { data = JSON.parse(raw); } catch {
      return res.status(502).json({ error: 'mNotify returned an unexpected response.' });
    }

    if (data.status === 'success' || data.code === 1000) {
      res.json({ ok: true, sent: normalised.length, failed: 0 });
    } else {
      const hint = data.code === 1004 ? ' Check your API key in Settings → SMS.'
        : data.code === 1006 ? ' Top up your mNotify balance.' : '';
      res.status(400).json({ error: (data.message ?? `mNotify error ${data.code}`) + hint, code: data.code });
    }
  } catch (err) {
    res.status(500).json({ error: 'Could not reach mNotify API: ' + err.message });
  }
});

// ── SMS: balance ──────────────────────────────────────────────────────────────
app.get('/api/sms/balance', async (req, res) => {
  const key = (req.query.key || MNOTIFY_API_KEY).trim();
  try {
    const response = await fetch(`https://api.mnotify.com/api/balance/sms?key=${encodeURIComponent(key)}`);
    const raw = await response.text();
    let data;
    try { data = JSON.parse(raw); } catch {
      return res.status(502).json({ error: 'mNotify returned an unexpected response.' });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Start + auto-reconnect saved sessions ─────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[ChurchCare] WhatsApp server on http://localhost:${PORT}`);
  if (!existsSync(SESSIONS_BASE)) mkdirSync(SESSIONS_BASE, { recursive: true });

  // Reconnect any previously saved sessions
  try {
    const entries = readdirSync(SESSIONS_BASE, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        console.log(`[WA] Restoring session: ${entry.name}`);
        startConnection(entry.name);
      }
    }
  } catch (_) { /* no sessions dir yet */ }
});
