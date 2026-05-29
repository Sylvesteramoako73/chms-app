import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, isPast, parseISO } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { useRole } from '@/context/RoleContext';
import { useData } from '@/context/DataContext';
import { useTasks } from '@/hooks/useTasks';
import type { Task, TaskPriority, TaskStatus, TaskNotificationChannel, UserRole } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Plus, ClipboardList, CheckCircle2, Clock, AlertTriangle, Trash2,
  MessageCircle, Smartphone, User, ChevronDown, Send,
} from 'lucide-react';
import { cn } from '@/utils';
import { openWhatsAppTo, openWhatsAppBroadcast, sendWhatsAppViaServer, sendWhatsAppBulkViaServer } from '@/lib/whatsapp';

// ── Role assignment hierarchy ──────────────────────────────────────────────
const ASSIGNABLE_ROLES: Record<UserRole, UserRole[]> = {
  Administrator: ['Branch Pastor', 'Pastor', 'Department Head', 'Data Entry'],
  'Branch Pastor': ['Pastor', 'Department Head', 'Data Entry'],
  Pastor: ['Department Head', 'Data Entry'],
  'Department Head': [],
  'Data Entry': [],
};

// ── Style maps ─────────────────────────────────────────────────────────────
const PRIORITY_STYLES: Record<TaskPriority, string> = {
  Low: 'bg-navy-700 text-navy-300 border-navy-600',
  Medium: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  High: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  Urgent: 'bg-red-500/10 text-red-400 border-red-500/30',
};

const STATUS_STYLES: Record<TaskStatus, string> = {
  Pending: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  'In Progress': 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  Completed: 'bg-sage-500/10 text-sage-400 border-sage-500/30',
  Overdue: 'bg-red-500/10 text-red-400 border-red-500/30',
};

const STATUS_ICONS: Record<TaskStatus, React.ElementType> = {
  Pending: Clock,
  'In Progress': AlertTriangle,
  Completed: CheckCircle2,
  Overdue: AlertTriangle,
};

const PRIORITIES: TaskPriority[] = ['Low', 'Medium', 'High', 'Urgent'];
const STATUSES: TaskStatus[] = ['Pending', 'In Progress', 'Completed', 'Overdue'];

// ── Notification message builder ───────────────────────────────────────────
function buildMessage(task: Pick<Task, 'title' | 'description' | 'priority' | 'dueDate'>, assignerName: string) {
  const due = task.dueDate ? ` Due: ${format(parseISO(task.dueDate), 'dd MMM yyyy')}.` : '';
  return `Hi, you have been assigned a task by ${assignerName}.\n\nTask: ${task.title}${task.description ? `\nDetails: ${task.description}` : ''}\nPriority: ${task.priority}${due}\n\nPlease log in to ChurchCare to update your progress. God bless you!`;
}

