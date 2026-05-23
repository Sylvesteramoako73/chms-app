import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { useWorkers } from '@/hooks/useWorkers';
import { useRole } from '@/context/RoleContext';
import type { Worker, WorkerSchedule, EmploymentType } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Plus, Search, UserCheck, Users, CalendarCheck, Briefcase,
  Pencil, Trash2, X, LayoutGrid, List, Clock, CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/utils';

const WORKER_STATUSES = ['Active', 'Inactive', 'Suspended', 'On Leave'] as const;
const EMPLOYMENT_TYPES: EmploymentType[] = ['Full-time', 'Part-time', 'Contract'];
const SERVICE_TYPES = ['Sunday First Service', 'Sunday Second Service', 'Midweek', 'Prayer Meeting', 'Special Program'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const STATUS_STYLES: Record<string, string> = {
  Active: 'bg-sage-500/10 text-sage-700 dark:text-sage-400 border-sage-200 dark:border-sage-800/50',
  Inactive: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-200',
  Suspended: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200',
  'On Leave': 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200',
};

const EMP_STYLES: Record<EmploymentType, string> = {
  'Full-time': 'bg-gold-500/10 text-gold-700 dark:text-gold-400 border-gold-200',
  'Part-time': 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200',
  'Contract': 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200',
};

const EMPTY_WORKER: Omit<Worker, 'id' | 'createdAt'> = {
  firstName: '', lastName: '', phone: '', email: '',
  jobTitle: '', employmentType: 'Full-time',
  status: 'Active', startDate: format(new Date(), 'yyyy-MM-dd'), notes: '',
};

export default function Workers() {
  const { workers, workerAttendance, workerSchedules, loading, addWorker, updateWorker, deleteWorker, logWorkerAttendance, addWorkerSchedule, updateWorkerSchedule, deleteWorkerSchedule } = useWorkers();
  const { actions } = useRole();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [empFilter, setEmpFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [workerDialog, setWorkerDialog] = useState(false);
  const [editing, setEditing] = useState<Worker | null>(null);
  const [form, setForm] = useState({ ...EMPTY_WORKER });
  const [scheduleDialog, setScheduleDialog] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ workerId: '', date: '', startTime: '08:00', endTime: '12:00', duty: '', notes: '' });
  const [editingSchedule, setEditingSchedule] = useState<WorkerSchedule | null>(null);
  const [attDate, setAttDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [attService, setAttService] = useState(SERVICE_TYPES[0]);
  const [presentIds, setPresentIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return workers.filter(w => {
      if (empFilter !== 'all' && w.employmentType !== empFilter) return false;
      if (statusFilter !== 'all' && w.status !== statusFilter) return false;
      return `${w.firstName} ${w.lastName}`.toLowerCase().includes(q) ||
        w.phone.includes(q) || w.jobTitle.toLowerCase().includes(q);
    });
  }, [workers, search, empFilter, statusFilter]);

  const activeCount = workers.filter(w => w.status === 'Active').length;
  const fullTimeCount = workers.filter(w => w.employmentType === 'Full-time').length;

  const roleGroups = useMemo(() => {
    const map = new Map<string, Worker[]>();
    for (const w of workers) {
      const key = w.jobTitle || 'Unspecified';
      map.set(key, [...(map.get(key) ?? []), w]);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [workers]);

  const openAdd = () => { setEditing(null); setForm({ ...EMPTY_WORKER }); setWorkerDialog(true); };
  const openEdit = (w: Worker) => {
    setEditing(w);
    setForm({ firstName: w.firstName, lastName: w.lastName, phone: w.phone, email: w.email ?? '', jobTitle: w.jobTitle, employmentType: w.employmentType, status: w.status, startDate: w.startDate, notes: w.notes ?? '' });
    setWorkerDialog(true);
  };

  const handleSave = () => {
    if (!form.firstName.trim()) { toast({ title: 'First name is required', variant: 'destructive' }); return; }
    if (!form.phone.trim()) { toast({ title: 'Phone number is required', variant: 'destructive' }); return; }
    if (!form.jobTitle.trim()) { toast({ title: 'Job title is required', variant: 'destructive' }); return; }
    if (editing) {
      updateWorker({ ...editing, ...form });
      toast({ title: 'Staff record updated' });
    } else {
      addWorker({ id: `wk${Date.now()}`, ...form, createdAt: new Date().toISOString() });
      toast({ title: 'Staff member added', description: `${form.firstName} ${form.lastName} has been registered.` });
    }
    setWorkerDialog(false);
  };

  const handleDelete = (w: Worker) => {
    deleteWorker(w.id);
    toast({ title: 'Staff member removed', description: `${w.firstName} ${w.lastName} has been removed.` });
  };

  const handleSaveSchedule = () => {
    if (!scheduleForm.workerId || !scheduleForm.date || !scheduleForm.duty.trim()) {
      toast({ title: 'Please fill all required fields', variant: 'destructive' }); return;
    }
    if (editingSchedule) {
      updateWorkerSchedule({ ...editingSchedule, ...scheduleForm });
      toast({ title: 'Schedule updated' });
    } else {
      addWorkerSchedule({ id: `ws${Date.now()}`, ...scheduleForm, status: 'Scheduled' });
      toast({ title: 'Duty scheduled' });
    }
    setScheduleDialog(false);
    setEditingSchedule(null);
  };

  const handleLogAttendance = () => {
    const records = workers.map(w => ({
      id: `wa${Date.now()}_${w.id}`,
      workerId: w.id, date: attDate, serviceType: attService,
      present: presentIds.has(w.id),
    }));
    logWorkerAttendance(records);
    toast({ title: 'Attendance logged', description: `${presentIds.size} staff marked present.` });
    setPresentIds(new Set());
  };

  const openScheduleAdd = () => {
    setEditingSchedule(null);
    setScheduleForm({ workerId: '', date: '', startTime: '08:00', endTime: '12:00', duty: '', notes: '' });
    setScheduleDialog(true);
  };

  const openScheduleEdit = (s: WorkerSchedule) => {
    setEditingSchedule(s);
    setScheduleForm({ workerId: s.workerId, date: s.date, startTime: s.startTime, endTime: s.endTime, duty: s.duty, notes: s.notes ?? '' });
    setScheduleDialog(true);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-2 border-gold-500 border-t-transparent animate-spin" />
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold text-navy-900 dark:text-cream mb-1">Church Staff</h1>
          <p className="text-sm text-muted-foreground">Manage paid staff, duties, and attendance</p>
        </div>
        {actions.canManageWorkers && (
          <Button size="sm" onClick={openAdd} className="gap-2 bg-white hover:bg-gray-50 text-navy-900 font-medium shrink-0">
            <Plus className="w-4 h-4" /> Add Staff
          </Button>
        )}
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Staff', value: workers.length, icon: Users, color: 'text-navy-500 dark:text-navy-300' },
          { label: 'Active', value: activeCount, icon: UserCheck, color: 'text-sage-500' },
          { label: 'Full-time', value: fullTimeCount, icon: Briefcase, color: 'text-gold-500' },
          { label: 'On Duty Today', value: workerSchedules.filter(s => s.date === format(new Date(), 'yyyy-MM-dd')).length, icon: CalendarCheck, color: 'text-blue-500' },
        ].map(stat => (
          <Card key={stat.label} className="glass border-none shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center">
                <stat.icon className={cn('w-5 h-5', stat.color)} />
              </div>
              <div>
                <p className="text-xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="staff">
        <TabsList className="glass border-none">
          <TabsTrigger value="staff">All Staff</TabsTrigger>
          <TabsTrigger value="roles">By Role</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
        </TabsList>

        {/* ── All Staff Tab ── */}
        <TabsContent value="staff" className="space-y-4 mt-4">
          <Card className="glass border-none shadow-sm">
            <CardContent className="p-3 flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or job title…" className="pl-8 h-8 text-sm" />
              </div>
              <Select value={empFilter} onValueChange={setEmpFilter}>
                <SelectTrigger className="h-8 text-sm w-[150px]"><SelectValue placeholder="Employment" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {EMPLOYMENT_TYPES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 text-sm w-[120px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {WORKER_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="flex gap-1 ml-auto">
                <Button variant={view === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setView('grid')}><LayoutGrid className="w-3.5 h-3.5" /></Button>
                <Button variant={view === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setView('list')}><List className="w-3.5 h-3.5" /></Button>
              </div>
            </CardContent>
          </Card>

          {filtered.length === 0 ? (
            <div className="glass rounded-xl border border-dashed border-border p-16 text-center">
              <UserCheck className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-muted-foreground text-sm">{search ? 'No staff match your search.' : 'No staff registered yet.'}</p>
              {actions.canManageWorkers && <Button size="sm" variant="outline" onClick={openAdd} className="mt-4 gap-1"><Plus className="w-3.5 h-3.5" /> Add First Staff Member</Button>}
            </div>
          ) : view === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(w => (
                <Card key={w.id} className="glass border-none shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-navy-700 flex items-center justify-center text-white font-bold text-sm shrink-0 border border-navy-600">
                        {`${w.firstName[0] ?? ''}${w.lastName[0] ?? ''}`.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{w.firstName} {w.lastName}</p>
                        <p className="text-xs text-gold-600 dark:text-gold-400 font-medium truncate">{w.jobTitle || '—'}</p>
                      </div>
                      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0', STATUS_STYLES[w.status])}>
                        {w.status}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border', EMP_STYLES[w.employmentType])}>
                        {w.employmentType}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto">{w.phone}</span>
                    </div>
                    {actions.canManageWorkers && (
                      <div className="mt-2 pt-2 border-t border-border/50 flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(w)}><Pencil className="w-3 h-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(w)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="glass border-none shadow-sm">
              <div className="divide-y divide-border/50">
                {filtered.map(w => (
                  <div key={w.id} className="flex items-center gap-4 px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-navy-700 flex items-center justify-center text-white font-bold text-xs shrink-0">
                      {`${w.firstName[0] ?? ''}${w.lastName[0] ?? ''}`.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{w.firstName} {w.lastName}</p>
                      <p className="text-xs text-muted-foreground">{w.jobTitle || '—'} · {w.employmentType}</p>
                    </div>
                    <span className={cn('hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border', STATUS_STYLES[w.status])}>
                      {w.status}
                    </span>
                    <span className="text-xs text-muted-foreground hidden md:block">{w.phone}</span>
                    {actions.canManageWorkers && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(w)}><Pencil className="w-3 h-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(w)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>

        {/* ── By Role Tab ── */}
        <TabsContent value="roles" className="space-y-4 mt-4">
          {roleGroups.length === 0 ? (
            <div className="glass rounded-xl border border-dashed border-border p-16 text-center text-muted-foreground text-sm">No staff registered yet.</div>
          ) : (
            <div className="grid gap-4">
              {roleGroups.map(([role, group]) => (
                <Card key={role} className="glass border-none shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gold-500/10 flex items-center justify-center">
                          <Briefcase className="w-4 h-4 text-gold-600 dark:text-gold-400" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-semibold">{role}</CardTitle>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {group.length} staff · {group.filter(w => w.status === 'Active').length} active
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {EMPLOYMENT_TYPES.map(et => {
                          const count = group.filter(w => w.employmentType === et).length;
                          if (!count) return null;
                          return (
                            <span key={et} className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', EMP_STYLES[et])}>
                              {count} {et}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {group.map(w => (
                        <div key={w.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                          <div className="w-7 h-7 rounded-full bg-navy-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {`${w.firstName[0] ?? ''}${w.lastName[0] ?? ''}`.toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium truncate">{w.firstName} {w.lastName}</p>
                            <p className="text-[10px] text-muted-foreground">{w.phone}</p>
                          </div>
                          <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full border', STATUS_STYLES[w.status])}>{w.status}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Attendance Tab ── */}
        <TabsContent value="attendance" className="space-y-4 mt-4">
          <Card className="glass border-none shadow-sm">
            <CardContent className="p-4 flex flex-wrap gap-3 items-end">
              <div className="space-y-1">
                <Label className="text-xs">Date</Label>
                <Input type="date" value={attDate} onChange={e => setAttDate(e.target.value)} className="h-8 text-sm w-[160px]" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Service</Label>
                <Select value={attService} onValueChange={setAttService}>
                  <SelectTrigger className="h-8 text-sm w-[200px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{SERVICE_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button size="sm" onClick={handleLogAttendance} className="gap-1.5 h-8 bg-white hover:bg-gray-50 text-navy-900 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Save Attendance
              </Button>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between px-1">
            <p className="text-sm text-muted-foreground">{presentIds.size} of {workers.filter(w => w.status === 'Active').length} active staff marked present</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setPresentIds(new Set(workers.filter(w => w.status === 'Active').map(w => w.id)))}>Mark All</Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setPresentIds(new Set())}>Clear</Button>
            </div>
          </div>

          {workers.filter(w => w.status !== 'Inactive').length === 0 ? (
            <div className="glass rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground text-sm">No active staff to mark attendance for.</div>
          ) : (
            <Card className="glass border-none shadow-sm">
              <div className="divide-y divide-border/50">
                {workers.filter(w => w.status !== 'Inactive').map(w => {
                  const isPresent = presentIds.has(w.id);
                  return (
                    <label key={w.id} className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors">
                      <input
                        type="checkbox"
                        className="accent-sage-600 w-4 h-4 rounded"
                        checked={isPresent}
                        onChange={() => {
                          const next = new Set(presentIds);
                          if (isPresent) next.delete(w.id); else next.add(w.id);
                          setPresentIds(next);
                        }}
                      />
                      <div className="w-8 h-8 rounded-full bg-navy-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {`${w.firstName[0] ?? ''}${w.lastName[0] ?? ''}`.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{w.firstName} {w.lastName}</p>
                        <p className="text-xs text-muted-foreground">{w.jobTitle} · {w.employmentType}</p>
                      </div>
                      {isPresent ? <CheckCircle2 className="w-4 h-4 text-sage-500 shrink-0" /> : <AlertCircle className="w-4 h-4 text-muted-foreground/40 shrink-0" />}
                    </label>
                  );
                })}
              </div>
            </Card>
          )}

          {workerAttendance.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Recent Attendance Logs</h3>
              <Card className="glass border-none shadow-sm">
                <div className="divide-y divide-border/50">
                  {Array.from(new Map(workerAttendance.map(a => [`${a.date}-${a.serviceType}`, a])).values()).slice(0, 10).map(a => {
                    const presentCount = workerAttendance.filter(x => x.date === a.date && x.serviceType === a.serviceType && x.present).length;
                    const total = workerAttendance.filter(x => x.date === a.date && x.serviceType === a.serviceType).length;
                    return (
                      <div key={`${a.date}-${a.serviceType}`} className="flex items-center justify-between px-4 py-2.5">
                        <div>
                          <p className="text-sm font-medium">{a.serviceType}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(a.date), 'EEEE, MMM d yyyy')}</p>
                        </div>
                        <span className="text-sm font-semibold text-sage-600 dark:text-sage-400">{presentCount}/{total} present</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ── Schedule Tab ── */}
        <TabsContent value="schedule" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{workerSchedules.length} scheduled duties</p>
            {actions.canManageWorkers && (
              <Button size="sm" onClick={openScheduleAdd} className="gap-1.5 h-8 bg-white hover:bg-gray-50 text-navy-900 font-medium">
                <Plus className="w-3.5 h-3.5" /> Schedule Duty
              </Button>
            )}
          </div>

          {workerSchedules.length === 0 ? (
            <div className="glass rounded-xl border border-dashed border-border p-16 text-center">
              <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-muted-foreground text-sm">No duties scheduled yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {DAYS.map(day => {
                const daySchedules = workerSchedules.filter(s => {
                  try { return format(new Date(s.date), 'EEEE') === day; } catch { return false; }
                });
                if (daySchedules.length === 0) return null;
                return (
                  <div key={day}>
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">{day}</h3>
                    <div className="space-y-2">
                      {daySchedules.map(s => {
                        const worker = workers.find(w => w.id === s.workerId);
                        return (
                          <Card key={s.id} className="glass border-none shadow-sm">
                            <CardContent className="p-3 flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-navy-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                {worker ? `${worker.firstName[0]}${worker.lastName[0]}`.toUpperCase() : '?'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{worker ? `${worker.firstName} ${worker.lastName}` : 'Unknown'}</p>
                                <p className="text-xs text-muted-foreground">{s.duty} · {s.startTime}–{s.endTime}</p>
                              </div>
                              <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                                s.status === 'Confirmed' ? 'bg-sage-500/10 text-sage-700 dark:text-sage-400 border-sage-200' :
                                s.status === 'Cancelled' ? 'bg-red-500/10 text-red-600 border-red-200' :
                                'bg-blue-500/10 text-blue-600 border-blue-200'
                              )}>{s.status}</span>
                              {actions.canManageWorkers && (
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openScheduleEdit(s)}><Pencil className="w-3 h-3" /></Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => deleteWorkerSchedule(s.id)}><X className="w-3 h-3" /></Button>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add/Edit Staff Dialog */}
      <Dialog open={workerDialog} onOpenChange={setWorkerDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{editing ? 'Edit Staff Member' : 'Add Staff Member'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <Label>First Name *</Label>
              <Input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} placeholder="e.g. Kwame" />
            </div>
            <div className="space-y-1.5">
              <Label>Last Name</Label>
              <Input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} placeholder="e.g. Mensah" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone *</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+233 24 000 0000" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="staff@church.com" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Job Title *</Label>
              <Input value={form.jobTitle} onChange={e => setForm(f => ({ ...f, jobTitle: e.target.value }))} placeholder="e.g. Accountant, Secretary, Janitor, Security" />
            </div>
            <div className="space-y-1.5">
              <Label>Employment Type</Label>
              <Select value={form.employmentType} onValueChange={v => setForm(f => ({ ...f, employmentType: v as EmploymentType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EMPLOYMENT_TYPES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as Worker['status'] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{WORKER_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWorkerDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-white hover:bg-gray-50 text-navy-900 font-medium">{editing ? 'Save Changes' : 'Add Staff'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Dialog */}
      <Dialog open={scheduleDialog} onOpenChange={setScheduleDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{editingSchedule ? 'Edit Duty' : 'Schedule Duty'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Staff Member *</Label>
              <Select value={scheduleForm.workerId} onValueChange={v => setScheduleForm(f => ({ ...f, workerId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select staff member…" /></SelectTrigger>
                <SelectContent>{workers.map(w => <SelectItem key={w.id} value={w.id}>{w.firstName} {w.lastName} — {w.jobTitle}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date *</Label>
              <Input type="date" value={scheduleForm.date} onChange={e => setScheduleForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Duty / Assignment *</Label>
              <Input value={scheduleForm.duty} onChange={e => setScheduleForm(f => ({ ...f, duty: e.target.value }))} placeholder="e.g. Office duty, Security" />
            </div>
            <div className="space-y-1.5">
              <Label>Start Time</Label>
              <Input type="time" value={scheduleForm.startTime} onChange={e => setScheduleForm(f => ({ ...f, startTime: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>End Time</Label>
              <Input type="time" value={scheduleForm.endTime} onChange={e => setScheduleForm(f => ({ ...f, endTime: e.target.value }))} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Notes</Label>
              <Input value={scheduleForm.notes} onChange={e => setScheduleForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional notes…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveSchedule} className="bg-white hover:bg-gray-50 text-navy-900 font-medium">{editingSchedule ? 'Save Changes' : 'Schedule'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
