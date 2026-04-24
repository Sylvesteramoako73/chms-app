import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useData } from '@/context/DataContext';
import { useRole } from '@/context/RoleContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Send, Clock, Mail, MessageSquare, Megaphone, CheckCircle, Loader2, AlertCircle, Wifi } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { API_BASE } from '@/lib/api';

// WhatsApp icon as inline SVG to avoid extra dependencies
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

interface Message {
  id: number;
  subject: string;
  channel: string;
  recipient: string;
  status: 'Sent' | 'Scheduled' | 'Draft';
  date: string;
}

const INITIAL_HISTORY: Message[] = [
  { id: 1, subject: 'Sunday Service Reminder', channel: 'SMS', recipient: 'All Members', status: 'Sent', date: format(subDays(new Date(), 5), 'MMM d, yyyy') },
  { id: 2, subject: 'Upcoming Youth Conference', channel: 'Email', recipient: 'Youth Dept', status: 'Scheduled', date: format(subDays(new Date(), 2), 'MMM d, yyyy') },
  { id: 3, subject: 'Weekly Newsletter — April', channel: 'Email', recipient: 'All Members', status: 'Draft', date: format(new Date(), 'MMM d, yyyy') },
  { id: 4, subject: 'Midweek Prayer Meeting', channel: 'WhatsApp', recipient: 'All Members', status: 'Sent', date: format(subDays(new Date(), 7), 'MMM d, yyyy') },
];

const STATUS_STYLES: Record<string, string> = {
  Sent: 'bg-sage-500/10 text-sage-700 dark:text-sage-400 border-sage-200 dark:border-sage-800/40',
  Scheduled: 'bg-gold-500/10 text-gold-700 dark:text-gold-400 border-gold-200 dark:border-gold-800/40',
  Draft: 'bg-muted text-muted-foreground border-border',
};

function ChannelIcon({ channel, className }: { channel: string; className?: string }) {
  if (channel === 'Email') return <Mail className={className} />;
  if (channel === 'SMS') return <MessageSquare className={className} />;
  if (channel === 'WhatsApp') return <WhatsAppIcon className={className} />;
  return <Megaphone className={className} />;
}

