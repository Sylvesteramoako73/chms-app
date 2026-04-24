import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useData } from '@/context/DataContext';
import type { Member, MemberStatus, Gender, MaritalStatus } from '@/types';
import { getMemberAbsenceStreak } from '@/utils/attendanceUtils';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Search, Plus, Pencil, Trash2, Download, Upload, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

function MemberInitials({ firstName, lastName }: { firstName: string; lastName: string }) {
  return (
    <div className="w-9 h-9 rounded-full bg-navy-100 dark:bg-navy-800 flex items-center justify-center shrink-0 border border-navy-200 dark:border-navy-700">
      <span className="text-xs font-bold text-navy-700 dark:text-navy-200">{firstName[0]}{lastName[0]}</span>
    </div>
  );
}

const STATUS_COLORS: Record<MemberStatus, string> = {
  Active: 'bg-sage-500/10 text-sage-700 dark:text-sage-400 border-sage-200 dark:border-sage-800/50',
  Inactive: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/50',
  'New Convert': 'bg-gold-500/10 text-gold-700 dark:text-gold-400 border-gold-200 dark:border-gold-800/50',
  Visitor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/50',
};

const EMPTY_FORM: Omit<Member, 'id'> = {
  firstName: '', lastName: '', phone: '', email: '', address: '',
  gender: 'Male', maritalStatus: 'Single', status: 'Active',
  joinDate: format(new Date(), 'yyyy-MM-dd'),
};

