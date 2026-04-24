import { useState } from 'react';
import { motion } from 'framer-motion';
import { useData } from '@/context/DataContext';
import type { PrayerRequest, PrayerCategory } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Heart, CheckCircle, Lock, Pencil, Trash2, Search } from 'lucide-react';
import { format } from 'date-fns';

const CATEGORY_COLORS: Record<PrayerCategory, string> = {
  Health:    'bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/50',
  Family:    'bg-sage-500/10 text-sage-700 dark:text-sage-400 border-sage-200 dark:border-sage-800/50',
  Finance:   'bg-gold-500/10 text-gold-700 dark:text-gold-400 border-gold-200 dark:border-gold-800/50',
  Spiritual: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/50',
  Work:      'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/50',
  Other:     'bg-muted text-muted-foreground border-border',
};

const EMPTY_FORM = { memberId: '', title: '', body: '', category: 'Spiritual' as PrayerCategory, isPrivate: false };

export default function PrayerRequests() {
  const { prayerRequests, members, addPrayerRequest, updatePrayerRequest, deletePrayerRequest } = useData();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PrayerRequest | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [answerDialogId, setAnswerDialogId] = useState<string | null>(null);
  const [answeredNote, setAnsweredNote] = useState('');

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setDialogOpen(true); };
  const openEdit = (r: PrayerRequest) => {
    setEditing(r);
    setForm({ memberId: r.memberId ?? '', title: r.title, body: r.body, category: r.category, isPrivate: r.isPrivate });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast({ title: 'Validation error', description: 'Title and body are required.', variant: 'destructive' });
      return;
    }
    if (editing) {
      updatePrayerRequest({ ...editing, ...form, memberId: form.memberId || undefined });
      toast({ title: 'Request updated', description: `"${form.title}" has been updated.` });
    } else {
      addPrayerRequest({ id: `pr${Date.now()}`, ...form, memberId: form.memberId || undefined, isAnswered: false, createdAt: format(new Date(), 'yyyy-MM-dd') });
      toast({ title: 'Request added', description: `"${form.title}" has been added to the prayer board.` });
    }
    setDialogOpen(false);
  };

  const handleMarkAnswered = (req: PrayerRequest) => {
    updatePrayerRequest({ ...req, isAnswered: true, answeredNote: answeredNote.trim() || undefined });
    toast({ title: 'Marked as answered', description: `"${req.title}" — praise the Lord! 🙏` });
    setAnswerDialogId(null);
    setAnsweredNote('');
  };

  const handleDelete = (req: PrayerRequest) => {
    deletePrayerRequest(req.id);
    toast({ title: 'Request removed', description: `"${req.title}" has been deleted.` });
  };

  const getSubmitter = (req: PrayerRequest) => {
    if (req.memberId) {
      const m = members.find(x => x.id === req.memberId);
      return m ? `${m.firstName} ${m.lastName}` : 'Unknown Member';
    }
    return 'Anonymous';
  };

  const filterRequests = (list: PrayerRequest[]) =>
    list.filter(r => {
      const submitter = getSubmitter(r).toLowerCase();
      const q = search.toLowerCase();
      return r.title.toLowerCase().includes(q) || r.body.toLowerCase().includes(q) || submitter.includes(q);
    });

  const openRequests = prayerRequests.filter(r => !r.isAnswered);
  const answeredRequests = prayerRequests.filter(r => r.isAnswered);

  const RequestCard = ({ req }: { req: PrayerRequest }) => (
    <Card className="glass border-none shadow-sm hover:shadow-md transition-all">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${CATEGORY_COLORS[req.category]}`}>{req.category}</span>
            {req.isPrivate && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border bg-muted text-muted-foreground border-border"><Lock className="w-2.5 h-2.5" /> Private</span>}
            {req.isAnswered && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border bg-sage-500/10 text-sage-700 dark:text-sage-400 border-sage-200 dark:border-sage-800/50"><CheckCircle className="w-2.5 h-2.5" /> Answered</span>}
          </div>
          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(req)}><Pencil className="w-3 h-3" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(req)}><Trash2 className="w-3 h-3" /></Button>
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-sm mb-1">{req.title}</h3>
          <p className="text-xs text-muted-foreground line-clamp-3">{req.body}</p>
        </div>

        {req.answeredNote && (
          <div className="p-2 rounded-md bg-sage-500/5 border border-sage-200 dark:border-sage-800/40">
            <p className="text-xs text-sage-700 dark:text-sage-400"><strong>Testimony: </strong>{req.answeredNote}</p>
          </div>
        )}

        <div className="flex items-center justify-between pt-1 border-t border-border/30">
          <p className="text-[11px] text-muted-foreground">{req.isPrivate ? <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> Private request</span> : getSubmitter(req)} · {format(new Date(req.createdAt), 'MMM d, yyyy')}</p>
          {!req.isAnswered && (
            <Button variant="ghost" size="sm" className="h-7 text-xs text-sage-600 dark:text-sage-400 hover:text-sage-700" onClick={() => { setAnswerDialogId(req.id); setAnsweredNote(''); }}>
              <CheckCircle className="w-3 h-3 mr-1" /> Mark Answered
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold text-navy-900 dark:text-cream mb-1">Prayer Requests</h1>
          <p className="text-sm text-muted-foreground">{openRequests.length} open · {answeredRequests.length} answered</p>
        </div>
        <Button size="sm" onClick={openAdd} className="gap-2 bg-white hover:bg-gray-50 text-navy-900 font-medium">
          <Plus className="w-4 h-4" /> Add Request
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Requests', value: prayerRequests.length, color: 'text-navy-500 dark:text-navy-300' },
          { label: 'Open', value: openRequests.length, color: 'text-blue-500' },
          { label: 'Answered', value: answeredRequests.length, color: 'text-sage-500' },
          { label: 'Private', value: prayerRequests.filter(r => r.isPrivate).length, color: 'text-muted-foreground' },
        ].map(s => (
          <Card key={s.label} className="glass border-none shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <Heart className={`w-5 h-5 shrink-0 ${s.color}`} />
              <div>
                <p className="text-xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search requests…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Tabs defaultValue="open">
        <TabsList className="mb-6">
          <TabsTrigger value="open">Open ({openRequests.length})</TabsTrigger>
          <TabsTrigger value="answered">Answered ({answeredRequests.length})</TabsTrigger>
          <TabsTrigger value="all">All ({prayerRequests.length})</TabsTrigger>
        </TabsList>

        {(['open', 'answered', 'all'] as const).map(tab => {
          const list = tab === 'open' ? openRequests : tab === 'answered' ? answeredRequests : prayerRequests;
          const filtered = filterRequests(list);
          return (
            <TabsContent key={tab} value={tab} className="mt-0">
              {filtered.length === 0 ? (
                <div className="glass rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
                  {search ? 'No requests match your search.' : `No ${tab === 'all' ? '' : tab} requests yet.`}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filtered.map(r => <RequestCard key={r.id} req={r} />)}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{editing ? 'Edit Request' : 'Add Prayer Request'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Member (optional)</Label>
              <Select value={form.memberId || 'anon'} onValueChange={v => setForm(f => ({ ...f, memberId: v === 'anon' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Anonymous" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="anon">Anonymous</SelectItem>
                  {members.map(m => <SelectItem key={m.id} value={m.id}>{m.firstName} {m.lastName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input placeholder="e.g. Healing for my family" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Prayer Request *</Label>
              <Textarea rows={4} placeholder="Share the prayer need…" value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v as PrayerCategory }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['Health', 'Family', 'Finance', 'Spiritual', 'Work', 'Other'] as PrayerCategory[]).map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-muted/20">
              <div>
                <p className="text-sm font-medium">Private Request</p>
                <p className="text-xs text-muted-foreground">Only admins can see this request</p>
              </div>
              <Switch checked={form.isPrivate} onCheckedChange={v => setForm(f => ({ ...f, isPrivate: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-white hover:bg-gray-50 text-navy-900 font-medium">{editing ? 'Save Changes' : 'Add Request'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Answered Dialog */}
      <Dialog open={!!answerDialogId} onOpenChange={() => { setAnswerDialogId(null); setAnsweredNote(''); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Mark as Answered</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">Optionally share a testimony of how God answered this prayer.</p>
            <Textarea rows={3} placeholder="Share the testimony (optional)…" value={answeredNote} onChange={e => setAnsweredNote(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAnswerDialogId(null)}>Cancel</Button>
            <Button onClick={() => { const req = prayerRequests.find(r => r.id === answerDialogId); if (req) handleMarkAnswered(req); }} className="bg-white hover:bg-gray-50 text-navy-900 font-medium">
              <CheckCircle className="w-4 h-4 mr-2" /> Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
