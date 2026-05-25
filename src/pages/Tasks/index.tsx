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
  onNotify: (task: Task) => void;
}) {
  const StatusIcon = STATUS_ICONS[task.status];
  const isAssigner = task.assignedBy === currentUserId;
  const overdue = task.dueDate && task.status !== 'Completed' && isPast(parseISO(task.dueDate + 'T23:59:59'));

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
              onClick={() => onNotify(task)}
              className="h-7 w-7 p-0 text-navy-400 hover:text-green-400"
              title={`Re-send via ${task.notificationChannel}`}
            >
              <Send className="w-3.5 h-3.5" />
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

// ── Main page ──────────────────────────────────────────────────────────────
export default function Tasks() {
  const { profile, allProfiles } = useAuth();
  const { role } = useRole();
  const { addNotification } = useData();
  const { tasks, loading, addTask, updateStatus, deleteTask } = useTasks(profile?.id);
  const { toast } = useToast();

  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    assignedTo: '',
    priority: 'Medium' as TaskPriority,
    dueDate: '',
    notificationChannel: 'WhatsApp' as TaskNotificationChannel,
    phone: '',
  });

  const canAssign = ASSIGNABLE_ROLES[role].length > 0;

  // Profiles the current user is allowed to assign tasks to
  const assignableProfiles = useMemo(() => {
    const allowedRoles = ASSIGNABLE_ROLES[role];
    return allProfiles.filter(p => p.id !== profile?.id && allowedRoles.includes(p.role));
  }, [allProfiles, profile?.id, role]);

  const myTasks = tasks.filter(t => t.assignedTo === profile?.id);
  const assignedTasks = tasks.filter(t => t.assignedBy === profile?.id && t.assignedTo !== profile?.id);

  const stats = useMemo(() => ({
    pending: myTasks.filter(t => t.status === 'Pending').length,
    inProgress: myTasks.filter(t => t.status === 'In Progress').length,
    completed: myTasks.filter(t => t.status === 'Completed').length,
    assigned: assignedTasks.length,
  }), [myTasks, assignedTasks]);

  const sendNotification = (task: Task) => {
    if (!task.assignedToPhone) return;
    const message = buildMessage(task, profile?.name ?? 'Your Pastor');

    if (task.notificationChannel === 'WhatsApp') {
      const phone = task.assignedToPhone.replace(/\D/g, '');
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    } else {
      // SMS: log to reminder logs in localStorage
      const LOGS_KEY = 'chms_reminder_logs';
      const existing = (() => { try { return JSON.parse(localStorage.getItem(LOGS_KEY) ?? '[]'); } catch { return []; } })();
      const newLog = {
        id: `log_task_${Date.now()}`,
        templateName: 'Task Assignment',
        recipientName: task.assignedToName,
        recipientContact: task.assignedToPhone,
        channel: 'SMS',
        type: 'Custom',
        message,
        sentAt: new Date().toISOString(),
        status: 'Sent',
      };
      localStorage.setItem(LOGS_KEY, JSON.stringify([newLog, ...existing]));
      toast({ title: 'SMS logged', description: `SMS to ${task.assignedToName} logged in Automation.` });
    }
  };

  const handleAssigneeChange = (profileId: string) => {
    const p = assignableProfiles.find(x => x.id === profileId);
    setForm(f => ({ ...f, assignedTo: profileId, phone: '' }));
    // Try to prefill phone from members list if this profile's email matches a member
    // (Leave empty — assigner will type it)
    void p;
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) { toast({ title: 'Title is required', variant: 'destructive' }); return; }
    if (!form.assignedTo) { toast({ title: 'Please select an assignee', variant: 'destructive' }); return; }

    const assignee = assignableProfiles.find(p => p.id === form.assignedTo);
    if (!assignee) return;

    setSaving(true);
    const newTask: Omit<Task, 'createdAt' | 'updatedAt'> = {
      id: `task_${Date.now()}`,
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      assignedTo: form.assignedTo,
      assignedToName: assignee.name,
      assignedToPhone: form.phone.trim() || undefined,
      assignedBy: profile!.id,
      assignedByName: profile!.name,
      status: 'Pending',
      priority: form.priority,
      dueDate: form.dueDate || undefined,
      notificationChannel: form.notificationChannel,
      notificationSent: false,
    };

    const error = await addTask(newTask);
    if (error) {
      toast({ title: 'Failed to create task', description: error.message, variant: 'destructive' });
      setSaving(false);
      return;
    }

    // In-app notification for assignee
    addNotification({
      id: `notif_task_${Date.now()}`,
      title: 'New Task Assigned',
      message: `${profile!.name} assigned you: "${newTask.title}"`,
      recipient: form.assignedTo,
      createdBy: profile!.id,
      createdAt: new Date().toISOString(),
    });

    // Send WhatsApp / SMS notification
    if (form.phone.trim()) {
      sendNotification({ ...newTask, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }

    toast({ title: 'Task created', description: `Assigned to ${assignee.name}` });
    setShowDialog(false);
    setForm({ title: '', description: '', assignedTo: '', priority: 'Medium', dueDate: '', notificationChannel: 'WhatsApp', phone: '' });
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
        <DialogContent className="bg-navy-900 border-navy-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Assign New Task</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-navy-300">Task Title *</Label>
              <Input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Prepare Sunday bulletin"
                className="bg-navy-800 border-navy-600 text-white placeholder:text-navy-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-navy-300">Description</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Additional details…"
                rows={3}
                className="bg-navy-800 border-navy-600 text-white placeholder:text-navy-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-navy-300">Assign To *</Label>
                <Select value={form.assignedTo} onValueChange={handleAssigneeChange}>
                  <SelectTrigger className="bg-navy-800 border-navy-600 text-white">
                    <SelectValue placeholder="Select person" />
                  </SelectTrigger>
                  <SelectContent className="bg-navy-800 border-navy-700">
                    {assignableProfiles.length === 0 ? (
                      <SelectItem value="_none" disabled>No users available</SelectItem>
                    ) : (
                      assignableProfiles.map(p => (
                        <SelectItem key={p.id} value={p.id} className="text-white focus:bg-navy-700">
                          <span>{p.name}</span>
                          <span className="text-navy-400 text-xs ml-2">({p.role})</span>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

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
                    {ch === 'WhatsApp'
                      ? <MessageCircle className="w-4 h-4" />
                      : <Smartphone className="w-4 h-4" />}
                    {ch}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-navy-300">
                Recipient Phone Number
                <span className="text-navy-500 font-normal ml-1">(for notification)</span>
              </Label>
              <Input
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder={form.notificationChannel === 'WhatsApp' ? '+233 XX XXX XXXX' : '0XX XXX XXXX'}
                className="bg-navy-800 border-navy-600 text-white placeholder:text-navy-500"
              />
              {form.notificationChannel === 'WhatsApp' && form.phone && (
                <p className="text-xs text-navy-500">WhatsApp will open with a pre-filled message for you to send.</p>
              )}
              {form.notificationChannel === 'SMS' && form.phone && (
                <p className="text-xs text-navy-500">SMS will be logged in the Automation module.</p>
              )}
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
              {saving ? 'Saving…' : 'Assign Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
