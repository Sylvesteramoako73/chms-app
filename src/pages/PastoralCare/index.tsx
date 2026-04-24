import { useState } from 'react';
import { motion } from 'framer-motion';
import { useData } from '@/context/DataContext';
import type { PastoralVisit, VisitType } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, HeartHandshake, CheckCircle, Bell, Pencil, Trash2, Search, AlertTriangle } from 'lucide-react';
import { format, parseISO, isAfter } from 'date-fns';

const VISIT_COLORS: Record<VisitType, string> = {
  'Home Visit':     'bg-sage-500/10 text-sage-700 dark:text-sage-400 border-sage-200 dark:border-sage-800/50',
  'Hospital Visit': 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/50',
  'Phone Call':     'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/50',
  'Counseling':     'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/50',
  'Follow-up':      'bg-gold-500/10 text-gold-700 dark:text-gold-400 border-gold-200 dark:border-gold-800/50',
};

const EMPTY_FORM = {
  memberId: '',
  visitType: 'Home Visit' as VisitType,
  date: format(new Date(), 'yyyy-MM-dd'),
  conductedBy: 'Pastor James',
  notes: '',
  followUpDate: '',
  followUpComplete: false,
};

export default function PastoralCare() {
  const { pastoralVisits, members, addPastoralVisit, updatePastoralVisit, deletePastoralVisit } = useData();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PastoralVisit | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setDialogOpen(true); };
  const openEdit = (v: PastoralVisit) => {
    setEditing(v);
    setForm({ memberId: v.memberId, visitType: v.visitType, date: v.date, conductedBy: v.conductedBy, notes: v.notes ?? '', followUpDate: v.followUpDate ?? '', followUpComplete: v.followUpComplete });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.memberId || !form.date || !form.conductedBy.trim()) {
      toast({ title: 'Validation error', description: 'Member, date, and conducted by are required.', variant: 'destructive' });
      return;
    }
    const base = { memberId: form.memberId, visitType: form.visitType, date: form.date, conductedBy: form.conductedBy, notes: form.notes || undefined, followUpDate: form.followUpDate || undefined, followUpComplete: form.followUpComplete };
    if (editing) {
      updatePastoralVisit({ ...editing, ...base });
      toast({ title: 'Visit updated' });
    } else {
      addPastoralVisit({ id: `pv${Date.now()}`, ...base });
      toast({ title: 'Visit logged', description: `${form.visitType} recorded.` });
    }
    setDialogOpen(false);
  };

  const markFollowUpDone = (visit: PastoralVisit) => {
    updatePastoralVisit({ ...visit, followUpComplete: true });
    toast({ title: 'Follow-up complete', description: 'Follow-up marked as done.' });
  };

  const getMemberName = (memberId: string) => {
    const m = members.find(x => x.id === memberId);
    return m ? `${m.firstName} ${m.lastName}` : 'Unknown';
  };

  const today = new Date();
  const pendingFollowUps = pastoralVisits.filter(v => !v.followUpComplete && v.followUpDate);
  const overdueFollowUps = pendingFollowUps.filter(v => !isAfter(new Date(v.followUpDate!), today));
  const thisMonthVisits = pastoralVisits.filter(v => {
    const d = new Date(v.date);
    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  });
  const uniqueMembers = new Set(pastoralVisits.map(v => v.memberId)).size;

  const filterVisits = (list: PastoralVisit[]) =>
    list.filter(v => {
      const name = getMemberName(v.memberId).toLowerCase();
      const q = search.toLowerCase();
      return name.includes(q) || v.conductedBy.toLowerCase().includes(q) || v.visitType.toLowerCase().includes(q);
    });

  const VisitRow = ({ v }: { v: PastoralVisit }) => (
    <TableRow className="hover:bg-muted/20 border-border/30 transition-colors">
      <TableCell className="pl-6 text-sm font-medium">{format(parseISO(v.date), 'MMM d, yyyy')}</TableCell>
      <TableCell className="text-sm font-medium">{getMemberName(v.memberId)}</TableCell>
      <TableCell>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${VISIT_COLORS[v.visitType]}`}>{v.visitType}</span>
      </TableCell>
      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{v.conductedBy}</TableCell>
      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
        {v.followUpDate ? (
          <span className={v.followUpComplete ? 'line-through opacity-50' : (!isAfter(new Date(v.followUpDate), today) ? 'text-red-500 dark:text-red-400 font-medium' : '')}>
            {format(new Date(v.followUpDate), 'MMM d, yyyy')}
            {!v.followUpComplete && !isAfter(new Date(v.followUpDate), today) && ' ⚠'}
          </span>
        ) : '—'}
      </TableCell>
      <TableCell>
        {v.followUpDate ? (
          v.followUpComplete
            ? <span className="inline-flex items-center gap-1 text-xs text-sage-600 dark:text-sage-400"><CheckCircle className="w-3 h-3" /> Done</span>
            : <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => markFollowUpDone(v)}><CheckCircle className="w-3 h-3" /> Done</Button>
        ) : '—'}
      </TableCell>
      <TableCell className="text-right pr-6">
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(v)}><Pencil className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => { deletePastoralVisit(v.id); toast({ title: 'Visit deleted' }); }}><Trash2 className="w-3.5 h-3.5" /></Button>
        </div>
      </TableCell>
    </TableRow>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold text-navy-900 dark:text-cream mb-1">Pastoral Care</h1>
          <p className="text-sm text-muted-foreground">Track visits, calls, and follow-ups for your congregation.</p>
        </div>
        <Button size="sm" onClick={openAdd} className="gap-2 bg-white hover:bg-gray-50 text-navy-900 font-medium">
          <Plus className="w-4 h-4" /> Log Visit
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Visits', value: pastoralVisits.length, icon: HeartHandshake, color: 'text-sage-500' },
          { label: 'Follow-ups Due', value: pendingFollowUps.length, icon: Bell, color: overdueFollowUps.length > 0 ? 'text-red-500' : 'text-gold-500' },
          { label: 'This Month', value: thisMonthVisits.length, icon: CheckCircle, color: 'text-blue-500' },
          { label: 'Members Visited', value: uniqueMembers, icon: AlertTriangle, color: 'text-navy-500 dark:text-navy-300' },
        ].map(s => (
          <Card key={s.label} className="glass border-none shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`w-5 h-5 shrink-0 ${s.color}`} />
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
        <Input placeholder="Search by member, conductor, or type…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Tabs defaultValue="log">
        <TabsList className="mb-6">
          <TabsTrigger value="log">Visit Log ({pastoralVisits.length})</TabsTrigger>
          <TabsTrigger value="followups">
            Follow-ups Due ({pendingFollowUps.length})
            {overdueFollowUps.length > 0 && <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white">{overdueFollowUps.length}</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="log" className="mt-0">
          <Card className="glass border-none shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/40">
                      <TableHead className="pl-6">Date</TableHead>
                      <TableHead>Member</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="hidden md:table-cell">Conducted By</TableHead>
                      <TableHead className="hidden lg:table-cell">Follow-up Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right pr-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filterVisits([...pastoralVisits].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())).length === 0 && (
                      <TableRow><TableCell colSpan={7} className="py-16 text-center text-muted-foreground">No visits found.</TableCell></TableRow>
                    )}
                    {filterVisits([...pastoralVisits].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())).map(v => <VisitRow key={v.id} v={v} />)}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="followups" className="mt-0">
          <Card className="glass border-none shadow-sm">
            <CardHeader>
              <CardTitle>Pending Follow-ups</CardTitle>
              <CardDescription>Visits that need a follow-up action, sorted by urgency.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingFollowUps.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">No pending follow-ups. All caught up!</p>}
              {[...pendingFollowUps].sort((a, b) => new Date(a.followUpDate!).getTime() - new Date(b.followUpDate!).getTime()).map(v => {
                const overdue = !isAfter(new Date(v.followUpDate!), today);
                const daysUntil = Math.ceil((new Date(v.followUpDate!).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={v.id} className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${overdue ? 'border-red-200 dark:border-red-800/50 bg-red-500/5' : 'border-border/40 bg-muted/10'}`}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{getMemberName(v.memberId)}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${VISIT_COLORS[v.visitType]}`}>{v.visitType}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Visit on {format(new Date(v.date), 'MMM d, yyyy')} by {v.conductedBy}</p>
                      <p className={`text-xs font-medium ${overdue ? 'text-red-500 dark:text-red-400' : 'text-gold-600 dark:text-gold-400'}`}>
                        <Bell className="w-3 h-3 inline mr-1" />
                        Follow-up: {format(new Date(v.followUpDate!), 'MMM d, yyyy')}
                        {overdue ? ` (${Math.abs(daysUntil)}d overdue)` : ` (in ${daysUntil}d)`}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => openEdit(v)}><Pencil className="w-3 h-3" /> Edit</Button>
                      <Button size="sm" className="gap-1 bg-white hover:bg-gray-50 text-navy-900 font-medium" onClick={() => markFollowUpDone(v)}><CheckCircle className="w-3 h-3" /> Mark Done</Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Log Visit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{editing ? 'Edit Visit' : 'Log Pastoral Visit'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Member *</Label>
              <Select value={form.memberId || 'none'} onValueChange={v => setForm(f => ({ ...f, memberId: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select member…</SelectItem>
                  {members.map(m => <SelectItem key={m.id} value={m.id}>{m.firstName} {m.lastName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Visit Type</Label>
              <Select value={form.visitType} onValueChange={v => setForm(f => ({ ...f, visitType: v as VisitType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['Home Visit', 'Hospital Visit', 'Phone Call', 'Counseling', 'Follow-up'] as VisitType[]).map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date *</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Conducted By *</Label>
              <Input placeholder="e.g. Pastor James" value={form.conductedBy} onChange={e => setForm(f => ({ ...f, conductedBy: e.target.value }))} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Notes</Label>
              <Textarea rows={3} placeholder="Summary of the visit…" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Follow-up Date</Label>
              <Input type="date" value={form.followUpDate} onChange={e => setForm(f => ({ ...f, followUpDate: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Follow-up Complete?</Label>
              <div className="flex items-center gap-3 h-10">
                <Switch checked={form.followUpComplete} onCheckedChange={v => setForm(f => ({ ...f, followUpComplete: v }))} />
                <span className="text-sm text-muted-foreground">{form.followUpComplete ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-white hover:bg-gray-50 text-navy-900 font-medium">{editing ? 'Save Changes' : 'Log Visit'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