// ── Task card ──────────────────────────────────────────────────────────────
function TaskCard({
  task, isOwn, currentUserId,
  onStatusChange, onDelete, onNotify,
}: {
  task: Task;
  isOwn: boolean;
  currentUserId: string;
  onStatusChange: (id: string, s: TaskStatus) => void;
  onDelete: (id: string) => void;
  onNotify: (task: Task) => Promise<void>;
}) {
  const [notifying, setNotifying] = useState(false);
  const StatusIcon = STATUS_ICONS[task.status];
  const isAssigner = task.assignedBy === currentUserId;
  const overdue = task.dueDate && task.status !== 'Completed' && isPast(parseISO(task.dueDate + 'T23:59:59'));

  const handleNotify = async () => {
    setNotifying(true);
    await onNotify(task);
    setNotifying(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-navy-800 border border-navy-700 rounded-xl p-4 space-y-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white leading-tight">{task.title}</p>
          {task.description && (
            <p className="text-sm text-navy-400 mt-1 line-clamp-2">{task.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={cn('text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border', PRIORITY_STYLES[task.priority])}>
            {task.priority}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-navy-400">
        <span className="flex items-center gap-1">
          <User className="w-3 h-3" />
          {isOwn ? `From: ${task.assignedByName}` : `To: ${task.assignedToName}`}
        </span>
        {task.dueDate && (
          <span className={cn('flex items-center gap-1', overdue ? 'text-red-400' : '')}>
            <Clock className="w-3 h-3" />
            {format(parseISO(task.dueDate), 'dd MMM yyyy')}
          </span>
        )}
        <span className="flex items-center gap-1">
          {task.notificationChannel === 'WhatsApp'
            ? <MessageCircle className="w-3 h-3 text-green-500" />
            : <Smartphone className="w-3 h-3 text-blue-400" />}
          {task.notificationChannel}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded border', STATUS_STYLES[task.status])}>
          <StatusIcon className="w-3 h-3" />
          {task.status}
        </span>

        <div className="flex items-center gap-1.5">
          {/* Status changer — assignee can update, assigner can also update */}
          <div className="relative">
            <select
              value={task.status}
              onChange={e => onStatusChange(task.id, e.target.value as TaskStatus)}
              className="appearance-none bg-navy-700 border border-navy-600 text-navy-300 text-xs rounded-lg px-2.5 py-1.5 pr-6 focus:outline-none focus:ring-1 focus:ring-gold-500/50 cursor-pointer"
            >
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-navy-500 pointer-events-none" />
          </div>

          {/* Notify again button — only assigner */}
          {isAssigner && task.assignedToPhone && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleNotify}
              disabled={notifying}
              className="h-7 w-7 p-0 text-navy-400 hover:text-green-400"
              title={`Re-send via ${task.notificationChannel}`}
            >
              <Send className={cn('w-3.5 h-3.5', notifying && 'animate-pulse')} />
            </Button>
          )}

          {/* Delete — only assigner */}
          {isAssigner && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(task.id)}
              className="h-7 w-7 p-0 text-navy-400 hover:text-red-400"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

type AssignMode = 'individual' | 'group' | 'all';

const EMPTY_FORM = {
  title: '',
  description: '',
  assignMode: 'individual' as AssignMode,
  assignedTo: '',
  targetRole: '' as UserRole | '',
  priority: 'Medium' as TaskPriority,
  dueDate: '',
  notificationChannel: 'WhatsApp' as TaskNotificationChannel,
};

// ── Main page ──────────────────────────────────────────────────────────────
export default function Tasks() {
  const { profile, allProfiles } = useAuth();
  const { role } = useRole();
  const { addNotification, members } = useData();
  const { tasks, loading, addTask, addTasksBulk, updateStatus, deleteTask } = useTasks(profile?.id);
  const { toast } = useToast();

  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const canAssign = ASSIGNABLE_ROLES[role].length > 0;

  // All profiles this user can assign to
  const assignableProfiles = useMemo(() => {
    const allowedRoles = ASSIGNABLE_ROLES[role];
    return allProfiles.filter(p => p.id !== profile?.id && allowedRoles.includes(p.role));
  }, [allProfiles, profile?.id, role]);

  // Roles available for "By Role" mode
  const assignableRoles = useMemo(() =>
    [...new Set(assignableProfiles.map(p => p.role))] as UserRole[],
  [assignableProfiles]);

  // Resolve which profiles will receive the task based on current mode
  const targetProfiles = useMemo(() => {
    if (form.assignMode === 'individual') {
      const p = assignableProfiles.find(x => x.id === form.assignedTo);
      return p ? [p] : [];
    }
    if (form.assignMode === 'group') {
      return form.targetRole ? assignableProfiles.filter(p => p.role === form.targetRole) : [];
    }
    return assignableProfiles; // 'all'
  }, [form.assignMode, form.assignedTo, form.targetRole, assignableProfiles]);

  // Get phone: prefer profile's own phone, fall back to matching member record by email
  const getPhone = (profileId: string, email: string) => {
    const profilePhone = allProfiles.find(p => p.id === profileId)?.phone;
    if (profilePhone) return profilePhone;
    return members.find(m => m.email?.toLowerCase() === email.toLowerCase())?.phone ?? undefined;
  };

  const myTasks = tasks.filter(t => t.assignedTo === profile?.id);
  const assignedTasks = tasks.filter(t => t.assignedBy === profile?.id && t.assignedTo !== profile?.id);

  const stats = useMemo(() => ({
    pending: myTasks.filter(t => t.status === 'Pending').length,
    inProgress: myTasks.filter(t => t.status === 'In Progress').length,
    completed: myTasks.filter(t => t.status === 'Completed').length,
    assigned: assignedTasks.length,
  }), [myTasks, assignedTasks]);

  // ── Single-task re-notify (from task card send button) ────────────────────
  const sendNotification = async (task: Task): Promise<void> => {
    if (!task.assignedToPhone) return;
    const message = buildMessage(task, profile?.name ?? 'Your Pastor');
    const phone = task.assignedToPhone.replace(/\D/g, '');

    if (task.notificationChannel === 'WhatsApp') {
      if (profile?.id) {
        const ok = await sendWhatsAppViaServer(profile.id, phone, message);
        if (ok) {
          toast({ title: 'WhatsApp sent', description: `Message delivered to ${task.assignedToName}.` });
          return;
        }
      }
      openWhatsAppTo(phone, message);
      toast({ title: 'WhatsApp opened', description: `Sending to ${task.assignedToName} — tap Send in WhatsApp.` });
    } else {
      let smsSettings = { apiKey: '', senderId: 'ChurchCare' };
      try { smsSettings = { ...smsSettings, ...JSON.parse(localStorage.getItem('chms_sms_settings') ?? '{}') }; } catch { /* */ }
      if (!smsSettings.apiKey.trim()) {
        toast({ title: 'SMS API key not set', description: 'Add your mNotify API key in the Communication settings.', variant: 'destructive' });
        return;
      }
      try {
        const url = `https://api.mnotify.com/api/sms/quick?key=${encodeURIComponent(smsSettings.apiKey.trim())}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipient: [phone], sender: (smsSettings.senderId || 'ChurchCare').slice(0, 11), message, is_schedule: false, schedule_date: '' }),
        });
        const data = await res.json() as { status?: string; code?: string };
        if (data.code === '2000' || data.status === 'success') {
          toast({ title: 'SMS sent', description: `SMS delivered to ${task.assignedToName}` });
        } else { throw new Error(); }
      } catch {
        toast({ title: 'SMS send failed', description: 'Check your mNotify API key and balance.', variant: 'destructive' });
      }
    }
  };

  // ── Bulk notify for group/all assignments ──────────────────────────────────
  const sendBulkNotification = async (
    channel: TaskNotificationChannel,
    numbers: string[],
    message: string,
    label: string,
  ): Promise<void> => {
    if (numbers.length === 0) return;
    const clean = numbers.map(n => n.replace(/\D/g, '')).filter(Boolean);
    if (clean.length === 0) return;

    if (channel === 'WhatsApp') {
      if (profile?.id) {
        const ok = await sendWhatsAppBulkViaServer(profile.id, clean, message);
        if (ok) {
          toast({ title: 'WhatsApp sent', description: `Messages delivered to ${label}.` });
          return;
        }
      }
      openWhatsAppBroadcast(message);
      toast({ title: 'WhatsApp opened', description: `Pick your group in WhatsApp and tap Send to notify ${label}.` });
    } else {
      let smsSettings = { apiKey: '', senderId: 'ChurchCare' };
      try { smsSettings = { ...smsSettings, ...JSON.parse(localStorage.getItem('chms_sms_settings') ?? '{}') }; } catch { /* */ }
      if (!smsSettings.apiKey.trim()) {
        toast({ title: 'SMS API key not set', description: 'Add your mNotify API key in the Communication settings.', variant: 'destructive' });
        return;
      }
      try {
        function normaliseMsisdn(raw: string): string {
          let n = raw.replace(/\D/g, '');
          if (n.startsWith('00')) n = n.slice(2);
          if (n.startsWith('0')) n = '233' + n.slice(1);
          if (!n.startsWith('233')) n = '233' + n;
          return n;
        }
        const normalised = clean.map(normaliseMsisdn).filter(n => n.length >= 11);
        const url = `https://api.mnotify.com/api/sms/quick?key=${encodeURIComponent(smsSettings.apiKey.trim())}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipient: normalised, sender: (smsSettings.senderId || 'ChurchCare').slice(0, 11), message, is_schedule: false, schedule_date: '' }),
        });
        const data = await res.json() as { status?: string; code?: number; message?: string };
        if (data.status === 'success' || data.code === 1000) {
          toast({ title: 'SMS sent', description: `SMS sent to ${label}` });
        } else {
          const hint = data.code === 1004 ? ' Check your API key in Settings.' : data.code === 1006 ? ' Top up your mNotify balance.' : '';
          throw new Error((data.message ?? `mNotify error ${data.code}`) + hint);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        toast({ title: 'SMS send failed', description: msg, variant: 'destructive' });
      }
    }
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) { toast({ title: 'Title is required', variant: 'destructive' }); return; }
    if (form.assignMode === 'individual' && !form.assignedTo) {
      toast({ title: 'Please select an assignee', variant: 'destructive' }); return;
    }
    if (form.assignMode === 'group' && !form.targetRole) {
      toast({ title: 'Please select a role', variant: 'destructive' }); return;
    }
    if (targetProfiles.length === 0) {
      toast({ title: 'No users found', description: 'No users match the selected group.', variant: 'destructive' }); return;
    }

    setSaving(true);
    const now = Date.now();
    const base = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      assignedBy: profile!.id,
      assignedByName: profile!.name,
      status: 'Pending' as TaskStatus,
      priority: form.priority,
      dueDate: form.dueDate || undefined,
      notificationChannel: form.notificationChannel,
      notificationSent: false,
    };

    const taskList: Omit<Task, 'createdAt' | 'updatedAt'>[] = targetProfiles.map((p, i) => ({
      ...base,
      id: `task_${now}_${i}`,
      assignedTo: p.id,
      assignedToName: p.name,
      assignedToPhone: getPhone(p.id, p.email),
    }));

    const error = taskList.length === 1
      ? await addTask(taskList[0])
      : await addTasksBulk(taskList);
    if (error) {
      toast({ title: 'Failed to create tasks', description: error.message, variant: 'destructive' });
      setSaving(false);
      return;
    }

    // In-app notifications
    const ts = new Date().toISOString();
    targetProfiles.forEach((p, i) => {
      addNotification({
        id: `notif_task_${now}_${i}`,
        title: 'New Task Assigned',
        message: `${profile!.name} assigned you: "${base.title}"`,
        recipient: p.id,
        createdBy: profile!.id,
        createdAt: ts,
      });
    });

    // External notifications — only to those with a matched phone
    const phones = targetProfiles.map(p => getPhone(p.id, p.email)).filter(Boolean) as string[];
    const message = buildMessage(base, profile!.name);
    const groupLabel = form.assignMode === 'individual'
      ? targetProfiles[0].name
      : form.assignMode === 'group'
        ? `all ${form.targetRole}s (${targetProfiles.length})`
        : `everyone (${targetProfiles.length})`;

    if (phones.length > 0) {
      await sendBulkNotification(form.notificationChannel, phones, message, groupLabel);
    } else if (targetProfiles.length > 0) {
      toast({ title: `Task${taskList.length > 1 ? 's' : ''} assigned`, description: `In-app notification sent. No phone numbers found for ${groupLabel}.` });
    }

    if (phones.length > 0) {
      toast({ title: `Task${taskList.length > 1 ? 's' : ''} assigned`, description: `Assigned to ${groupLabel}` });
    }

    setShowDialog(false);
    setForm(EMPTY_FORM);
    setSaving(false);
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Task Assignment</h1>
          <p className="text-navy-400 text-sm mt-0.5">Assign and track tasks across your team</p>
        </div>
        {canAssign && (
          <Button onClick={() => setShowDialog(true)} className="bg-gold-500 hover:bg-gold-400 text-navy-900 font-semibold gap-2">
            <Plus className="w-4 h-4" /> Assign Task
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Pending', value: stats.pending, color: 'text-amber-400' },
          { label: 'In Progress', value: stats.inProgress, color: 'text-blue-400' },
          { label: 'Completed', value: stats.completed, color: 'text-sage-400' },
          { label: 'Tasks I Assigned', value: stats.assigned, color: 'text-gold-400' },
        ].map(s => (
          <Card key={s.label} className="bg-navy-800 border-navy-700">
            <CardContent className="p-4">
              <p className="text-navy-400 text-xs uppercase tracking-wider">{s.label}</p>
              <p className={cn('text-3xl font-bold mt-1', s.color)}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="mine">
        <TabsList className="bg-navy-800 border border-navy-700">
          <TabsTrigger value="mine" className="data-[state=active]:bg-navy-700">
            My Tasks <Badge variant="secondary" className="ml-1.5 bg-navy-700 text-navy-300">{myTasks.length}</Badge>
          </TabsTrigger>
          {canAssign && (
            <TabsTrigger value="assigned" className="data-[state=active]:bg-navy-700">
              Assigned by Me <Badge variant="secondary" className="ml-1.5 bg-navy-700 text-navy-300">{assignedTasks.length}</Badge>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="mine" className="mt-4">
          {loading ? (
            <p className="text-navy-400 text-sm">Loading tasks…</p>
          ) : myTasks.length === 0 ? (
            <div className="text-center py-16 text-navy-400">
              <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>No tasks assigned to you yet.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {myTasks.map(t => (
                <TaskCard
                  key={t.id} task={t} isOwn currentUserId={profile!.id}
                  onStatusChange={updateStatus}
                  onDelete={deleteTask}
                  onNotify={sendNotification}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {canAssign && (
          <TabsContent value="assigned" className="mt-4">
            {loading ? (
              <p className="text-navy-400 text-sm">Loading tasks…</p>
            ) : assignedTasks.length === 0 ? (
              <div className="text-center py-16 text-navy-400">
                <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>You haven't assigned any tasks yet.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {assignedTasks.map(t => (
                  <TaskCard
                    key={t.id} task={t} isOwn={false} currentUserId={profile!.id}
                    onStatusChange={updateStatus}
                    onDelete={deleteTask}
                    onNotify={sendNotification}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Assign Task Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-navy-900 border-navy-700 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Assign New Task</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-navy-300">Task Title *</Label>
              <Input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Prepare Sunday bulletin"
                className="bg-navy-800 border-navy-600 text-white placeholder:text-navy-500"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-navy-300">Description</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Additional details…"
                rows={2}
                className="bg-navy-800 border-navy-600 text-white placeholder:text-navy-500 resize-none"
              />
            </div>

            {/* Assignment mode */}
            <div className="space-y-2">
              <Label className="text-navy-300">Assign To</Label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: 'individual', label: 'Individual', desc: 'One person' },
                  { value: 'group', label: 'By Role', desc: 'All of a role' },
                  { value: 'all', label: 'Everyone', desc: `${assignableProfiles.length} people` },
                ] as { value: AssignMode; label: string; desc: string }[]).map(m => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, assignMode: m.value, assignedTo: '', targetRole: '' }))}
                    className={cn(
                      'flex flex-col items-center py-2.5 px-2 rounded-lg border text-sm font-medium transition-colors',
                      form.assignMode === m.value
                        ? 'bg-gold-500/20 border-gold-500/50 text-gold-400'
                        : 'bg-navy-800 border-navy-600 text-navy-400 hover:border-navy-500'
                    )}
                  >
                    <span>{m.label}</span>
                    <span className="text-[10px] opacity-60 mt-0.5">{m.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Individual picker */}
            {form.assignMode === 'individual' && (
              <div className="space-y-1.5">
                <Label className="text-navy-300">Select Person *</Label>
                <Select value={form.assignedTo} onValueChange={v => setForm(f => ({ ...f, assignedTo: v }))}>
                  <SelectTrigger className="bg-navy-800 border-navy-600 text-white">
                    <SelectValue placeholder="Select person" />
                  </SelectTrigger>
                  <SelectContent className="bg-navy-800 border-navy-700">
                    {assignableProfiles.length === 0
                      ? <SelectItem value="_none" disabled>No users available</SelectItem>
                      : assignableProfiles.map(p => (
                        <SelectItem key={p.id} value={p.id} className="text-white focus:bg-navy-700">
                          {p.name} <span className="text-navy-400 text-xs ml-1">({p.role})</span>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Role picker */}
            {form.assignMode === 'group' && (
              <div className="space-y-1.5">
                <Label className="text-navy-300">Select Role *</Label>
                <Select value={form.targetRole} onValueChange={v => setForm(f => ({ ...f, targetRole: v as UserRole }))}>
                  <SelectTrigger className="bg-navy-800 border-navy-600 text-white">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="bg-navy-800 border-navy-700">
                    {assignableRoles.length === 0
                      ? <SelectItem value="_none" disabled>No roles available</SelectItem>
                      : assignableRoles.map(r => {
                        const count = assignableProfiles.filter(p => p.role === r).length;
                        return (
                          <SelectItem key={r} value={r} className="text-white focus:bg-navy-700">
                            {r} <span className="text-navy-400 text-xs ml-1">({count} {count === 1 ? 'person' : 'people'})</span>
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
                {form.targetRole && (
                  <p className="text-xs text-navy-400">
                    Will assign to {assignableProfiles.filter(p => p.role === form.targetRole).length} {form.targetRole}(s)
                  </p>
                )}
              </div>
            )}

            {/* Everyone summary */}
            {form.assignMode === 'all' && (
              <div className="bg-navy-800 border border-navy-700 rounded-lg px-3 py-2.5 text-sm text-navy-300">
                Task will be assigned to all <span className="text-white font-medium">{assignableProfiles.length} people</span> below your role.
              </div>
            )}

            {/* Priority & Due Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-navy-300">Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v as TaskPriority }))}>
                  <SelectTrigger className="bg-navy-800 border-navy-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-navy-800 border-navy-700">
                    {PRIORITIES.map(p => (
                      <SelectItem key={p} value={p} className="text-white focus:bg-navy-700">{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-navy-300">Due Date</Label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                  className="bg-navy-800 border-navy-600 text-white"
                />
              </div>
            </div>

            {/* Notification channel */}
            <div className="space-y-2">
              <Label className="text-navy-300">Send Notification Via</Label>
              <div className="flex gap-3">
                {(['WhatsApp', 'SMS'] as TaskNotificationChannel[]).map(ch => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, notificationChannel: ch }))}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors',
                      form.notificationChannel === ch
                        ? ch === 'WhatsApp'
                          ? 'bg-green-500/20 border-green-500/50 text-green-400'
                          : 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                        : 'bg-navy-800 border-navy-600 text-navy-400 hover:border-navy-500'
                    )}
                  >
                    {ch === 'WhatsApp' ? <MessageCircle className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
                    {ch}
                  </button>
                ))}
              </div>
              <p className="text-xs text-navy-500">
                Phone numbers are auto-matched from member records by email.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDialog(false)} className="text-navy-300 hover:text-white">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="bg-gold-500 hover:bg-gold-400 text-navy-900 font-semibold"
            >
              {saving
                ? 'Saving…'
                : targetProfiles.length > 1
                  ? `Assign to ${targetProfiles.length} people`
                  : 'Assign Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
