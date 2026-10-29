import { useState, type FormEvent, type ReactNode } from 'react';
import { Loader2, Lock, Mail, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const RESET_REDIRECT = `${window.location.origin}/?reset=1`;

function Shell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-lg bg-[#0B1F4B] flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div className="leading-tight">
            <div className="font-semibold text-[#0B1F4B]">ChurchCare</div>
            <div className="text-[11px] uppercase tracking-wider text-[#1D4ED8]">Platform admin</div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 sm:p-7">
          <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500 mt-1 mb-6">{subtitle}</p>
          {children}
        </div>
        <p className="text-center text-xs text-slate-400 mt-6">
          Restricted area. Churches sign in at{' '}
          <a href="https://app.churchcare.online" className="text-[#1D4ED8] hover:underline">app.churchcare.online</a>
        </p>
      </div>
    </div>
  );
}

function Message({ tone, children }: { tone: 'error' | 'ok'; children: ReactNode }) {
  return (
    <div className={tone === 'error'
      ? 'text-sm bg-red-50 border border-red-200 text-red-700 rounded-md px-3 py-2'
      : 'text-sm bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md px-3 py-2'}>
      {children}
    </div>
  );
}

const navyButton = 'w-full bg-[#0B1F4B] hover:bg-[#13306e] text-white';

/** Sign in screen for admin.churchcare.online */
export function AdminLogin() {
  const { signIn } = useAuth();
  const [mode, setMode] = useState<'signin' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    if (mode === 'signin') {
      const { error: err } = await signIn(email, password);
      if (err) setError(err === 'Invalid login credentials' ? 'Incorrect email or password.' : err);
    } else {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: RESET_REDIRECT });
      if (err) setError(err.message);
      else setSent(true);
    }
    setBusy(false);
  };

  if (mode === 'forgot') {
    return (
      <Shell title="Reset your password" subtitle="We will email you a link to set a new password.">
        {sent ? (
          <div className="space-y-4">
            <Message tone="ok">If {email.trim()} has a ChurchCare account, a reset link is on its way. Check your inbox and spam folder.</Message>
            <Button variant="outline" className="w-full" onClick={() => { setMode('signin'); setSent(false); }}>Back to sign in</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="admin-email">Email</Label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input id="admin-email" type="email" required autoComplete="email" className="pl-9"
                  value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            </div>
            {error && <Message tone="error">{error}</Message>}
            <Button type="submit" className={navyButton} disabled={busy}>
              {busy && <Loader2 className="w-4 h-4 animate-spin" />} Send reset link
            </Button>
            <button type="button" className="w-full text-sm text-slate-500 hover:text-slate-800"
              onClick={() => { setMode('signin'); setError(null); }}>
              Back to sign in
            </button>
          </form>
        )}
      </Shell>
    );
  }

  return (
    <Shell title="Sign in" subtitle="Manage every church on ChurchCare.">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="admin-email">Email</Label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input id="admin-email" type="email" required autoComplete="email" className="pl-9"
              value={email} onChange={e => setEmail(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="admin-password">Password</Label>
            <button type="button" className="text-xs text-[#1D4ED8] hover:underline"
              onClick={() => { setMode('forgot'); setError(null); }}>
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input id="admin-password" type="password" required autoComplete="current-password" className="pl-9"
              value={password} onChange={e => setPassword(e.target.value)} />
          </div>
        </div>
        {error && <Message tone="error">{error}</Message>}
        <Button type="submit" className={navyButton} disabled={busy}>
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} Sign in
        </Button>
      </form>
    </Shell>
  );
}

/** Shown after following a password reset link */
export function AdminSetPassword({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return setError('Use at least 8 characters.');
    if (password !== confirm) return setError('The two passwords do not match.');
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) return setError(err.message);
    window.history.replaceState(null, '', '/');
    onDone();
  };

  return (
    <Shell title="Set a new password" subtitle="Choose the password you will use to sign in.">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="new-password">New password</Label>
          <Input id="new-password" type="password" autoComplete="new-password" required
            value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm-password">Confirm password</Label>
          <Input id="confirm-password" type="password" autoComplete="new-password" required
            value={confirm} onChange={e => setConfirm(e.target.value)} />
        </div>
        {error && <Message tone="error">{error}</Message>}
        <Button type="submit" className={navyButton} disabled={busy}>
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} Save password
        </Button>
      </form>
    </Shell>
  );
}
