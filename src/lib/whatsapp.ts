import { API_BASE } from '@/lib/api';

function normalisePhone(raw: string): string {
  let n = raw.replace(/\D/g, '');
  if (n.startsWith('00')) n = n.slice(2);
  if (n.startsWith('0')) n = '233' + n.slice(1);
  if (n.length === 9) n = '233' + n;
  return n;
}

/** Opens WhatsApp to a specific contact with a pre-filled message (fallback). */
export function openWhatsAppTo(phone: string, message: string): void {
  const n = normalisePhone(phone);
  window.open(`https://wa.me/${n}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
}

/** Opens WhatsApp with a pre-filled message but NO specific recipient (fallback). */
export function openWhatsAppBroadcast(message: string): void {
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
}

/** Returns a wa.me URL for a specific contact. */
export function waLink(phone: string, message: string): string {
  const n = normalisePhone(phone);
  return `https://wa.me/${n}?text=${encodeURIComponent(message)}`;
}

/** Send a single message via the WhatsApp server. Returns true on success. */
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

/** Send bulk messages via the WhatsApp server. Returns true on success. */
export async function sendWhatsAppBulkViaServer(sessionId: string, numbers: string[], message: string): Promise<boolean> {
  try {
    const normalised = numbers.map(normalisePhone).filter(n => n.length >= 10);
    if (normalised.length === 0) return false;
    const res = await fetch(`${API_BASE}/api/whatsapp/send-bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, numbers: normalised, message }),
    });
    return res.ok;
  } catch {
    return false;
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
