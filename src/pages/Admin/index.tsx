import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { format, formatDistanceToNowStrict } from 'date-fns';
import {
  ArrowLeft, Ban, CalendarPlus, CheckCircle2, Church, Loader2, PlayCircle, RefreshCw, Search, ShieldOff, XCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/utils';

interface AdminChurch {
  churchId: string;
  name: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  ownerPhone: string | null;
  userCount: number;
  memberCount: number;
  plan: string;
  trialEndsAt: string | null;
  planExpiresAt: string | null;
  billingMonths: number | null;
  status: 'active' | 'suspended';
  suspendedReason: string | null;
  suspendedAt: string | null;
  signedUpAt: string | null;
  totalPaidGHS: number;
  lastPaymentAt: string | null;
}

type Standing = 'paid' | 'trial' | 'expired' | 'suspended';

const PLAN_OPTIONS = [
  { value: 'starter', label: 'Starter' },
  { value: 'growth', label: 'Growth' },
  { value: 'pro', label: 'Pro' },
  { value: 'custom', label: 'Custom (unlimited)' },
];
const PERIOD_OPTIONS = [
  { value: 1, label: '1 month' },
  { value: 3, label: '3 months' },
  { value: 6, label: '6 months' },
  { value: 12, label: '1 year' },
  { value: 0, label: 'No expiry' },
];

function standingOf(c: AdminChurch): Standing {
  const now = Date.now();
  if (c.status === 'suspended') return 'suspended';
  if (c.plan !== 'free' && (!c.planExpiresAt || new Date(c.planExpiresAt).getTime() > now)) return 'paid';
  if (c.trialEndsAt && new Date(c.trialEndsAt).getTime() > now) return 'trial';
  return 'expired';
}

const STANDING_STYLE: Record<Standing, { label: string; cls: string }> = {
  paid: { label: 'Active, paid', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  trial: { label: 'On trial', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  expired: { label: 'Expired', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  suspended: { label: 'Suspended', cls: 'bg-red-50 text-red-700 border-red-200' },
};

const fmtDate = (d: string | null) => (d ? format(new Date(d), 'd MMM yyyy') : '');
const relative = (d: string) => {
  const t = new Date(d).getTime();
  const words = formatDistanceToNowStrict(t);
  return t > Date.now() ? `in ${words}` : `${words} ago`;
};
const planLabel = (p: string) => PLAN_OPTIONS.find(o => o.value === p)?.label ?? 'No plan';

async function callAdmin(method: 'GET' | 'POST', body?: object) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Please sign in first.');
  const res = await fetch('/api/admin', {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(json.error ?? 'Request failed.'), { status: res.status });
  return json;
}

type DialogKind = 'activate' | 'trial' | 'suspend' | null;

export default function AdminPage() {
  const { user } = useAuth();
  const [churches, setChurches] = useState<AdminChurch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Standing | 'all'>('all');
  const [selected, setSelected] = useState<AdminChurch | null>(null);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [plan, setPlan] = useState('starter');
  const [months, setMonths] = useState(3);
  const [days, setDays] = useState(14);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await callAdmin('GET');
      setChurches(data.churches ?? []);
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status === 403) setForbidden(true);
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (user) load(); else setLoading(false); }, [user, load]);

  const runAction = async (action: string, extra: object = {}, done?: string) => {
    if (!selected && !('churchId' in extra)) return;
    setBusy(true);
    setError(null);
    try {
      const churchId = (extra as { churchId?: string }).churchId ?? selected!.churchId;
      const data = await callAdmin('POST', { action, churchId, ...extra });
      if (data.church) {
        setChurches(list => list.map(c => (c.churchId === churchId ? data.church : c)));
      }
      setDialog(null);
      setSelected(null);
      setNotice(done ?? 'Saved.');
      setTimeout(() => setNotice(null), 4000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const open = (kind: DialogKind, c: AdminChurch) => {
    setSelected(c);
    setDialog(kind);
    setPlan(c.plan !== 'free' ? c.plan : 'starter');
    setMonths(3);
    setDays(14);
    setReason('');
  };

  const stats = useMemo(() => {
    const s = { total: churches.length, paid: 0, trial: 0, expired: 0, suspended: 0, revenue: 0, members: 0 };
    for (const c of churches) {
      s[standingOf(c)] += 1;
      s.revenue += c.totalPaidGHS;
      s.members += c.memberCount;
    }
    return s;
  }, [churches]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return churches
      .filter(c => filter === 'all' || standingOf(c) === filter)
      .filter(c => !q || [c.name, c.ownerName, c.ownerEmail, c.ownerPhone, c.churchId]
        .some(v => v?.toLowerCase().includes(q)))
      .sort((a, b) => (b.signedUpAt ?? '').localeCompare(a.signedUpAt ?? ''));
  }, [churches, query, filter]);

  if (!user) {
    return (
      <Centered icon={<ShieldOff className="w-7 h-7 text-red-500" />} title="Please sign in">
        Sign in with your platform admin account to open this page.
      </Centered>
    );
  }

  if (forbidden) {
    return (
      <Centered icon={<ShieldOff className="w-7 h-7 text-red-500" />} title="Admin access only">
        The account {user.email} is not on the platform admin list.
        <div className="mt-4"><Link to="/" className="text-blue-600 underline">Back to the app</Link></div>
      </Centered>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center gap-3">
          <Link to="/" className="text-slate-500 hover:text-slate-900"><ArrowLeft className="w-5 h-5" /></Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-[#0B1F4B]">ChurchCare Admin</h1>
            <p className="text-xs text-slate-500">Every church on the platform, with plan and access controls</p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} /> Refresh
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Stat label="Churches" value={stats.total} />
          <Stat label="Active, paid" value={stats.paid} tone="text-emerald-700" onClick={() => setFilter('paid')} />
          <Stat label="On trial" value={stats.trial} tone="text-blue-700" onClick={() => setFilter('trial')} />
          <Stat label="Expired" value={stats.expired} tone="text-amber-700" onClick={() => setFilter('expired')} />
          <Stat label="Suspended" value={stats.suspended} tone="text-red-700" onClick={() => setFilter('suspended')} />
          <Stat label="Revenue (GHS)" value={stats.revenue.toLocaleString()} />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9 bg-white" placeholder="Search by church, owner, email or phone"
              value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          <div className="flex gap-1 bg-white border border-slate-200 rounded-md p-1 overflow-x-auto">
            {(['all', 'paid', 'trial', 'expired', 'suspended'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={cn('px-3 py-1 text-sm rounded whitespace-nowrap',
                  filter === f ? 'bg-[#0B1F4B] text-white' : 'text-slate-600 hover:bg-slate-100')}>
                {f === 'all' ? 'All' : STANDING_STYLE[f].label}
              </button>
            ))}
          </div>
        </div>

        {notice && (
          <div className="flex items-center gap-2 text-sm bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md px-3 py-2">
            <CheckCircle2 className="w-4 h-4" /> {notice}
          </div>
        )}
        {error && (
          <div className="text-sm bg-red-50 border border-red-200 text-red-700 rounded-md px-3 py-2">{error}</div>
        )}

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : visible.length === 0 ? (
          <Card><CardContent className="py-16 text-center text-sm text-slate-500">No churches match.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {visible.map(c => {
              const st = standingOf(c);
              return (
                <Card key={c.churchId} className="bg-white">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Church className="w-4 h-4 text-[#1D4ED8] shrink-0" />
                          <span className="font-semibold truncate">{c.name ?? c.ownerName ?? 'Unnamed church'}</span>
                          <span className={cn('text-xs border rounded-full px-2 py-0.5', STANDING_STYLE[st].cls)}>
                            {STANDING_STYLE[st].label}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 break-words">
                          {[c.ownerName, c.ownerEmail, c.ownerPhone].filter(Boolean).join(' · ') || 'No users yet'}
                        </p>
                        <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1 pt-1">
                          <span>{c.memberCount} members</span>
                          <span>{c.userCount} staff accounts</span>
                          {c.signedUpAt && <span>Joined {fmtDate(c.signedUpAt)}</span>}
                          <span>
                            Plan: {planLabel(c.plan)}
                            {c.plan !== 'free' && (c.planExpiresAt ? `, ${new Date(c.planExpiresAt) > new Date() ? 'renews' : 'ended'} ${fmtDate(c.planExpiresAt)}` : ', no expiry')}
                          </span>
                          {c.trialEndsAt && <span>Trial {new Date(c.trialEndsAt) > new Date() ? 'ends' : 'ended'} {relative(c.trialEndsAt)}</span>}
                          {c.totalPaidGHS > 0 && <span>Paid GHS {c.totalPaidGHS.toLocaleString()}</span>}
                        </div>
                        {st === 'suspended' && c.suspendedReason && (
                          <p className="text-xs text-red-600 pt-1">Reason: {c.suspendedReason}</p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 lg:justify-end lg:max-w-sm">
                        {st === 'suspended' ? (
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={busy}
                            onClick={() => runAction('unsuspend', { churchId: c.churchId }, 'Church reactivated.')}>
                            <PlayCircle className="w-4 h-4" /> Reactivate
                          </Button>
                        ) : (
                          <>
                            <Button size="sm" className="bg-[#0B1F4B] hover:bg-[#13306e] text-white" onClick={() => open('activate', c)}>
                              <CheckCircle2 className="w-4 h-4" /> Activate plan
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => open('trial', c)}>
                              <CalendarPlus className="w-4 h-4" /> Extend trial
                            </Button>
                            {st === 'paid' && (
                              <Button size="sm" variant="outline" disabled={busy}
                                onClick={() => {
                                  if (confirm(`Remove the paid plan from ${c.name ?? c.ownerEmail ?? 'this church'}?`)) {
                                    runAction('deactivate_plan', { churchId: c.churchId }, 'Plan removed.');
                                  }
                                }}>
                                <XCircle className="w-4 h-4" /> Remove plan
                              </Button>
                            )}
                            <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => open('suspend', c)}>
                              <Ban className="w-4 h-4" /> Suspend
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <Dialog open={dialog !== null} onOpenChange={o => { if (!o) { setDialog(null); setSelected(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialog === 'activate' && 'Activate a plan'}
              {dialog === 'trial' && 'Extend the free trial'}
              {dialog === 'suspend' && 'Suspend this church'}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">{selected?.name ?? selected?.ownerEmail ?? 'This church'}</p>

          {dialog === 'activate' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Plan</Label>
                <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={plan} onChange={e => setPlan(e.target.value)}>
                  {PLAN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Period, starting today</Label>
                <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={months} onChange={e => setMonths(Number(e.target.value))}>
                  {PERIOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <p className="text-xs text-slate-500">Use this for cash, mobile money or bank payments made outside Paystack, or for complimentary accounts.</p>
            </div>
          )}

          {dialog === 'trial' && (
            <div className="space-y-1.5">
              <Label>Add days</Label>
              <Input type="number" min={1} max={365} value={days} onChange={e => setDays(Number(e.target.value))} />
              <p className="text-xs text-slate-500">Added on top of any trial time still left.</p>
            </div>
          )}

          {dialog === 'suspend' && (
            <div className="space-y-1.5">
              <Label>Reason shown to the church (optional)</Label>
              <Textarea rows={3} value={reason} onChange={e => setReason(e.target.value)}
                placeholder="For example: payment overdue, or account under review" />
              <p className="text-xs text-slate-500">Their staff will be blocked from the app until you reactivate. No data is deleted.</p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialog(null)} disabled={busy}>Cancel</Button>
            {dialog === 'activate' && (
              <Button className="bg-[#0B1F4B] hover:bg-[#13306e] text-white" disabled={busy}
                onClick={() => runAction('activate', { plan, months }, 'Plan activated.')}>
                {busy && <Loader2 className="w-4 h-4 animate-spin" />} Activate
              </Button>
            )}
            {dialog === 'trial' && (
              <Button className="bg-[#0B1F4B] hover:bg-[#13306e] text-white" disabled={busy || days < 1}
                onClick={() => runAction('extend_trial', { days }, `Trial extended by ${days} days.`)}>
                {busy && <Loader2 className="w-4 h-4 animate-spin" />} Extend
              </Button>
            )}
            {dialog === 'suspend' && (
              <Button variant="destructive" disabled={busy}
                onClick={() => runAction('suspend', { reason }, 'Church suspended.')}>
                {busy && <Loader2 className="w-4 h-4 animate-spin" />} Suspend
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value, tone, onClick }: { label: string; value: number | string; tone?: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} disabled={!onClick}
      className="text-left bg-white border border-slate-200 rounded-lg p-4 enabled:hover:border-blue-300 transition-colors">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={cn('text-2xl font-semibold mt-1', tone ?? 'text-[#0B1F4B]')}>{value}</div>
    </button>
  );
}

function Centered({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="text-center space-y-3 max-w-sm">
        <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">{icon}</div>
        <h2 className="text-xl font-semibold">{title}</h2>
        <div className="text-sm text-slate-600">{children}</div>
      </div>
    </div>
  );
}
