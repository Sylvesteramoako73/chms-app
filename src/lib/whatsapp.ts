import { API_BASE } from '@/lib/api';

function normalisePhone(raw: string): string {
  let n = raw.replace(/\D/g, '');
  if (n.startsWith('00')) n = n.slice(2);
  if (n.startsWith('0')) n = '233' + n.slice(1);
  if (n.length === 9) n = '233' + n;
  return n;
}

export function openWhatsAppTo(phone: string, message: string): void {
  const n = normalisePhone(phone);
  window.open(`https://wa.me/${n}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
}

export function openWhatsAppBroadcast(message: string): void {
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
}

export function waLink(phone: string, message: string): string {
  const n = normalisePhone(phone);
  return `https://wa.me/${n}?text=${encodeURIComponent(message)}`;
}

/** Send a single WhatsApp message via the server. Returns true on success. */
export async function sendWhatsAppViaServer(sessionId: string, phone: string, message: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/whatsapp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, number: normalisePhone(phone), message }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Send bulk WhatsApp messages via the server. Returns null on success, error string on failure. */
export async function sendWhatsAppBulkViaServer(sessionId: string, numbers: string[], message: string): Promise<string | null> {
  try {
    const normalised = numbers.map(normalisePhone).filter(n => n.length >= 10);
    if (normalised.length === 0) return 'No valid phone numbers to send to.';
    const res = await fetch(`${API_BASE}/api/whatsapp/send-bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, numbers: normalised, message }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      const errMsg = body.error ?? `Server error ${res.status}`;
      console.warn('[WA] send-bulk failed:', res.status, body);
      return errMsg;
    }
    return null;
  } catch (e) {
    console.warn('[WA] send-bulk error:', e);
    return 'Could not reach WhatsApp server.';
  }
}

/** Check WhatsApp server connection status for a session. */
export async function getWhatsAppServerStatus(sessionId: string): Promise<'connected' | 'disconnected' | 'offline'> {
  try {
    const res = await fetch(`${API_BASE}/api/whatsapp/status?sessionId=${encodeURIComponent(sessionId)}`);
    if (!res.ok) return 'offline';
    const data = await res.json() as { status: string };
    return data.status === 'connected' ? 'connected' : 'disconnected';
  } catch {
    return 'offline';
  }
}
