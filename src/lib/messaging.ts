export function normaliseMsisdn(raw: string): string {
  let n = raw.replace(/\D/g, '');
  if (n.startsWith('00')) n = n.slice(2);
  if (n.startsWith('0')) n = '233' + n.slice(1);
  if (!n.startsWith('233')) n = '233' + n;
  return n;
}

export async function sendSMS(
  phones: string[],
  text: string,
  onToast: (t: { title: string; description?: string; variant?: 'destructive' }) => void,
): Promise<boolean> {
  if (phones.length === 0) {
    onToast({ title: 'No phone numbers', description: 'None of the selected recipients have a phone number.', variant: 'destructive' });
    return false;
  }
  let smsSettings = { apiKey: '', senderId: 'ChurchCare' };
  try { smsSettings = { ...smsSettings, ...JSON.parse(localStorage.getItem('chms_sms_settings') ?? '{}') }; }
  catch { /* use defaults */ }

  if (!smsSettings.apiKey.trim()) {
    onToast({ title: 'SMS not configured', description: 'Go to Settings and enter your mNotify API key.', variant: 'destructive' });
    return false;
  }
  const normalised = phones.map(normaliseMsisdn).filter(n => n.length >= 11);
  if (normalised.length === 0) {
    onToast({ title: 'No valid phone numbers', description: 'Ensure phone numbers are valid Ghana numbers.', variant: 'destructive' });
    return false;
  }
  try {
    const url = `https://api.mnotify.com/api/sms/quick?key=${encodeURIComponent(smsSettings.apiKey.trim())}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: normalised,
        sender: (smsSettings.senderId || 'ChurchCare').slice(0, 11),
        message: text,
        is_schedule: false,
        schedule_date: '',
      }),
    });
    let data: Record<string, unknown> = {};
    const raw = await response.text();
    try { data = JSON.parse(raw); } catch { /* non-JSON response */ }
    console.log('[SMS] mNotify response', response.status, data, raw);
    if (data.status === 'success' || data.code === 1000) {
      onToast({ title: 'SMS sent!', description: `${normalised.length} message${normalised.length !== 1 ? 's' : ''} delivered.` });
      return true;
    }
    if (!response.ok && !data.message && !data.code) {
      throw new Error(`HTTP ${response.status} — ${raw.slice(0, 120)}`);
    }
    const code = data.code as number | undefined;
    const hint = code === 1004 ? ' Check your API key in Settings.' : code === 1006 ? ' Top up your mNotify balance.' : '';
    const msg = (data.message as string | undefined) ?? `mNotify error ${code ?? response.status}`;
    throw new Error(msg + hint);
  } catch (err) {
    const desc = err instanceof Error ? err.message : String(err);
    console.error('[SMS] failed:', desc);
    onToast({ title: 'SMS failed', description: desc || 'Unknown error', variant: 'destructive' });
    return false;
  }
}

