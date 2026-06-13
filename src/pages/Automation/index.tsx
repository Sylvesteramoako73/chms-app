import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, subDays } from 'date-fns';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import type { ReminderTemplate, ReminderLog, ReminderType, ReminderChannel } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  BellRing, Plus, Pencil, Trash2, Play, CheckCircle2, XCircle, Clock,
  Mail, MessageCircle, Smartphone, Gift, Calendar, Users, Zap, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { cn } from '@/utils';
import { sendWhatsAppViaServer } from '@/lib/whatsapp';

// ── localStorage keys ──────────────────────────────────────────────────────────
const TEMPLATES_KEY = 'chms_reminder_templates';
const LOGS_KEY = 'chms_reminder_logs';
const SETTINGS_KEY = 'chms_birthday_wa';

const loadJSON = <T,>(key: string, fallback: T): T => {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback; } catch { return fallback; }
};

// ── Defaults ──────────────────────────────────────────────────────────────────
const DEFAULT_TEMPLATES: ReminderTemplate[] = [
  { id: 'tpl_bday', name: 'Birthday Greeting', type: 'Birthday', channel: 'WhatsApp', body: 'Happy Birthday, {name}! 🎂 Wishing you a day filled with God\'s blessings. With love, from your church family.', isActive: true, daysBeforeEvent: 0, createdAt: new Date().toISOString() },
  { id: 'tpl_ann', name: 'Church Anniversary', type: 'Anniversary', channel: 'WhatsApp', body: 'Happy Church Anniversary, {name}! 🎉 {years} years of faithfulness. God bless you abundantly!', isActive: true, daysBeforeEvent: 0, createdAt: new Date().toISOString() },
  { id: 'tpl_event', name: 'Event Reminder', type: 'Event', channel: 'SMS', body: 'Reminder: {eventName} is coming up on {date} at {time}. See you there! — {churchName}', isActive: false, daysBeforeEvent: 1, createdAt: new Date().toISOString() },
  { id: 'tpl_meeting', name: 'Meeting Reminder', type: 'Meeting', channel: 'SMS', body: 'Reminder: {meetingName} is scheduled for {date} at {time}. Please be on time. — {churchName}', isActive: false, daysBeforeEvent: 1, createdAt: new Date().toISOString() },
];

const REMINDER_TYPES: ReminderType[] = ['Birthday', 'Anniversary', 'Event', 'Meeting', 'Custom'];
const CHANNELS: ReminderChannel[] = ['WhatsApp', 'SMS', 'Email'];

const TYPE_ICONS: Record<ReminderType, React.ElementType> = {
  Birthday: Gift, Anniversary: Calendar, Event: Calendar, Meeting: Users, Custom: Zap,
};
const CHANNEL_ICONS: Record<ReminderChannel, React.ElementType> = {
  WhatsApp: MessageCircle, SMS: Smartphone, Email: Mail,
};
const CHANNEL_COLORS: Record<ReminderChannel, string> = {
  WhatsApp: 'text-green-500', SMS: 'text-blue-500', Email: 'text-orange-500',
};
const STATUS_STYLES: Record<string, string> = {
  Sent: 'bg-sage-500/10 text-sage-700 dark:text-sage-400 border-sage-200',
  Failed: 'bg-red-500/10 text-red-600 border-red-200',
  Pending: 'bg-amber-500/10 text-amber-600 border-amber-200',
};

const EMPTY_TEMPLATE: Omit<ReminderTemplate, 'id' | 'createdAt'> = {
  name: '', type: 'Birthday', channel: 'WhatsApp', subject: '', body: '', isActive: true, daysBeforeEvent: 0,
};

const PLACEHOLDERS: Record<ReminderType, string[]> = {
  Birthday: ['{name}', '{firstName}', '{churchName}'],
  Anniversary: ['{name}', '{years}', '{churchName}'],
  Event: ['{eventName}', '{date}', '{time}', '{location}', '{churchName}'],
  Meeting: ['{meetingName}', '{date}', '{time}', '{churchName}'],
  Custom: ['{name}', '{date}', '{churchName}'],
};

