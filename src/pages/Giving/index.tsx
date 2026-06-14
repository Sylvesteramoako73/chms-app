import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useData } from '@/context/DataContext';
import { useCampus } from '@/context/CampusContext';
import { sendSMS } from '@/lib/messaging';
import type { GivingRecord, GivingType, PaymentMethod, Member } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Coins, Plus, TrendingUp, Search, Trash2, FileText, User, Download } from 'lucide-react';
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
  const { giving, members, campuses, addGiving, deleteGiving } = useData();
  const { selectedCampusId } = useCampus();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [memberGivingMonth, setMemberGivingMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [memberDetailOpen, setMemberDetailOpen] = useState(false);
  const [selectedMemberGiving, setSelectedMemberGiving] = useState<{ member: Member | null; memberId: string; records: GivingRecord[] } | null>(null);

  const campusGiving = giving.filter(g =>
    selectedCampusId === 'all' || g.campusId === selectedCampusId
  );

  const thisMonth = new Date();
  const thisMonthRecords = campusGiving.filter(g => isSameMonth(parseISO(g.date), thisMonth));
  const totalThisMonth = thisMonthRecords.reduce((s, g) => s + g.amount, 0);
  const tithesThisMonth = thisMonthRecords.filter(g => g.type === 'Tithe').reduce((s, g) => s + g.amount, 0);
  const offeringsThisMonth = thisMonthRecords.filter(g => g.type === 'Offering').reduce((s, g) => s + g.amount, 0);

  const chartData = useMemo(() => {
    const months = eachMonthOfInterval({ start: subMonths(new Date(), 5), end: new Date() });
    return months.map(month => {
      const start = startOfMonth(month);
      const end = endOfMonth(month);
      const recs = campusGiving.filter(g => { const d = new Date(g.date); return d >= start && d <= end; });
      return {
        name: format(month, 'MMM'),
        Tithes: recs.filter(g => g.type === 'Tithe').reduce((s, g) => s + g.amount, 0),
        Offerings: recs.filter(g => g.type === 'Offering').reduce((s, g) => s + g.amount, 0),
        Other: recs.filter(g => g.type !== 'Tithe' && g.type !== 'Offering').reduce((s, g) => s + g.amount, 0),
      };
    });
  }, [giving]);

  const memberGivingSummary = useMemo(() => {
    const [y, m] = memberGivingMonth.split('-').map(Number);
    const target = new Date(y, m - 1, 1);
    const map = new Map<string, { memberId: string; total: number; tithe: number; offering: number; other: number; records: GivingRecord[] }>();
    campusGiving.forEach(g => {
      if (!isSameMonth(parseISO(g.date), target)) return;
      const key = g.memberId || '__anonymous__';
      if (!map.has(key)) map.set(key, { memberId: key, total: 0, tithe: 0, offering: 0, other: 0, records: [] });
      const e = map.get(key)!;
      e.total += g.amount;
      if (g.type === 'Tithe') e.tithe += g.amount;
      else if (g.type === 'Offering') e.offering += g.amount;
      else e.other += g.amount;
      e.records.push(g);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [giving, memberGivingMonth]);

  const filtered = campusGiving
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
      id: crypto.randomUUID(),
      memberId: form.memberId || undefined,
      date: form.date,
      amount: amt,
      type: form.type,
      paymentMethod: form.paymentMethod,
      campusId: (form as any).campusId || (selectedCampusId !== 'all' ? selectedCampusId : undefined),
      notes: form.notes || undefined,
    });
    toast({ title: 'Offering recorded', description: `₵${amt.toLocaleString()} ${form.type} has been logged.` });

    // Auto SMS receipt if enabled and member has a phone
    const smsReceiptEnabled = (() => { try { return JSON.parse(localStorage.getItem('chms_sms_giving_receipt') ?? 'false'); } catch { return false; } })();
    if (smsReceiptEnabled && form.memberId) {
      const member = members.find(m => m.id === form.memberId);
      if (member?.phone) {
        const churchName = getChurchName();
        const msg = `Dear ${member.firstName}, your ${form.type} of GHS ${amt.toLocaleString()} on ${form.date} has been received. Thank you for your faithfulness. God bless you! — ${churchName}`;
        sendSMS([member.phone], msg, ({ title, description, variant }) => toast({ title, description, variant }));
      }
    }

    setDialogOpen(false);
    setForm(EMPTY_FORM);
  };

  const handleDelete = (record: GivingRecord) => {
    deleteGiving(record.id);
    toast({ title: 'Record deleted', description: 'The giving record has been removed.' });
  };

  const getChurchName = () => localStorage.getItem('chms_church_name') || 'Your Church';

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
    doc.text(getChurchName(), W / 2, 18, { align: 'center' });
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

  const generatePeriodReceipt = (memberId: string, records: GivingRecord[]) => {
    const member = memberId !== '__anonymous__' ? members.find(m => m.id === memberId) : null;
    const memberName = member ? `${member.firstName} ${member.lastName}` : 'Anonymous';
    const [yr, mo] = memberGivingMonth.split('-').map(Number);
    const periodLabel = format(new Date(yr, mo - 1, 1), 'MMMM yyyy');
    const total = records.reduce((s, r) => s + r.amount, 0);

    const doc = new jsPDF();
    const W = doc.internal.pageSize.getWidth();

    doc.setFillColor(11, 17, 32);
    doc.rect(0, 0, W, 44, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(201, 168, 76);
    doc.text(getChurchName(), W / 2, 18, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(180, 180, 180);
    doc.text('Giving Statement', W / 2, 28, { align: 'center' });
    doc.text(periodLabel, W / 2, 37, { align: 'center' });

    doc.setTextColor(11, 17, 32);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(memberName, 14, 58);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(`Period: ${periodLabel}`, 14, 67);
    doc.setDrawColor(201, 168, 76);
    doc.setLineWidth(0.6);
    doc.line(14, 72, W - 14, 72);

    let y = 83;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(11, 17, 32);
    doc.text('Date', 14, y);
    doc.text('Type', 60, y);
    doc.text('Method', 110, y);
    doc.text('Amount', W - 14, y, { align: 'right' });
    y += 6;
    doc.setDrawColor(220, 220, 220);
    doc.line(14, y, W - 14, y);
    y += 8;

    [...records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).forEach(r => {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      doc.text(format(parseISO(r.date), 'MMM d'), 14, y);
      doc.text(r.type, 60, y);
      doc.text(r.paymentMethod, 110, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(11, 17, 32);
      doc.text(`GHS ${r.amount.toLocaleString()}`, W - 14, y, { align: 'right' });
      y += 11;
    });

    doc.setDrawColor(201, 168, 76);
    doc.line(14, y + 2, W - 14, y + 2);
    y += 12;
    doc.setFillColor(248, 249, 250);
    doc.setDrawColor(201, 168, 76);
    doc.roundedRect(14, y, W - 28, 22, 3, 3, 'FD');
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(11, 17, 32);
    doc.text(`Total: GHS ${total.toLocaleString()}`, W / 2, y + 14, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(160, 160, 160);
    doc.text('Thank you for your faithful giving. May God bless you abundantly!', W / 2, y + 38, { align: 'center' });
    doc.text(`Generated on ${format(new Date(), 'MMM d, yyyy HH:mm')}`, W / 2, y + 46, { align: 'center' });

    doc.save(`Giving-Statement-${memberName.replace(/\s+/g, '-')}-${periodLabel.replace(/\s+/g, '-')}.pdf`);
  };

  const memberOptions = members.filter(m => m.status === 'Active' || m.status === 'New Convert');

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold text-navy-900 dark:text-cream mb-1">Tithes & Offerings</h1>
          <p className="text-sm text-muted-foreground">{giving.length} total records</p>
        </div>
        <Button size="sm" onClick={() => { setForm({ ...EMPTY_FORM, campusId: selectedCampusId !== 'all' ? selectedCampusId : undefined } as any); setDialogOpen(true); }} className="gap-2 bg-white hover:bg-gray-50 text-navy-900 font-medium">
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

      <Tabs defaultValue="records" className="space-y-4">
        <TabsList>
          <TabsTrigger value="records" className="gap-2"><FileText className="w-3.5 h-3.5" />All Records</TabsTrigger>
          <TabsTrigger value="members" className="gap-2"><User className="w-3.5 h-3.5" />By Member</TabsTrigger>
        </TabsList>

        <TabsContent value="records">
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
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          <Card className="glass border-none shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Giving by Member</CardTitle>
                  <CardDescription className="text-xs mt-0.5">Click a row to see full breakdown and download a period receipt.</CardDescription>
                </div>
                <Input type="month" className="w-44" value={memberGivingMonth} onChange={e => setMemberGivingMonth(e.target.value)} />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/40">
                      <TableHead className="pl-6">Member</TableHead>
                      <TableHead className="text-right">Tithe</TableHead>
                      <TableHead className="text-right">Offering</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">Other</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right pr-6">Receipt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {memberGivingSummary.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="py-16 text-center text-muted-foreground">No giving records for this period.</TableCell>
                      </TableRow>
                    )}
                    {memberGivingSummary.map(entry => {
                      const mem = entry.memberId !== '__anonymous__' ? members.find(m => m.id === entry.memberId) : null;
                      const name = mem ? `${mem.firstName} ${mem.lastName}` : 'Anonymous';
                      return (
                        <TableRow key={entry.memberId} className="hover:bg-muted/20 border-border/30 transition-colors cursor-pointer"
                          onClick={() => { setSelectedMemberGiving({ member: mem ?? null, memberId: entry.memberId, records: entry.records }); setMemberDetailOpen(true); }}>
                          <TableCell className="pl-6">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-navy-900/10 dark:bg-navy-100/10 flex items-center justify-center shrink-0">
                                <User className="w-3.5 h-3.5 text-navy-700 dark:text-navy-300" />
                              </div>
                              <span className="font-medium text-sm">{name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-sm">₵{entry.tithe.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-sm">₵{entry.offering.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-sm hidden sm:table-cell">₵{entry.other.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-bold text-gold-600 dark:text-gold-400">₵{entry.total.toLocaleString()}</TableCell>
                          <TableCell className="text-right pr-6">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              title="Download period receipt"
                              onClick={e => { e.stopPropagation(); generatePeriodReceipt(entry.memberId, entry.records); }}>
                              <Download className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Member Detail Dialog */}
          <Dialog open={memberDetailOpen} onOpenChange={setMemberDetailOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-display text-xl">
                  {selectedMemberGiving?.member
                    ? `${selectedMemberGiving.member.firstName} ${selectedMemberGiving.member.lastName}`
                    : 'Anonymous'} — Giving Detail
                </DialogTitle>
              </DialogHeader>
              {selectedMemberGiving && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {format(parseISO(memberGivingMonth + '-01'), 'MMMM yyyy')}
                  </p>
                  <div className="overflow-y-auto max-h-72">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="hidden sm:table-cell">Method</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...selectedMemberGiving.records]
                          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                          .map(r => (
                            <TableRow key={r.id}>
                              <TableCell className="text-sm">{format(parseISO(r.date), 'MMM d')}</TableCell>
                              <TableCell>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${TYPE_COLORS[r.type] ?? TYPE_COLORS.Other}`}>
                                  {r.type}
                                </span>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{r.paymentMethod}</TableCell>
                              <TableCell className="text-right font-bold text-gold-600 dark:text-gold-400">₵{r.amount.toLocaleString()}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-border/40">
                    <span className="font-bold text-sm">
                      Total: ₵{selectedMemberGiving.records.reduce((s, r) => s + r.amount, 0).toLocaleString()}
                    </span>
                    <Button size="sm" variant="outline" className="gap-2"
                      onClick={() => generatePeriodReceipt(selectedMemberGiving.memberId, selectedMemberGiving.records)}>
                      <Download className="w-3.5 h-3.5" /> Download Receipt
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>

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
            {campuses.length > 0 && (
              <div className="space-y-1.5">
                <Label>Branch</Label>
                <Select
                  value={(form as any).campusId || (selectedCampusId !== 'all' ? selectedCampusId : 'none')}
                  onValueChange={v => setForm(f => ({ ...f, campusId: v === 'none' ? '' : v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Select campus" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {campuses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
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