export default function Members() {
  const { members, departments, attendance, addMember, updateMember, deleteMember, importMembers } = useData();
  const { toast } = useToast();
  const navigate = useNavigate();
  const csvInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [form, setForm] = useState<Omit<Member, 'id'>>(EMPTY_FORM);

  const filtered = members.filter(m => {
    const name = `${m.firstName} ${m.lastName}`.toLowerCase();
    const matchSearch = name.includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()) ||
      m.phone.includes(search);
    const matchStatus = statusFilter === 'all' || m.status === statusFilter;
    const matchDept = deptFilter === 'all' || m.departmentId === deptFilter;
    return matchSearch && matchStatus && matchDept;
  });

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (member: Member) => {
    setEditing(member);
    const { id: _id, ...rest } = member;
    setForm(rest);
    setDialogOpen(true);
  };

  const set = <K extends keyof Omit<Member, 'id'>>(key: K, val: Omit<Member, 'id'>[K]) =>
    setForm(f => ({ ...f, [key]: val }));

  const handleSave = () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast({ title: 'Validation error', description: 'First and last name are required.', variant: 'destructive' });
      return;
    }
    const fullName = `${form.firstName} ${form.lastName}`;
    if (editing) {
      updateMember({ ...form, id: editing.id });
      toast({ title: 'Member updated', description: `${fullName} has been updated.` });
    } else {
      addMember({ ...form, id: `m${Date.now()}` });
      toast({ title: 'Member added', description: `${fullName} has been added to the congregation.` });
    }
    setDialogOpen(false);
  };

  const handleDelete = (m: Member) => {
    deleteMember(m.id);
    toast({ title: 'Member removed', description: `${m.firstName} ${m.lastName} has been removed.` });
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, ''));
      const idx = (key: string) => headers.indexOf(key);
      const parsed: Member[] = lines.slice(1).map((line, i) => {
        const cols = line.split(',').map(c => c.trim());
        return {
          id: `imp${Date.now()}${i}`,
          firstName: cols[idx('firstname')] ?? '',
          lastName: cols[idx('lastname')] ?? '',
          phone: cols[idx('phone')] ?? '',
          email: cols[idx('email')] ?? '',
          address: cols[idx('address')] ?? '',
          gender: (cols[idx('gender')] as Gender) ?? 'Male',
          maritalStatus: (cols[idx('maritalstatus')] as MaritalStatus) ?? 'Single',
          status: (cols[idx('status')] as MemberStatus) ?? 'Active',
          joinDate: cols[idx('joindate')] ?? format(new Date(), 'yyyy-MM-dd'),
          dateOfBirth: cols[idx('dateofbirth')] || undefined,
          occupation: cols[idx('occupation')] || undefined,
        };
      }).filter(m => m.firstName && m.lastName);
      if (parsed.length === 0) {
        toast({ title: 'Import failed', description: 'No valid rows found. Check CSV format.', variant: 'destructive' });
        return;
      }
      importMembers(parsed);
      toast({ title: 'Import successful', description: `${parsed.length} members imported.` });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const exportCSV = () => {
    const rows = [
      ['First Name', 'Last Name', 'Phone', 'Email', 'Department', 'Status', 'Join Date'],
      ...filtered.map(m => [
        m.firstName, m.lastName, m.phone, m.email,
        departments.find(d => d.id === m.departmentId)?.name ?? '',
        m.status, m.joinDate,
      ]),
    ];
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
    Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'members.csv' }).click();
    toast({ title: 'Exported', description: `${filtered.length} members exported as CSV.` });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold text-navy-900 dark:text-cream mb-1">Members</h1>
          <p className="text-sm text-muted-foreground">{members.length} total · {members.filter(m => m.status === 'Active').length} active</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
          <Button variant="outline" size="sm" onClick={() => csvInputRef.current?.click()} className="gap-2">
            <Upload className="w-4 h-4" /> Import CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button size="sm" onClick={openAdd} className="gap-2 bg-white hover:bg-gray-50 text-navy-900 font-medium">
            <Plus className="w-4 h-4" /> Add Member
          </Button>
        </div>
      </div>

      <Card className="glass border-none shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by name, email, phone…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
                <SelectItem value="New Convert">New Convert</SelectItem>
                <SelectItem value="Visitor">Visitor</SelectItem>
              </SelectContent>
            </Select>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="All Departments" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/40">
                  <TableHead className="pl-6">Member</TableHead>
                  <TableHead className="hidden md:table-cell">Phone</TableHead>
                  <TableHead className="hidden sm:table-cell">Department</TableHead>
                  <TableHead className="hidden lg:table-cell">Joined</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-16 text-center text-muted-foreground">
                      No members match your search.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map(member => {
                  const absenceStreak = getMemberAbsenceStreak(member.id, attendance);
                  return (
                  <TableRow key={member.id} className="hover:bg-muted/20 border-border/30 transition-colors cursor-pointer" onClick={() => navigate(`/members/${member.id}`)}>
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <MemberInitials firstName={member.firstName} lastName={member.lastName} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">{member.firstName} {member.lastName}</p>
                            {absenceStreak >= 3 && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 shrink-0">
                                <AlertTriangle className="w-2.5 h-2.5" />{absenceStreak}w
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{member.phone}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">
                      {departments.find(d => d.id === member.departmentId)?.name ?? '—'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {format(new Date(member.joinDate), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${STATUS_COLORS[member.status]}`}>
                        {member.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(member)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(member)}>
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

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{editing ? 'Edit Member' : 'Add New Member'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <Label>First Name *</Label>
              <Input value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="John" />
            </div>
            <div className="space-y-1.5">
              <Label>Last Name *</Label>
              <Input value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Smith" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+1 555 0100" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="john@example.com" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Address</Label>
              <Input value={form.address} onChange={e => set('address', e.target.value)} placeholder="123 Main St, City" />
            </div>
            <div className="space-y-1.5">
              <Label>Date of Birth</Label>
              <Input type="date" value={form.dateOfBirth ?? ''} onChange={e => set('dateOfBirth', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Occupation</Label>
              <Input value={form.occupation ?? ''} onChange={e => set('occupation', e.target.value)} placeholder="e.g. Teacher" />
            </div>
            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Select value={form.gender} onValueChange={v => set('gender', v as Gender)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Marital Status</Label>
              <Select value={form.maritalStatus} onValueChange={v => set('maritalStatus', v as MaritalStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Single">Single</SelectItem>
                  <SelectItem value="Married">Married</SelectItem>
                  <SelectItem value="Divorced">Divorced</SelectItem>
                  <SelectItem value="Widowed">Widowed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select value={form.departmentId ?? 'none'} onValueChange={v => set('departmentId', v === 'none' ? undefined : v)}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set('status', v as MemberStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="New Convert">New Convert</SelectItem>
                  <SelectItem value="Visitor">Visitor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Join Date</Label>
              <Input type="date" value={form.joinDate} onChange={e => set('joinDate', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Baptism Date</Label>
              <Input type="date" value={form.baptismDate ?? ''} onChange={e => set('baptismDate', e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} placeholder="Additional notes…" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-white hover:bg-gray-50 text-navy-900 font-medium">
              {editing ? 'Save Changes' : 'Add Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
