import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useData } from '@/context/DataContext';
import type { GivingRecord, GivingType, PaymentMethod } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Coins, Plus, TrendingUp, Search, Trash2, FileText } from 'lucide-react';
import { format, parseISO, isSameMonth, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import jsPDF from 'jspdf';

const TYPE_COLORS: Record<string, string> = {
  Tithe: 'bg-gold-500/10 text-gold-700 dark:text-gold-400 border-gold-200 dark:border-gold-800/40',
  Offering: 'bg-sage-500/10 text-sage-700 dark:text-sage-400 border-sage-200 dark:border-sage-800/40',
  Seed: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/40',
  Project: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800/40',
  Other: 'bg-muted text-muted-foreground border-border',
};

const EMPTY_FORM = {
  memberId: '', date: format(new Date(), 'yyyy-MM-dd'), amount: '',
  type: 'Tithe' as GivingType, paymentMethod: 'Cash' as PaymentMethod, notes: '',
};

export default function Giving() {
  const { giving, members, addGiving, deleteGiving } = useData();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const thisMonth = new Date();
  const thisMonthRecords = giving.filter(g => isSameMonth(parseISO(g.date), thisMonth));
  const totalThisMonth = thisMonthRecords.reduce((s, g) => s + g.amount, 0);
  const tithesThisMonth = thisMonthRecords.filter(g => g.type === 'Tithe').reduce((s, g) => s + g.amount, 0);
  const offeringsThisMonth = thisMonthRecords.filter(g => g.type === 'Offering').reduce((s, g) => s + g.amount, 0);

  const chartData = useMemo(() => {
    const months = eachMonthOfInterval({ start: subMonths(new Date(), 5), end: new Date() });
    return months.map(month => {
      const start = startOfMonth(month);
      const end = endOfMonth(month);
      const recs = giving.filter(g => { const d = new Date(g.date); return d >= start && d <= end; });
      return {
        name: format(month, 'MMM'),
        Tithes: recs.filter(g => g.type === 'Tithe').reduce((s, g) => s + g.amount, 0),
        Offerings: recs.filter(g => g.type === 'Offering').reduce((s, g) => s + g.amount, 0),
        Other: recs.filter(g => g.type !== 'Tithe' && g.type !== 'Offering').reduce((s, g) => s + g.amount, 0),
      };
    });
  }, [giving]);

  const filtered = giving
    .filter(g => {
      const member = members.find(m => m.id === g.memberId);
      const name = member ? `${member.firstName} ${member.lastName}` : 'anonymous';
      return name.toLowerCase().includes(search.toLowerCase()) &&
        (typeFilter === 'all' || g.type === typeFilter);
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const set = <K extends keyof typeof EMPTY_FORM>(key: K, val: (typeof EMPTY_FORM)[K]) =>
    setForm(f => ({ ...f, [key]: val }));

  const handleSave = () => {
    const amt = parseFloat(form.amount);
    if (!form.date || isNaN(amt) || amt <= 0) {
      toast({ title: 'Validation error', description: 'Date and a valid amount are required.', variant: 'destructive' });
      return;
    }
    addGiving({
      id: `g${Date.now()}`,
      memberId: form.memberId || undefined,
      date: form.date,
      amount: amt,
      type: form.type,
      paymentMethod: form.paymentMethod,
      notes: form.notes || undefined,
    });
    toast({ title: 'Offering recorded', description: `₵${amt.toLocaleString()} ${form.type} has been logged.` });
    setDialogOpen(false);
    setForm(EMPTY_FORM);
  };

  const handleDelete = (record: GivingRecord) => {
    deleteGiving(record.id);
    toast({ title: 'Record deleted', description: 'The giving record has been removed.' });
  };

  const generateReceipt = (record: GivingRecord) => {
    const member = members.find(m => m.id === record.memberId);
    const memberName = member ? `${member.firstName} ${member.lastName}` : 'Anonymous';
    const receiptNo = `RCP-${record.id.replace(/\D/g, '').slice(-6).padStart(6, '0')}`;

    const doc = new jsPDF();
    const W = doc.internal.pageSize.getWidth();

    // Header band
    doc.setFillColor(11, 17, 32);
    doc.rect(0, 0, W, 44, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(201, 168, 76);
    doc.text('ChurchCare', W / 2, 18, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(180, 180, 180);
    doc.text('Official Tithe & Offering Receipt', W / 2, 28, { align: 'center' });
    doc.text(receiptNo, W / 2, 37, { align: 'center' });

    // Section title
    doc.setTextColor(11, 17, 32);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Receipt Details', 14, 58);
    doc.setDrawColor(201, 168, 76);
    doc.setLineWidth(0.6);
    doc.line(14, 62, W - 14, 62);

    // Detail rows
    const rows: [string, string][] = [
      ['Member', memberName],
      ['Date', format(parseISO(record.date), 'MMMM d, yyyy')],
      ['Giving Type', record.type],
      ['Payment Method', record.paymentMethod],
      ['Amount', `GHS ${record.amount.toLocaleString()}`],
    ];
    if (record.notes) rows.push(['Notes', record.notes]);

    let y = 74;
    rows.forEach(([label, value]) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(120, 120, 120);
      doc.text(label + ':', 14, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(11, 17, 32);
      doc.text(value, 75, y);
      y += 13;
    });

    // Amount highlight box
    doc.setFillColor(248, 249, 250);
    doc.setDrawColor(201, 168, 76);
    doc.setLineWidth(0.5);
    doc.roundedRect(14, y + 6, W - 28, 24, 3, 3, 'FD');
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(11, 17, 32);
    doc.text(`Total Paid: GHS ${record.amount.toLocaleString()}`, W / 2, y + 22, { align: 'center' });

    // Footer
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(160, 160, 160);
    doc.text('Thank you for your faithful giving. May God bless you abundantly!', W / 2, y + 46, { align: 'center' });
    doc.text(`Generated on ${format(new Date(), 'MMM d, yyyy HH:mm')}`, W / 2, y + 54, { align: 'center' });

    doc.save(`${receiptNo}.pdf`);
  };

  const memberOptions = members.filter(m => m.status === 'Active' || m.status === 'New Convert');

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold text-navy-900 dark:text-cream mb-1">Tithes & Offerings</h1>
          <p className="text-sm text-muted-foreground">{giving.length} total records</p>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-2 bg-white hover:bg-gray-50 text-navy-900 font-medium">
          <Plus className="w-4 h-4" /> Log Contribution
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total This Month</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">₵{totalThisMonth.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">{thisMonthRecords.length} contributions</p>
          </CardContent>
        </Card>
        <Card className="glass border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tithes</CardTitle>
            <Coins className="w-4 h-4 text-gold-500" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">₵{tithesThisMonth.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>
        <Card className="glass border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Offerings</CardTitle>
            <Coins className="w-4 h-4 text-sage-500" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">₵{offeringsThisMonth.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Annual Chart */}
      <Card className="glass border-none shadow-sm">
        <CardHeader>
          <CardTitle>Monthly Giving Breakdown</CardTitle>
          <CardDescription>6-month financial overview by giving type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={v => `₵${v}`} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', background: 'hsl(var(--card))' }}
                  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                  formatter={(v: unknown) => [`₵${(v as number).toLocaleString()}`, undefined]}
                />
                <Legend wrapperStyle={{ paddingTop: '16px', fontSize: '12px' }} />
                <Bar dataKey="Tithes" stackId="a" fill="#0B1120" radius={[0, 0, 4, 4]} maxBarSize={48} />
                <Bar dataKey="Offerings" stackId="a" fill="#C9A84C" maxBarSize={48} />
                <Bar dataKey="Other" stackId="a" fill="#4A7C6F" radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Records Table */}
      <Card className="glass border-none shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by member name…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Tithe">Tithe</SelectItem>
                <SelectItem value="Offering">Offering</SelectItem>
                <SelectItem value="Seed">Seed</SelectItem>
                <SelectItem value="Project">Project</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/40">
                  <TableHead className="pl-6">Date</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="hidden sm:table-cell">Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-16 text-center text-muted-foreground">No records found.</TableCell>
                  </TableRow>
                )}
                {filtered.map(record => {
                  const member = members.find(m => m.id === record.memberId);
                  return (
                    <TableRow key={record.id} className="hover:bg-muted/20 border-border/30 transition-colors">
                      <TableCell className="pl-6 font-medium text-sm">{format(parseISO(record.date), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="text-sm">
                        {member ? `${member.firstName} ${member.lastName}` : <span className="text-muted-foreground italic">Anonymous</span>}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${TYPE_COLORS[record.type] ?? TYPE_COLORS.Other}`}>
                          {record.type}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{record.paymentMethod}</TableCell>
                      <TableCell className="text-right font-bold text-gold-600 dark:text-gold-400">₵{record.amount.toLocaleString()}</TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Download receipt" onClick={() => generateReceipt(record)}>
                            <FileText className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(record)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Log Giving Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Log Contribution</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Member</Label>
              <Select value={form.memberId || 'anonymous'} onValueChange={v => set('memberId', v === 'anonymous' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Select member (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="anonymous">Anonymous</SelectItem>
                  {memberOptions.map(m => <SelectItem key={m.id} value={m.id}>{m.firstName} {m.lastName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Date *</Label>
                <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Amount (₵) *</Label>
                <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.amount} onChange={e => set('amount', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => set('type', v as GivingType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tithe">Tithe</SelectItem>
                    <SelectItem value="Offering">Offering</SelectItem>
                    <SelectItem value="Seed">Seed</SelectItem>
                    <SelectItem value="Project">Project</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Payment Method</Label>
                <Select value={form.paymentMethod} onValueChange={v => set('paymentMethod', v as PaymentMethod)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input placeholder="Optional notes…" value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-white hover:bg-gray-50 text-navy-900 font-medium">Save Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
