import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import type { UserRole } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, EyeOff, Loader2, AlertCircle, Church } from 'lucide-react';

type Tab = 'login' | 'register';

const ROLES: { value: UserRole; label: string; desc: string }[] = [
  { value: 'Administrator', label: 'Administrator', desc: 'Full system access' },
  { value: 'Pastor', label: 'Pastor', desc: 'Members, reports, communication' },
  { value: 'Department Head', label: 'Department Head', desc: 'Events, members (own dept)' },
  { value: 'Data Entry', label: 'Data Entry', desc: 'Attendance & giving only' },
];

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [tab, setTab] = useState<Tab>('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');

  // Register form
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('Data Entry');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPass) { setError('Please fill in all fields.'); return; }
    setError('');
    setLoading(true);
    const { error: err } = await signIn(loginEmail.trim(), loginPass);
    setLoading(false);
    if (err) setError(err);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regEmail || !regPass || !regConfirm) { setError('Please fill in all fields.'); return; }
    if (regPass !== regConfirm) { setError('Passwords do not match.'); return; }
    if (regPass.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setError('');
    setLoading(true);
    const { error: err } = await signUp(regName, regEmail.trim(), regPass, regRole);
    setLoading(false);
    if (err) setError(err);
  };

  return (
    <div className="min-h-screen bg-navy-900 flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-[42%] p-12 bg-navy-950 border-r border-navy-800 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 30% 40%, #C9A84C 0%, transparent 60%), radial-gradient(circle at 70% 80%, #4A7C6F 0%, transparent 50%)' }} />
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gold-500 rounded-md flex items-center justify-center">
              <Church className="w-5 h-5 text-navy-900" />
            </div>
            <span className="text-2xl font-display font-bold text-white tracking-tight">ChurchCare</span>
          </div>
          <p className="text-[11px] text-navy-400 uppercase tracking-widest font-semibold">MANAGE. SERVE. GROW. TOGETHER.</p>
        </div>

        <div className="relative space-y-8">
          <blockquote className="text-navy-200 text-lg font-display leading-relaxed">
            "For where two or three gather in my name, there am I with them."
          </blockquote>
          <p className="text-xs text-navy-500">— Matthew 18:20</p>

          <div className="space-y-4">
            {[
              { icon: '🛡️', text: 'Role-based access control' },
              { icon: '📊', text: 'Graphical PDF reports' },
              { icon: '💬', text: 'WhatsApp integration' },
              { icon: '👥', text: 'Full member management' },
            ].map(f => (
              <div key={f.text} className="flex items-center gap-3">
                <span className="text-base">{f.icon}</span>
                <span className="text-sm text-navy-300">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-navy-600">© {new Date().getFullYear()} ChurchCare. All rights reserved.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 bg-gold-500 rounded-md flex items-center justify-center">
              <Church className="w-4 h-4 text-navy-900" />
            </div>
            <span className="text-xl font-display font-bold text-white">ChurchCare</span>
          </div>

          {/* Tab switcher */}
          <div className="flex rounded-xl bg-navy-800/60 p-1 mb-6 border border-navy-700">
            {(['login', 'register'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(''); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 capitalize ${
                  tab === t
                    ? 'bg-gold-500 text-navy-900 shadow-sm'
                    : 'text-navy-300 hover:text-white'
                }`}
              >
                {t === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {tab === 'login' ? (
              <motion.form
                key="login"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.18 }}
                onSubmit={handleLogin}
                className="space-y-4"
              >
                <div>
                  <h2 className="text-2xl font-display font-bold text-white mb-1">Welcome back</h2>
                  <p className="text-sm text-navy-400">Sign in to your ChurchCare account</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-navy-300 text-sm">Email Address</Label>
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="you@church.org"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    className="bg-navy-800 border-navy-700 text-white placeholder:text-navy-500 focus:border-gold-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-navy-300 text-sm">Password</Label>
                  <div className="relative">
                    <Input
                      type={showPass ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={loginPass}
                      onChange={e => setLoginPass(e.target.value)}
                      className="bg-navy-800 border-navy-700 text-white placeholder:text-navy-500 focus:border-gold-500 pr-10"
                    />
                    <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-navy-200">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gold-500 hover:bg-gold-400 text-navy-900 font-bold h-11"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {loading ? 'Signing in…' : 'Sign In'}
                </Button>

                <p className="text-center text-sm text-navy-400">
                  Don't have an account?{' '}
                  <button type="button" onClick={() => { setTab('register'); setError(''); }} className="text-gold-400 hover:text-gold-300 font-medium">
                    Create one
                  </button>
                </p>
              </motion.form>
            ) : (
              <motion.form
                key="register"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.18 }}
                onSubmit={handleRegister}
                className="space-y-4"
              >
                <div>
                  <h2 className="text-2xl font-display font-bold text-white mb-1">Create account</h2>
                  <p className="text-sm text-navy-400">Join your church management system</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-navy-300 text-sm">Full Name</Label>
                  <Input
                    placeholder="John Smith"
                    value={regName}
                    onChange={e => setRegName(e.target.value)}
                    className="bg-navy-800 border-navy-700 text-white placeholder:text-navy-500 focus:border-gold-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-navy-300 text-sm">Email Address</Label>
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="you@church.org"
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                    className="bg-navy-800 border-navy-700 text-white placeholder:text-navy-500 focus:border-gold-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-navy-300 text-sm">Your Role</Label>
                  <Select value={regRole} onValueChange={v => setRegRole(v as UserRole)}>
                    <SelectTrigger className="bg-navy-800 border-navy-700 text-white focus:border-gold-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-navy-800 border-navy-700">
                      {ROLES.map(r => (
                        <SelectItem key={r.value} value={r.value} className="text-white focus:bg-navy-700">
                          <div>
                            <span className="font-medium">{r.label}</span>
                            <span className="text-xs text-navy-400 ml-2">{r.desc}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-navy-500">
                    The first account created automatically becomes Administrator.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-navy-300 text-sm">Password</Label>
                  <div className="relative">
                    <Input
                      type={showPass ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Min. 6 characters"
                      value={regPass}
                      onChange={e => setRegPass(e.target.value)}
                      className="bg-navy-800 border-navy-700 text-white placeholder:text-navy-500 focus:border-gold-500 pr-10"
                    />
                    <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-navy-200">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-navy-300 text-sm">Confirm Password</Label>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    placeholder="Repeat password"
                    value={regConfirm}
                    onChange={e => setRegConfirm(e.target.value)}
                    className="bg-navy-800 border-navy-700 text-white placeholder:text-navy-500 focus:border-gold-500"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gold-500 hover:bg-gold-400 text-navy-900 font-bold h-11"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {loading ? 'Creating account…' : 'Create Account'}
                </Button>

                <p className="text-center text-sm text-navy-400">
                  Already have an account?{' '}
                  <button type="button" onClick={() => { setTab('login'); setError(''); }} className="text-gold-400 hover:text-gold-300 font-medium">
                    Sign in
                  </button>
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
