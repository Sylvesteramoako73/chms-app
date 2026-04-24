import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useData } from '@/context/DataContext';
import type { ServiceType, AttendanceRecord } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CalendarCheck, Users, Plus, Search, TrendingUp } from 'lucide-react';
import { format, parseISO, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';

const SERVICE_TYPES: ServiceType[] = [
  'Sunday First Service', 'Sunday Second Service', 'Midweek', 'Prayer Meeting', 'Special Program',
];

export default function Attendance() {
  const { attendance, members, addAttendance } = useData();
  const { toast } = useToast();

  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');

  // New attendance form state
  const [logService, setLogService] = useState<ServiceType>('Sunday First Service');
  const [logDate, setLogDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [logVisitors, setLogVisitors] = useState('0');
  const [presentIds, setPresentIds] = useState<Set<string>>(new Set());

  const filteredRecords = attendance
    .filter(a => serviceFilter === 'all' || a.serviceType === serviceFilter)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalServices = attendance.length;
  const avgAttendance = totalServices > 0
    ? Math.round(attendance.reduce((s, a) => s + a.presentMemberIds.length + a.visitorsCount, 0) / totalServices)
    : 0;
  const highestAttendance = attendance.reduce((max, a) => {
    const t = a.presentMemberIds.length + a.visitorsCount;
    return t > max ? t : max;
  }, 0);

  // Monthly chart data
  const chartData = useMemo(() => {
    const months = eachMonthOfInterval({ start: subMonths(new Date(), 5), end: new Date() });
    return months.map(month => {
      const start = startOfMonth(month);
      const end = endOfMonth(month);
      const monthRecords = attendance.filter(a => {
        const d = new Date(a.date);
        return d >= start && d <= end;
      });
      const avg = monthRecords.length > 0
        ? Math.round(monthRecords.reduce((s, a) => s + a.presentMemberIds.length + a.visitorsCount, 0) / monthRecords.length)
        : 0;
      return { name: format(month, 'MMM'), Attendance: avg };
    });
  }, [attendance]);

  const filteredMembers = members.filter(m =>
    `${m.firstName} ${m.lastName}`.toLowerCase().includes(memberSearch.toLowerCase())
  );

  const toggleMember = (id: string) => {
    setPresentIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setPresentIds(new Set(filteredMembers.map(m => m.id)));
  const clearAll = () => setPresentIds(new Set());

  const openDialog = () => {
    setLogService('Sunday First Service');
    setLogDate(format(new Date(), 'yyyy-MM-dd'));
    setLogVisitors('0');
    setPresentIds(new Set());
    setMemberSearch('');
    setDialogOpen(true);
  };

  const handleLog = () => {
    const record: AttendanceRecord = {
      id: `a${Date.now()}`,
      serviceType: logService,
      date: logDate,
      presentMemberIds: Array.from(presentIds),
      visitorsCount: parseInt(logVisitors) || 0,
    };
    addAttendance(record);
    toast({
      title: 'Attendance logged',
      description: `${record.presentMemberIds.length} members + ${record.visitorsCount} visitors recorded for ${logService}.`,
    });
    setDialogOpen(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold text-navy-900 dark:text-cream mb-1">Attendance</h1>
          <p className="text-sm text-muted-foreground">Track service attendance and analytics.</p>
        </div>
        <Button size="sm" onClick={openDialog} className="gap-2 bg-white hover:bg-gray-50 text-navy-900 font-medium">
          <Plus className="w-4 h-4" /> Log Attendance
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Services Logged</CardTitle>
            <CalendarCheck className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalServices}</p>
            <p className="text-xs text-muted-foreground mt-1">Historical records</p>
          </CardContent>
        </Card>
        <Card className="glass border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Attendance</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{avgAttendance}</p>
            <p className="text-xs text-muted-foreground mt-1">Per service</p>
          </CardContent>
        </Card>
        <Card className="glass border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Peak Attendance</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{highestAttendance}</p>
            <p className="text-xs text-muted-foreground mt-1">Single service high</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Chart */}
      <Card className="glass border-none shadow-sm">
        <CardHeader>
          <CardTitle>Monthly Attendance Overview</CardTitle>
          <CardDescription>Average attendance per service over the last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', background: 'hsl(var(--card))' }}
                  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                />
                <Bar dataKey="Attendance" fill="#C9A84C" radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Records Table */}
      <Card className="glass border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle>Service Records</CardTitle>
          <Select value={serviceFilter} onValueChange={setServiceFilter}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Services" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Services</SelectItem>
              {SERVICE_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/40">
                  <TableHead className="pl-6">Date</TableHead>
                  <TableHead>Service Type</TableHead>
                  <TableHead className="text-right">Members</TableHead>
                  <TableHead className="text-right">Visitors</TableHead>
                  <TableHead className="text-right pr-6">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-16 text-center text-muted-foreground">
                      No attendance records yet.
                    </TableCell>
                  </TableRow>
                )}
                {filteredRecords.map(record => {
                  const total = record.presentMemberIds.length + record.visitorsCount;
                  return (
                    <TableRow key={record.id} className="hover:bg-muted/20 border-border/30 transition-colors">
                      <TableCell className="pl-6 font-medium">{format(parseISO(record.date), 'EEE, MMM d yyyy')}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{record.serviceType}</TableCell>
                      <TableCell className="text-right text-sm">{record.presentMemberIds.length}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">{record.visitorsCount}</TableCell>
                      <TableCell className="text-right pr-6 font-bold text-gold-600 dark:text-gold-400">{total}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Log Attendance Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] flex flex-col gap-0 p-0">
          <DialogHeader className="p-6 pb-4 border-b border-border/40">
            <DialogTitle className="font-display text-2xl">Log Attendance</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Service Type</Label>
                <Select value={logService} onValueChange={v => setLogService(v as ServiceType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={logDate} onChange={e => setLogDate(e.target.value)} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Visitor Count</Label>
                <Input type="number" min="0" value={logVisitors} onChange={e => setLogVisitors(e.target.value)} placeholder="0" />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Members Present ({presentIds.size} selected)</Label>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={selectAll}>Select All</Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearAll}>Clear</Button>
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input className="pl-9 h-9" placeholder="Search members…" value={memberSearch} onChange={e => setMemberSearch(e.target.value)} />
              </div>
              <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1">
                {filteredMembers.map(m => (
                  <label key={m.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/30 cursor-pointer transition-colors">
                    <Checkbox
                      checked={presentIds.has(m.id)}
                      onCheckedChange={() => toggleMember(m.id)}
                    />
                    <div className="w-7 h-7 rounded-full bg-navy-100 dark:bg-navy-800 flex items-center justify-center shrink-0 border border-navy-200 dark:border-navy-700">
                      <span className="text-[10px] font-bold text-navy-700 dark:text-navy-200">{m.firstName[0]}{m.lastName[0]}</span>
                    </div>
                    <span className="text-sm font-medium">{m.firstName} {m.lastName}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="p-6 pt-4 border-t border-border/40">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleLog} className="bg-white hover:bg-gray-50 text-navy-900 font-medium">
              Save Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
