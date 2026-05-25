const GRAPH_API = 'https://graph.facebook.com/v22.0';

export interface WACredentials {
  phoneNumberId: string;
  accessToken: string;
}

function storageKey(userId: string) {
  return `chms_wa_creds_${userId}`;
}

export function getWACredentials(userId: string): WACredentials | null {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.phoneNumberId && parsed.accessToken) return parsed as WACredentials;
    return null;
  } catch {
    return null;
  }
}

export function saveWACredentials(userId: string, creds: WACredentials) {
  localStorage.setItem(storageKey(userId), JSON.stringify(creds));
}

export function clearWACredentials(userId: string) {
  localStorage.removeItem(storageKey(userId));
}

function normalisePhone(raw: string): string {
  let n = raw.replace(/\D/g, '');
  if (n.startsWith('00')) n = n.slice(2);
  if (n.startsWith('0')) n = '233' + n.slice(1);
  if (n.length === 9) n = '233' + n;
  return n;
}

export async function sendWAMessage(
  creds: WACredentials,
  to: string,
  message: string,
): Promise<{ ok: boolean; error?: string }> {
  const phone = normalisePhone(to);
  try {
    const res = await fetch(`${GRAPH_API}/${creds.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: message },
      }),
    });
    const data = await res.json() as { error?: { message?: string } };
    if (!res.ok) return { ok: false, error: data.error?.message ?? 'Send failed' };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

export async function sendWABulk(
  creds: WACredentials,
  numbers: string[],
  message: string,
): Promise<{ sent: number; failed: number }> {
  let sent = 0, failed = 0;
  for (const number of numbers) {
    const result = await sendWAMessage(creds, number, message);
    if (result.ok) sent++; else failed++;
    await new Promise(r => setTimeout(r, 300));
  }
  return { sent, failed };
}
