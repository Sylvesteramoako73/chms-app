import { useState } from 'react';
import { motion } from 'framer-motion';
import { useData } from '@/context/DataContext';
import type { VisitorRecord, VisitorFollowUpStatus } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Trash2, Pencil, UserPlus, Phone, Mail, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const STATUS_STYLES: Record<VisitorFollowUpStatus, string> = {
  Pending:   'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/40',
  Contacted: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/40',
  Revisited: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800/40',
  Converted: 'bg-sage-500/10 text-sage-700 dark:text-sage-400 border-sage-200 dark:border-sage-800/40',
};

const SERVICES = [
  'Sunday First Service', 'Sunday Second Service', 'Midweek',
  'Prayer Meeting', 'Special Program',
];

const EMPTY_FORM: Omit<VisitorRecord, 'id'> = {
  name: '', phone: '', email: '', visitDate: format(new Date(), 'yyyy-MM-dd'),
  serviceAttended: 'Sunday First Service', howHeard: '', followUpStatus: 'Pending',
  followUpDate: '', notes: '',
};

export default function Visitors() {
  const { visitors, addVisitor, updateVisitor, deleteVisitor } = useData();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<VisitorRecord | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const set = <K extends keyof typeof EMPTY_FORM>(key: K, val: (typeof EMPTY_FORM)[K]) =>
    setForm(f => ({ ...f, [key]: val }));

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setDialogOpen(true); };
  const openEdit = (v: VisitorRecord) => {
    setEditing(v);
    setForm({ name: v.name, phone: v.phone ?? '', email: v.email ?? '', visitDate: v.visitDate,
      serviceAttended: v.serviceAttended ?? 'Sunday First Service', howHeard: v.howHeard ?? '',
      followUpStatus: v.followUpStatus, followUpDate: v.followUpDate ?? '', notes: v.notes ?? '' });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.visitDate) {
      toast({ title: 'Validation error', description: 'Name and visit date are required.', variant: 'destructive' });
      return;
    }
    const record: VisitorRecord = {
      id: editing?.id ?? `v${Date.now()}`,
      name: form.name.trim(),
      phone: form.phone || undefined,
      email: form.email || undefined,
      visitDate: form.visitDate,
      serviceAttended: form.serviceAttended || undefined,
      howHeard: form.howHeard || undefined,
      followUpStatus: form.followUpStatus,
      followUpDate: form.followUpDate || undefined,
      notes: form.notes || undefined,
    };
    if (editing) {
      updateVisitor(record);
      toast({ title: 'Visitor updated' });
    } else {
      addVisitor(record);
      toast({ title: 'Visitor logged', description: `${record.name} has been added.` });
    }
    setDialogOpen(false);
  };

  const handleDelete = (v: VisitorRecord) => {
    deleteVisitor(v.id);
    toast({ title: 'Visitor removed' });
  };

  const filtered = visitors.filter(v => {
    const matchesSearch = v.name.toLowerCase().includes(search.toLowerCase()) ||
      (v.phone ?? '').includes(search);
    const matchesStatus = statusFilter === 'all' || v.followUpStatus === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime());

  const pending   = visitors.filter(v => v.followUpStatus === 'Pending').length;
  const contacted = visitors.filter(v => v.followUpStatus === 'Contacted').length;
  const converted = visitors.filter(v => v.followUpStatus === 'Converted').length;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold text-navy-900 dark:text-cream mb-1">Visitor Follow-up</h1>
          <p className="text-sm text-muted-foreground">{visitors.length} total visitors recorded</p>
        </div>
        <Button size="sm" onClick={openAdd} className="gap-2 bg-white hover:bg-gray-50 text-navy-900 font-medium">
          <Plus className="w-4 h-4" /> Log Visitor
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Visitors', value: visitors.length, icon: UserPlus, color: 'text-navy-500 dark:text-navy-300' },
          { label: 'Pending Follow-up', value: pending, icon: Clock, color: 'text-amber-500' },
          { label: 'Contacted', value: contacted, icon: Phone, color: 'text-blue-500' },
          { label: 'Converted', value: converted, icon: Mail, color: 'text-sage-500' },
        ].map(stat => (
          <Card key={stat.label} className="glass border-none shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <stat.icon className={`w-5 h-5 shrink-0 ${stat.color}`} />
              <div>
                <p className="text-2xl font-bold leading-tight">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card className="glass border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle>Visitor Log</CardTitle>
          <CardDescription>Track first-time visitors and their follow-up progress</CardDescription>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by name or phone…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Contacted">Contacted</SelectItem>
                <SelectItem value="Revisited">Revisited</SelectItem>
                <SelectItem value="Converted">Converted</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/40">
                  <TableHead className="pl-6">Visit Date</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Phone</TableHead>
                  <TableHead className="hidden md:table-cell">Service</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Follow-up Date</TableHead>
                  <TableHead className="text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-16 text-center text-muted-foreground">
                      No visitors found. Log your first visitor to get started.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map(v => (
                  <TableRow key={v.id} className="hover:bg-muted/20 border-border/30 transition-colors">
                    <TableCell className="pl-6 font-medium text-sm">{format(parseISO(v.visitDate), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="font-medium text-sm">
                      {v.name}
                      {v.email && <p className="text-xs text-muted-foreground">{v.email}</p>}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{v.phone ?? '—'}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{v.serviceAttended ?? '—'}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${STATUS_STYLES[v.followUpStatus]}`}>
                        {v.followUpStatus}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {v.followUpDate ? format(parseISO(v.followUpDate), 'MMM d, yyyy') : '—'}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(v)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(v)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{editing ? 'Edit Visitor' : 'Log Visitor'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input placeholder="e.g. John Mensah" value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input placeholder="+233…" value={form.phone} onChange={e => set('phone', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Visit Date *</Label>
                <Input type="date" value={form.visitDate} onChange={e => set('visitDate', e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="Optional" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Service Attended</Label>
                <Select value={form.serviceAttended} onValueChange={v => set('serviceAttended', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SERVICES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Follow-up Status</Label>
                <Select value={form.followUpStatus} onValueChange={v => set('followUpStatus', v as VisitorFollowUpStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Contacted">Contacted</SelectItem>
                    <SelectItem value="Revisited">Revisited</SelectItem>
                    <SelectItem value="Converted">Converted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>How Did They Hear?</Label>
                <Input placeholder="e.g. Friend, Social media" value={form.howHeard} onChange={e => set('howHeard', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Next Follow-up Date</Label>
                <Input type="date" value={form.followUpDate} onChange={e => set('followUpDate', e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input placeholder="Optional notes…" value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-white hover:bg-gray-50 text-navy-900 font-medium">
              {editing ? 'Save Changes' : 'Log Visitor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