export default function Communication() {
  const { departments, members } = useData();
  const { actions } = useRole();
  const { toast } = useToast();

  const [recipient, setRecipient] = useState('all');
  const [channel, setChannel] = useState('email');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [history, setHistory] = useState<Message[]>(INITIAL_HISTORY);

  const getRecipientLabel = (val: string) => {
    if (val === 'all') return 'All Members';
    if (val === 'active') return 'Active Members';
    const dept = departments.find(d => `dept_${d.id}` === val);
    return dept ? `${dept.name} Dept` : val;
  };

  const getRecipientCount = (val: string) => {
    if (val === 'all') return members.length;
    if (val === 'active') return members.filter(m => m.status === 'Active').length;
    const deptId = val.replace('dept_', '');
    return members.filter(m => m.departmentId === deptId).length;
  };

  const getRecipientPhones = (val: string): string[] => {
    let group = members;
    if (val === 'active') group = members.filter(m => m.status === 'Active');
    else if (val.startsWith('dept_')) {
      const deptId = val.replace('dept_', '');
      group = members.filter(m => m.departmentId === deptId);
    }
    return group.map(m => m.phone).filter(Boolean);
  };

  const [waSending, setWaSending] = useState(false);
  const [waStatus, setWaStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');

  useEffect(() => {
    fetch(`${API_BASE}/api/whatsapp/status`)
      .then(r => r.json())
      .then(d => setWaStatus(d.status === 'connected' ? 'connected' : 'disconnected'))
      .catch(() => setWaStatus('disconnected'));
  }, []);

  const sendViaSMS = async (phones: string[], text: string) => {
    if (phones.length === 0) {
      toast({ title: 'No phone numbers', description: 'None of the selected recipients have a phone number.', variant: 'destructive' });
      return false;
    }

    let smsSettings = { apiKey: '', senderId: 'ChurchCare' };
    try { smsSettings = { ...smsSettings, ...JSON.parse(localStorage.getItem('chms_sms_settings') ?? '{}') }; }
    catch { /* use defaults */ }

    if (!smsSettings.apiKey.trim()) {
      toast({ title: 'SMS not configured', description: 'Go to Settings → Preferences and enter your mNotify API key.', variant: 'destructive' });
      return false;
    }

    function normaliseMsisdn(raw: string): string {
      let n = raw.replace(/\D/g, '');
      if (n.startsWith('00')) n = n.slice(2);
      if (n.startsWith('0')) n = '233' + n.slice(1);
      if (!n.startsWith('233')) n = '233' + n;
      return n;
    }
    const normalised = phones.map(normaliseMsisdn).filter(n => n.length >= 11);
    if (normalised.length === 0) {
      toast({ title: 'No valid phone numbers', description: 'Ensure phone numbers are valid Ghana numbers.', variant: 'destructive' });
      return false;
    }

    setWaSending(true);
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
      const data = await response.json();
      if (data.status === 'success' || data.code === 1000) {
        toast({ title: 'SMS sent!', description: `${normalised.length} message${normalised.length !== 1 ? 's' : ''} delivered via mNotify.` });
        return true;
      }
      const hint = data.code === 1004 ? ' Check your API key in Settings.' : data.code === 1006 ? ' Top up your mNotify balance.' : '';
      throw new Error((data.message ?? `mNotify error ${data.code}`) + hint);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast({ title: 'SMS failed', description: msg, variant: 'destructive' });
      return false;
    } finally {
      setWaSending(false);
    }
  };

  const sendViaWhatsApp = async (phones: string[], text: string) => {
    if (phones.length === 0) {
      toast({ title: 'No phone numbers', description: 'None of the selected recipients have a phone number.', variant: 'destructive' });
      return false;
    }
    setWaSending(true);
    try {
      const res = await fetch(`${API_BASE}/api/whatsapp/send-bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numbers: phones, message: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Send failed');
      toast({ title: 'WhatsApp messages sent', description: `${data.sent} delivered, ${data.failed} failed.` });
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      if (msg.includes('not connected')) {
        toast({ title: 'WhatsApp not connected', description: 'Go to Settings → WhatsApp to scan the QR code first.', variant: 'destructive' });
      } else {
        toast({ title: 'Send failed', description: msg, variant: 'destructive' });
      }
      return false;
    } finally {
      setWaSending(false);
    }
  };

  const handleSend = async (msgStatus: 'Sent' | 'Scheduled' | 'Draft') => {
    if (!actions.canSendMessages) {
      toast({ title: 'Access denied', description: 'Your role cannot send messages.', variant: 'destructive' });
      return;
    }
    if (!subject.trim()) { toast({ title: 'Subject required', description: 'Please enter a message subject.', variant: 'destructive' }); return; }
    if (!message.trim() && msgStatus !== 'Draft') { toast({ title: 'Message required', description: 'Please write a message body.', variant: 'destructive' }); return; }

    const channelLabel = channel === 'email' ? 'Email' : channel === 'sms' ? 'SMS' : channel === 'whatsapp' ? 'WhatsApp' : 'In-App';

    if (msgStatus === 'Sent') {
      if (channel === 'sms') {
        const phones = getRecipientPhones(recipient);
        const fullText = `${subject}\n\n${message}`;
        const ok = await sendViaSMS(phones, fullText);
        if (!ok) return;
      } else if (channel === 'whatsapp') {
        const phones = whatsappNumber ? [whatsappNumber] : getRecipientPhones(recipient);
        const fullText = `${subject}\n\n${message}`;
        const ok = await sendViaWhatsApp(phones, fullText);
        if (!ok) return;
      }
    }

    const newMsg: Message = {
      id: Date.now(),
      subject,
      channel: channelLabel,
      recipient: getRecipientLabel(recipient),
      status: msgStatus,
      date: format(new Date(), 'MMM d, yyyy'),
    };
    setHistory(h => [newMsg, ...h]);
    const count = getRecipientCount(recipient);
    const toastMsg: Record<string, string> = {
      Sent: `Message sent to ${count} recipients via ${channelLabel}.`,
      Scheduled: 'Message has been scheduled for delivery.',
      Draft: 'Message saved as draft.',
    };
    if (channel !== 'whatsapp') {
      toast({ title: msgStatus === 'Sent' ? 'Message sent!' : msgStatus === 'Scheduled' ? 'Message scheduled' : 'Draft saved', description: toastMsg[msgStatus] });
    }
    setSubject('');
    setMessage('');
    setWhatsappNumber('');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div>
        <h1 className="text-4xl font-display font-bold text-navy-900 dark:text-cream mb-1">Communication</h1>
        <p className="text-sm text-muted-foreground">Send messages and announcements to the congregation.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Sent', value: history.filter(m => m.status === 'Sent').length, icon: CheckCircle, color: 'text-sage-500' },
          { label: 'Scheduled', value: history.filter(m => m.status === 'Scheduled').length, icon: Clock, color: 'text-gold-500' },
          { label: 'Drafts', value: history.filter(m => m.status === 'Draft').length, icon: Mail, color: 'text-muted-foreground' },
          { label: 'Total Reach', value: members.length, icon: Megaphone, color: 'text-navy-500 dark:text-navy-300' },
        ].map(stat => (
          <Card key={stat.label} className="glass border-none shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <stat.icon className={`w-5 h-5 shrink-0 ${stat.color}`} />
              <div>
                <p className="text-xl font-bold leading-tight">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Compose */}
        <Card className="glass border-none shadow-sm lg:col-span-3">
          <CardHeader>
            <CardTitle>Compose Message</CardTitle>
            <CardDescription>Send via Email, SMS, WhatsApp, or In-App notification</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>To</Label>
                <Select value={recipient} onValueChange={setRecipient}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Members ({members.length})</SelectItem>
                    <SelectItem value="active">Active Members ({members.filter(m => m.status === 'Active').length})</SelectItem>
                    {departments.map(d => (
                      <SelectItem key={d.id} value={`dept_${d.id}`}>{d.name} ({members.filter(m => m.departmentId === d.id).length})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Channel</Label>
                <Select value={channel} onValueChange={setChannel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email"><div className="flex items-center gap-2"><Mail className="w-4 h-4" /> Email</div></SelectItem>
                    <SelectItem value="sms"><div className="flex items-center gap-2"><MessageSquare className="w-4 h-4" /> SMS</div></SelectItem>
                    <SelectItem value="whatsapp">
                      <div className="flex items-center gap-2"><WhatsAppIcon className="w-4 h-4 text-green-500" /> WhatsApp</div>
                    </SelectItem>
                    <SelectItem value="inapp"><div className="flex items-center gap-2"><Megaphone className="w-4 h-4" /> In-App</div></SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* WhatsApp extra field */}
            {channel === 'whatsapp' && (
              <div className="p-3 rounded-lg border border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-950/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <WhatsAppIcon className="w-4 h-4 text-green-600" />
                    <p className="text-sm font-medium text-green-800 dark:text-green-300">WhatsApp — Direct Send</p>
                  </div>
                  <span className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${waStatus === 'connected' ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-400 dark:border-green-800' : 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800'}`}>
                    {waStatus === 'connected' ? <Wifi className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                    {waStatus === 'connected' ? 'Connected' : 'Not connected'}
                  </span>
                </div>
                {waStatus !== 'connected' && (
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Go to <strong>Settings → WhatsApp</strong> and scan the QR code to enable direct sending.
                  </p>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs">Override Phone Number (optional)</Label>
                  <Input
                    placeholder="e.g. +233201234567 (leave blank to use recipient phone numbers)"
                    value={whatsappNumber}
                    onChange={e => setWhatsappNumber(e.target.value)}
                    className="text-sm"
                  />
                  <p className="text-[11px] text-green-700 dark:text-green-500">
                    Messages will be sent to {whatsappNumber ? '1 custom number' : `${getRecipientPhones(recipient).length} recipient${getRecipientPhones(recipient).length !== 1 ? 's' : ''} with phone numbers`}.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Input placeholder="Message subject…" value={subject} onChange={e => setSubject(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Message</Label>
              <Textarea rows={6} placeholder="Type your message here…" value={message} onChange={e => setMessage(e.target.value)} />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
              <Button variant="outline" size="sm" onClick={() => handleSend('Draft')}>Save Draft</Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => handleSend('Scheduled')}>
                <Clock className="w-4 h-4" /> Schedule
              </Button>
              <Button
                size="sm"
                onClick={() => handleSend('Sent')}
                disabled={!actions.canSendMessages || waSending}
                className={`gap-2 ${channel === 'whatsapp' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-white hover:bg-gray-50 text-navy-900 font-medium'}`}
              >
                {waSending
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : channel === 'whatsapp' ? <WhatsAppIcon className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                {waSending ? 'Sending…' : channel === 'whatsapp' ? 'Send via WhatsApp' : 'Send Now'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Message History */}
        <Card className="glass border-none shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle>Message History</CardTitle>
            <CardDescription>{history.length} communications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {history.map(msg => (
                <div key={msg.id} className="p-3 rounded-lg bg-muted/30 border border-border/40 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${STATUS_STYLES[msg.status]}`}>
                      {msg.status}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{msg.date}</span>
                  </div>
                  <p className="text-sm font-semibold leading-tight">{msg.subject}</p>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <ChannelIcon channel={msg.channel} className={`w-3 h-3 ${msg.channel === 'WhatsApp' ? 'text-green-500' : ''}`} />
                    <span className={msg.channel === 'WhatsApp' ? 'text-green-600 dark:text-green-400 font-medium' : ''}>{msg.channel}</span>
                    <span>·</span>
                    <span>{msg.recipient}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