export default function Automation() {
  const { members, events } = useData();
  const { profile } = useAuth();
  const { toast } = useToast();

  const [templates, setTemplates] = useState<ReminderTemplate[]>(() => {
    const saved = loadJSON<ReminderTemplate[]>(TEMPLATES_KEY, []);
    return saved.length > 0 ? saved : DEFAULT_TEMPLATES;
  });
  const [logs, setLogs] = useState<ReminderLog[]>(() => loadJSON<ReminderLog[]>(LOGS_KEY, []));
  const [bwaSettings, setBwaSettings] = useState<{ birthdayEnabled: boolean; anniversaryEnabled: boolean }>(
    () => loadJSON(SETTINGS_KEY, { birthdayEnabled: false, anniversaryEnabled: false })
  );

  const [templateDialog, setTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReminderTemplate | null>(null);
  const [tForm, setTForm] = useState({ ...EMPTY_TEMPLATE });
  const [sending, setSending] = useState<string | null>(null);

  const saveTemplates = (next: ReminderTemplate[]) => {
    setTemplates(next);
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(next));
  };
  const saveLogs = (next: ReminderLog[]) => {
    setLogs(next);
    localStorage.setItem(LOGS_KEY, JSON.stringify(next));
  };
  const saveBwa = (next: typeof bwaSettings) => {
    setBwaSettings(next);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  };

  const openAddTemplate = () => {
    setEditingTemplate(null);
    setTForm({ ...EMPTY_TEMPLATE });
    setTemplateDialog(true);
  };
  const openEditTemplate = (t: ReminderTemplate) => {
    setEditingTemplate(t);
    setTForm({ name: t.name, type: t.type, channel: t.channel, subject: t.subject ?? '', body: t.body, isActive: t.isActive, daysBeforeEvent: t.daysBeforeEvent });
    setTemplateDialog(true);
  };

  const handleSaveTemplate = () => {
    if (!tForm.name.trim()) { toast({ title: 'Template name is required', variant: 'destructive' }); return; }
    if (!tForm.body.trim()) { toast({ title: 'Message body is required', variant: 'destructive' }); return; }
    if (editingTemplate) {
      saveTemplates(templates.map(t => t.id === editingTemplate.id ? { ...editingTemplate, ...tForm } : t));
      toast({ title: 'Template updated' });
    } else {
      saveTemplates([...templates, { id: `tpl_${Date.now()}`, ...tForm, createdAt: new Date().toISOString() }]);
      toast({ title: 'Template created' });
    }
    setTemplateDialog(false);
  };

  const handleDeleteTemplate = (id: string) => {
    saveTemplates(templates.filter(t => t.id !== id));
    toast({ title: 'Template deleted' });
  };

  const handleToggleTemplate = (id: string) => {
    saveTemplates(templates.map(t => t.id === id ? { ...t, isActive: !t.isActive } : t));
  };

  // Manual "send now" for Birthday / Anniversary via WhatsApp
  const handleSendNow = async (template: ReminderTemplate) => {
    setSending(template.id);
    try {
      const today = new Date();
      const targets = template.type === 'Birthday'
        ? members.filter(m => m.dateOfBirth && m.phone && new Date(m.dateOfBirth).getMonth() === today.getMonth() && new Date(m.dateOfBirth).getDate() === today.getDate())
        : template.type === 'Anniversary'
        ? members.filter(m => m.joinDate && m.phone && new Date(m.joinDate).getMonth() === today.getMonth() && new Date(m.joinDate).getDate() === today.getDate() && new Date(m.joinDate).getFullYear() !== today.getFullYear())
        : [];

      if (targets.length === 0) {
        toast({ title: 'No recipients today', description: `No members have a ${template.type.toLowerCase()} today.` });
        return;
      }

      const newLogs: ReminderLog[] = [];
      let serverSent = 0;
      for (const m of targets) {
        const years = template.type === 'Anniversary' ? String(today.getFullYear() - new Date(m.joinDate).getFullYear()) : '';
        const msg = template.body
          .replace('{name}', `${m.firstName} ${m.lastName}`)
          .replace('{firstName}', m.firstName)
          .replace('{years}', years)
          .replace('{churchName}', "Winners' Chapel");
        let sent = false;
        if (profile?.id) {
          sent = await sendWhatsAppViaServer(profile.churchId ?? 'default', m.phone!, msg);
        }
        if (sent) serverSent++;
        newLogs.push({ id: `log_${Date.now()}_${m.id}`, templateId: template.id, templateName: template.name, recipientName: `${m.firstName} ${m.lastName}`, recipientContact: m.phone, channel: 'WhatsApp', type: template.type, message: msg, sentAt: new Date().toISOString(), status: 'Sent' });
      }

      saveLogs([...newLogs, ...logs]);
      if (serverSent > 0) {
        toast({ title: `WhatsApp sent to ${serverSent} recipient${serverSent !== 1 ? 's' : ''}`, description: 'Messages delivered automatically.' });
      } else {
        toast({ title: 'WhatsApp not connected', description: 'Go to WhatsApp in the sidebar and scan the QR code first.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Send failed', description: 'Could not open WhatsApp. Please try again.', variant: 'destructive' });
    } finally {
      setSending(null);
    }
  };

  const stats = useMemo(() => ({
    total: templates.length,
    active: templates.filter(t => t.isActive).length,
    sentToday: logs.filter(l => l.sentAt.startsWith(format(new Date(), 'yyyy-MM-dd'))).length,
    sentThisMonth: logs.filter(l => l.sentAt.startsWith(format(new Date(), 'yyyy-MM'))).length,
  }), [templates, logs]);

  const upcomingBirthdays = useMemo(() => {
    const now = new Date();
    return members.filter(m => {
      if (!m.dateOfBirth) return false;
      const bday = new Date(m.dateOfBirth);
      const next = new Date(now.getFullYear(), bday.getMonth(), bday.getDate());
      if (next < now) next.setFullYear(now.getFullYear() + 1);
      const diff = (next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return diff <= 7;
    }).sort((a, b) => {
      const now2 = new Date();
      const getNext = (d: string) => { const bd = new Date(d); const n = new Date(now2.getFullYear(), bd.getMonth(), bd.getDate()); if (n < now2) n.setFullYear(now2.getFullYear() + 1); return n; };
      return getNext(a.dateOfBirth!).getTime() - getNext(b.dateOfBirth!).getTime();
    }).slice(0, 5);
  }, [members]);

  const upcomingEvents = useMemo(() => events.filter(e => {
    const d = new Date(e.date);
    const now = new Date();
    return d >= now && d <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  }).slice(0, 5), [events]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold text-navy-900 dark:text-cream mb-1">Automation</h1>
          <p className="text-sm text-muted-foreground">Automated reminders, birthday greetings, and event notifications</p>
        </div>
        <Button size="sm" onClick={openAddTemplate} className="gap-2 bg-white hover:bg-gray-50 text-navy-900 font-medium shrink-0">
          <Plus className="w-4 h-4" /> New Template
        </Button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Templates', value: stats.total, icon: BellRing, color: 'text-gold-500' },
          { label: 'Active', value: stats.active, icon: Zap, color: 'text-sage-500' },
          { label: 'Sent Today', value: stats.sentToday, icon: CheckCircle2, color: 'text-blue-500' },
          { label: 'Sent This Month', value: stats.sentThisMonth, icon: Calendar, color: 'text-purple-500' },
        ].map(s => (
          <Card key={s.label} className="glass border-none shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center">
                <s.icon className={cn('w-5 h-5', s.color)} />
              </div>
              <div>
                <p className="text-xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="templates">
        <TabsList className="glass border-none">
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="settings">Quick Settings</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="logs">Logs ({logs.length})</TabsTrigger>
        </TabsList>

        {/* ── Templates Tab ── */}
        <TabsContent value="templates" className="space-y-4 mt-4">
          {templates.length === 0 ? (
            <div className="glass rounded-xl border border-dashed border-border p-16 text-center">
              <BellRing className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-muted-foreground text-sm">No templates yet. Create your first reminder template.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map(t => {
                const TypeIcon = TYPE_ICONS[t.type];
                const ChanIcon = CHANNEL_ICONS[t.channel];
                const isSending = sending === t.id;
                return (
                  <Card key={t.id} className={cn('glass border-none shadow-sm transition-all', t.isActive ? '' : 'opacity-60')}>
                    <CardHeader className="pb-2 pt-4 px-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                            <TypeIcon className="w-4 h-4 text-gold-500" />
                          </div>
                          <div>
                            <CardTitle className="text-sm font-semibold">{t.name}</CardTitle>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <ChanIcon className={cn('w-3 h-3', CHANNEL_COLORS[t.channel])} />
                              <span className="text-[10px] text-muted-foreground">{t.channel} · {t.type}</span>
                              {t.daysBeforeEvent > 0 && <span className="text-[10px] text-muted-foreground">· {t.daysBeforeEvent}d before</span>}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleToggleTemplate(t.id)}
                          className="shrink-0 mt-0.5"
                          aria-label={t.isActive ? 'Disable' : 'Enable'}
                        >
                          {t.isActive
                            ? <ToggleRight className="w-6 h-6 text-sage-500" />
                            : <ToggleLeft className="w-6 h-6 text-muted-foreground" />
                          }
                        </button>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-3">
                      <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/30 rounded-lg p-2 font-mono">{t.body}</p>
                      <div className="flex items-center gap-2">
                        {(t.type === 'Birthday' || t.type === 'Anniversary') && (
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 flex-1" onClick={() => handleSendNow(t)} disabled={isSending || !t.isActive}>
                            {isSending ? <div className="w-3 h-3 rounded-full border border-current border-t-transparent animate-spin" /> : <Play className="w-3 h-3" />}
                            Send Now
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditTemplate(t)}><Pencil className="w-3 h-3" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteTemplate(t.id)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Quick Settings Tab ── */}
        <TabsContent value="settings" className="space-y-4 mt-4">
          <Card className="glass border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">WhatsApp Automation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'birthdayEnabled' as const, label: 'Auto Birthday Greetings', desc: 'Automatically send birthday wishes to members on their birthday via WhatsApp.' },
                { key: 'anniversaryEnabled' as const, label: 'Auto Church Anniversaries', desc: 'Automatically send anniversary messages to members on their church join anniversary.' },
              ].map(item => (
                <div key={item.key} className="flex items-start justify-between gap-4 p-3 rounded-lg bg-muted/30">
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                  <button
                    onClick={() => saveBwa({ ...bwaSettings, [item.key]: !bwaSettings[item.key] })}
                    className="shrink-0 mt-0.5"
                  >
                    {bwaSettings[item.key]
                      ? <ToggleRight className="w-7 h-7 text-sage-500" />
                      : <ToggleLeft className="w-7 h-7 text-muted-foreground" />
                    }
                  </button>
                </div>
              ))}
              <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
                <strong>Note:</strong> Auto-send runs once per day when the dashboard loads, and only when WhatsApp is connected. Messages use the Birthday / Anniversary templates above.
              </p>
            </CardContent>
          </Card>

          <Card className="glass border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Channels Available</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { icon: MessageCircle, label: 'WhatsApp', desc: 'Via WhatsApp server (Baileys). Requires WhatsApp connected in Communication.', color: 'text-green-500', available: true },
                { icon: Smartphone, label: 'SMS', desc: 'Via mNotify SMS gateway. Configure API key in Settings → Communication.', color: 'text-blue-500', available: true },
                { icon: Mail, label: 'Email', desc: 'Email integration — configure SMTP credentials in Settings.', color: 'text-orange-500', available: false },
              ].map(ch => (
                <div key={ch.label} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <ch.icon className={cn('w-5 h-5 shrink-0', ch.color)} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{ch.label}</p>
                    <p className="text-xs text-muted-foreground">{ch.desc}</p>
                  </div>
                  <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', ch.available ? 'bg-sage-500/10 text-sage-700 border-sage-200' : 'bg-muted text-muted-foreground border-border')}>
                    {ch.available ? 'Available' : 'Coming Soon'}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Upcoming Tab ── */}
        <TabsContent value="upcoming" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="glass border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><Gift className="w-4 h-4 text-gold-500" /> Upcoming Birthdays (7 days)</CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingBirthdays.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No birthdays in the next 7 days.</p>
                ) : (
                  <div className="space-y-2">
                    {upcomingBirthdays.map(m => {
                      const bday = new Date(m.dateOfBirth!);
                      const next = new Date(new Date().getFullYear(), bday.getMonth(), bday.getDate());
                      if (next < new Date()) next.setFullYear(new Date().getFullYear() + 1);
                      const diff = Math.ceil((next.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                      return (
                        <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                          <div className="w-8 h-8 rounded-full bg-gold-500/10 flex items-center justify-center text-gold-600 text-xs font-bold">
                            {`${m.firstName[0]}${m.lastName[0]}`.toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{m.firstName} {m.lastName}</p>
                            <p className="text-xs text-muted-foreground">{format(next, 'MMM d')}</p>
                          </div>
                          <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', diff === 0 ? 'bg-gold-500/20 text-gold-600' : 'bg-muted text-muted-foreground')}>
                            {diff === 0 ? 'Today!' : `In ${diff}d`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="glass border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><Calendar className="w-4 h-4 text-blue-500" /> Upcoming Events (7 days)</CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No events in the next 7 days.</p>
                ) : (
                  <div className="space-y-2">
                    {upcomingEvents.map(e => {
                      const diff = Math.ceil((new Date(e.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                      return (
                        <div key={e.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <Calendar className="w-4 h-4 text-blue-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{e.title}</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(e.date), 'MMM d')} at {e.time}</p>
                          </div>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {diff === 0 ? 'Today' : `In ${diff}d`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Logs Tab ── */}
        <TabsContent value="logs" className="space-y-4 mt-4">
          {logs.length === 0 ? (
            <div className="glass rounded-xl border border-dashed border-border p-16 text-center">
              <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-muted-foreground text-sm">No notifications sent yet.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-1">
                <p className="text-sm text-muted-foreground">{logs.length} notifications in history</p>
                <Button variant="outline" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => { saveLogs([]); toast({ title: 'Logs cleared' }); }}>Clear Logs</Button>
              </div>
              <Card className="glass border-none shadow-sm">
                <div className="divide-y divide-border/50">
                  {logs.slice(0, 50).map(log => {
                    const ChanIcon = CHANNEL_ICONS[log.channel];
                    const isToday = log.sentAt.startsWith(format(new Date(), 'yyyy-MM-dd'));
                    const isThisWeek = log.sentAt >= format(subDays(new Date(), 7), 'yyyy-MM-dd');
                    return (
                      <div key={log.id} className="flex items-start gap-3 px-4 py-3">
                        <ChanIcon className={cn('w-4 h-4 shrink-0 mt-0.5', CHANNEL_COLORS[log.channel])} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium">{log.recipientName}</p>
                            <span className="text-xs text-muted-foreground">{log.recipientContact}</span>
                            {log.templateName && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{log.templateName}</span>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{log.message}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {isToday ? `Today, ${format(new Date(log.sentAt), 'h:mm a')}` : isThisWeek ? format(new Date(log.sentAt), 'EEE, MMM d') : format(new Date(log.sentAt), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0', STATUS_STYLES[log.status])}>
                          {log.status === 'Sent' ? <CheckCircle2 className="w-3 h-3 inline mr-0.5" /> : <XCircle className="w-3 h-3 inline mr-0.5" />}
                          {log.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Template Dialog */}
      <Dialog open={templateDialog} onOpenChange={setTemplateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{editingTemplate ? 'Edit Template' : 'New Template'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label>Template Name *</Label>
                <Input value={tForm.name} onChange={e => setTForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Birthday Greeting" />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={tForm.type} onValueChange={v => setTForm(f => ({ ...f, type: v as ReminderType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{REMINDER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Channel</Label>
                <Select value={tForm.channel} onValueChange={v => setTForm(f => ({ ...f, channel: v as ReminderChannel }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CHANNELS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Days Before Event</Label>
                <Input type="number" min={0} value={tForm.daysBeforeEvent} onChange={e => setTForm(f => ({ ...f, daysBeforeEvent: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Subject (Email only)</Label>
                <Input value={tForm.subject ?? ''} onChange={e => setTForm(f => ({ ...f, subject: e.target.value }))} placeholder="Email subject…" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Message Body *</Label>
              <textarea
                className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                value={tForm.body}
                onChange={e => setTForm(f => ({ ...f, body: e.target.value }))}
                placeholder="Write your message…"
              />
              <div className="flex flex-wrap gap-1 mt-1">
                <span className="text-[10px] text-muted-foreground mr-1">Placeholders:</span>
                {(PLACEHOLDERS[tForm.type] ?? []).map(p => (
                  <button key={p} type="button"
                    className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground hover:bg-muted/70 font-mono"
                    onClick={() => setTForm(f => ({ ...f, body: f.body + p }))}
                  >{p}</button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveTemplate} className="bg-white hover:bg-gray-50 text-navy-900 font-medium">
              {editingTemplate ? 'Save Changes' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
