import { useState } from 'react';
import { CheckCircle2, Unplug, Send, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  getWACredentials,
  saveWACredentials,
  clearWACredentials,
  sendWAMessage,
  type WACredentials,
} from '@/lib/whatsapp';

interface Props {
  userId?: string;
}

export function WhatsAppConnect({ userId = 'default' }: Props) {
  const [creds, setCreds] = useState<WACredentials | null>(() => getWACredentials(userId));
  const [form, setForm] = useState({ phoneNumberId: '', accessToken: '' });
  const [showToken, setShowToken] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleSave = () => {
    if (!form.phoneNumberId.trim() || !form.accessToken.trim()) return;
    const newCreds: WACredentials = {
      phoneNumberId: form.phoneNumberId.trim(),
      accessToken: form.accessToken.trim(),
    };
    saveWACredentials(userId, newCreds);
    setCreds(newCreds);
    setForm({ phoneNumberId: '', accessToken: '' });
  };

  const handleDisconnect = () => {
    clearWACredentials(userId);
    setCreds(null);
    setTestResult(null);
  };

  const handleTest = async () => {
    if (!creds || !testPhone.trim()) return;
    setTesting(true);
    setTestResult(null);
    const result = await sendWAMessage(creds, testPhone.trim(), '✅ Test message from ChurchCare — WhatsApp is connected!');
    setTesting(false);
    setTestResult(result.ok ? 'success' : (result.error ?? 'Send failed'));
  };

  if (creds) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-200 dark:border-green-800/40">
          <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-700 dark:text-green-400">WhatsApp Business Connected</p>
            <p className="text-xs text-muted-foreground font-mono">ID: {creds.phoneNumberId}</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Send a test message</Label>
          <div className="flex gap-2">
            <Input
              placeholder="+233 XX XXX XXXX"
              value={testPhone}
              onChange={e => { setTestPhone(e.target.value); setTestResult(null); }}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="sm"
              className="gap-2 shrink-0"
              onClick={handleTest}
              disabled={testing || !testPhone.trim()}
            >
              <Send className="w-3.5 h-3.5" />
              {testing ? 'Sending…' : 'Test'}
            </Button>
          </div>
          {testResult === 'success' && (
            <p className="text-xs text-green-600 dark:text-green-400">✓ Message sent successfully</p>
          )}
          {testResult && testResult !== 'success' && (
            <p className="text-xs text-destructive">{testResult}</p>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
          onClick={handleDisconnect}
        >
          <Unplug className="w-4 h-4" /> Disconnect
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-200 dark:border-blue-800/40 text-xs text-blue-700 dark:text-blue-400 space-y-1.5">
        <p className="font-semibold">One-time setup (free via Meta):</p>
        <ol className="list-decimal list-inside space-y-0.5 leading-relaxed">
          <li>Go to <strong>developers.facebook.com</strong> → My Apps → Create App → Business</li>
          <li>Add the <strong>WhatsApp</strong> product to your app</li>
          <li>Under WhatsApp → API Setup, copy your <strong>Phone Number ID</strong></li>
          <li>Generate a <strong>Permanent System User Token</strong> with <code className="bg-black/10 px-1 rounded">whatsapp_business_messaging</code> permission</li>
          <li>Paste both below and click Save</li>
        </ol>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Phone Number ID</Label>
          <Input
            placeholder="e.g. 123456789012345"
            value={form.phoneNumberId}
            onChange={e => setForm(f => ({ ...f, phoneNumberId: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Permanent Access Token</Label>
          <div className="relative">
            <Input
              type={showToken ? 'text' : 'password'}
              placeholder="EAAxxxxxxxxxxxxxx…"
              value={form.accessToken}
              onChange={e => setForm(f => ({ ...f, accessToken: e.target.value }))}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowToken(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={!form.phoneNumberId.trim() || !form.accessToken.trim()}
        className="gap-2 bg-green-600 hover:bg-green-700 text-white"
      >
        Save & Connect
      </Button>
    </div>
  );
}
