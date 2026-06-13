import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { useCellGroups } from '@/hooks/useCellGroups';
import { useData } from '@/context/DataContext';
import { useRole } from '@/context/RoleContext';
import type { CellGroup, CellMember } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Network, Plus, Search, Users, MapPin, Calendar,
  Pencil, Trash2, UserPlus, CheckCircle2, FileText, ChevronRight,
  TrendingUp, X,
} from 'lucide-react';
import { cn } from '@/utils';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEMBER_ROLES: CellMember['role'][] = ['Leader', 'Co-Leader', 'Member'];

const EMPTY_CELL: Omit<CellGroup, 'id' | 'createdAt'> = {
  name: '', leaderId: undefined, coLeaderId: undefined, meetingDay: '',
  meetingTime: '', location: '', description: '', campusId: undefined, isActive: true,
};

export default function CellGroups() {
  const { cellGroups, cellMembers, cellAttendance, cellReports, loading, addCellGroup, updateCellGroup, deleteCellGroup, assignMemberToCell, removeMemberFromCell, updateCellMemberRole, addCellAttendance, addCellReport } = useCellGroups();
  const { members, campuses } = useData();
  const { actions } = useRole();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [selectedCell, setSelectedCell] = useState<CellGroup | null>(null);
  const [cellDetailTab, setCellDetailTab] = useState<'members' | 'attendance' | 'reports'>('members');

  const [cellDialog, setCellDialog] = useState(false);
  const [editingCell, setEditingCell] = useState<CellGroup | null>(null);
  const [cForm, setCForm] = useState({ ...EMPTY_CELL });

  const [assignDialog, setAssignDialog] = useState(false);
  const [assignSearch, setAssignSearch] = useState('');

  const [attDialog, setAttDialog] = useState(false);
  const [attForm, setAttForm] = useState({ date: format(new Date(), 'yyyy-MM-dd'), topicDiscussed: '', offerings: '', notes: '' });
  const [attPresent, setAttPresent] = useState<Set<string>>(new Set());

  const [reportDialog, setReportDialog] = useState(false);
  const [rForm, setRForm] = useState({ date: format(new Date(), 'yyyy-MM-dd'), reportedBy: '', attendance: '', newVisitors: '0', conversions: '0', topicCovered: '', highlights: '', challenges: '', prayerPoints: '' });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return cellGroups.filter(c => c.name.toLowerCase().includes(q) || (c.location ?? '').toLowerCase().includes(q));
  }, [cellGroups, search]);

  const getCellMemberCount = (cellId: string) => cellMembers.filter(m => m.cellId === cellId).length;
  const getCellLeader = (cellId: string) => {
    const lm = cellMembers.find(m => m.cellId === cellId && m.role === 'Leader');
    if (lm) return members.find(m => m.id === lm.memberId);
    const cell = cellGroups.find(c => c.id === cellId);
    if (cell?.leaderId) return members.find(m => m.id === cell.leaderId);
    return undefined;
  };

  const selectedCellMembers = useMemo(() => {
    if (!selectedCell) return [];
    return cellMembers.filter(m => m.cellId === selectedCell.id);
  }, [cellMembers, selectedCell]);

  const selectedCellAttendance = useMemo(() => {
    if (!selectedCell) return [];
    return cellAttendance.filter(a => a.cellId === selectedCell.id);
  }, [cellAttendance, selectedCell]);

  const selectedCellReports = useMemo(() => {
    if (!selectedCell) return [];
    return cellReports.filter(r => r.cellId === selectedCell.id);
  }, [cellReports, selectedCell]);

  const unassignedMembers = useMemo(() => {
    if (!selectedCell) return [];
    const assignedIds = selectedCellMembers.map(m => m.memberId);
    const q = assignSearch.toLowerCase();
    return members.filter(m => !assignedIds.includes(m.id) && (`${m.firstName} ${m.lastName}`.toLowerCase().includes(q) || m.phone.includes(q)));
  }, [members, selectedCellMembers, selectedCell, assignSearch]);

  // Stats
  const totalMembers = useMemo(() => new Set(cellMembers.map(m => m.memberId)).size, [cellMembers]);
  const activeGroups = cellGroups.filter(c => c.isActive).length;

  // CRUD
  const openAdd = () => { setEditingCell(null); setCForm({ ...EMPTY_CELL }); setCellDialog(true); };
  const openEdit = (c: CellGroup) => {
    setEditingCell(c);
    setCForm({ name: c.name, leaderId: c.leaderId, coLeaderId: c.coLeaderId, meetingDay: c.meetingDay ?? '', meetingTime: c.meetingTime ?? '', location: c.location ?? '', description: c.description ?? '', campusId: c.campusId, isActive: c.isActive });
    setCellDialog(true);
  };
  const handleSave = () => {
    if (!cForm.name.trim()) { toast({ title: 'Cell name is required', variant: 'destructive' }); return; }
    if (editingCell) {
      updateCellGroup({ ...editingCell, ...cForm });
      toast({ title: 'Cell group updated' });
    } else {
      addCellGroup({ id: crypto.randomUUID(), ...cForm, createdAt: new Date().toISOString() });
      toast({ title: 'Cell group created' });
    }
    setCellDialog(false);
  };
  const handleDelete = (cell: CellGroup) => {
    deleteCellGroup(cell.id);
    if (selectedCell?.id === cell.id) setSelectedCell(null);
    toast({ title: 'Cell group deleted' });
  };

  const handleAssignMember = (memberId: string) => {
    if (!selectedCell) return;
    assignMemberToCell({ id: crypto.randomUUID(), cellId: selectedCell.id, memberId, role: 'Member', joinDate: format(new Date(), 'yyyy-MM-dd') });
    toast({ title: 'Member added to cell' });
  };

  const handleRemoveMember = (cm: CellMember) => {
    removeMemberFromCell(cm.id);
    const m = members.find(x => x.id === cm.memberId);
    toast({ title: `${m?.firstName ?? 'Member'} removed from cell` });
  };

  const handleLogAttendance = () => {
    if (!selectedCell) return;
    addCellAttendance({
      id: crypto.randomUUID(), cellId: selectedCell.id, date: attForm.date,
      presentMemberIds: Array.from(attPresent),
      topicDiscussed: attForm.topicDiscussed || undefined,
      offerings: attForm.offerings ? parseFloat(attForm.offerings) : undefined,
      notes: attForm.notes || undefined,
    });
    toast({ title: 'Attendance logged', description: `${attPresent.size} members marked present.` });
    setAttDialog(false);
    setAttPresent(new Set());
  };

  const handleSubmitReport = () => {
    if (!selectedCell || !rForm.topicCovered.trim() || !rForm.reportedBy.trim()) {
      toast({ title: 'Please fill all required fields', variant: 'destructive' }); return;
    }
    addCellReport({
      id: crypto.randomUUID(), cellId: selectedCell.id, date: rForm.date, reportedBy: rForm.reportedBy,
      attendance: parseInt(rForm.attendance) || 0, newVisitors: parseInt(rForm.newVisitors) || 0,
      conversions: parseInt(rForm.conversions) || 0, topicCovered: rForm.topicCovered,
      highlights: rForm.highlights || undefined, challenges: rForm.challenges || undefined,
      prayerPoints: rForm.prayerPoints || undefined, createdAt: new Date().toISOString(),
    });
    toast({ title: 'Report submitted' });
    setReportDialog(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-2 border-gold-500 border-t-transparent animate-spin" />
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold text-navy-900 dark:text-cream mb-1">Cell Groups</h1>
          <p className="text-sm text-muted-foreground">Manage small groups, meetings, attendance, and reports</p>
        </div>
        {actions.canManageCells && (
          <Button size="sm" onClick={openAdd} className="gap-2 bg-white hover:bg-gray-50 text-navy-900 font-medium shrink-0">
            <Plus className="w-4 h-4" /> New Cell Group
          </Button>
        )}
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Groups', value: cellGroups.length, icon: Network, color: 'text-gold-500' },
          { label: 'Active Groups', value: activeGroups, icon: CheckCircle2, color: 'text-sage-500' },
          { label: 'Members in Cells', value: totalMembers, icon: Users, color: 'text-blue-500' },
          { label: 'Reports Submitted', value: cellReports.length, icon: FileText, color: 'text-purple-500' },
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cell List */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search groups…" className="pl-8 h-8 text-sm" />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="glass rounded-xl border border-dashed border-border p-10 text-center">
              <Network className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-sm text-muted-foreground">{search ? 'No groups found.' : 'No cell groups yet.'}</p>
              {actions.canManageCells && <Button size="sm" variant="outline" onClick={openAdd} className="mt-3 gap-1 h-7 text-xs"><Plus className="w-3 h-3" /> Create First Group</Button>}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(cell => {
                const count = getCellMemberCount(cell.id);
                const leader = getCellLeader(cell.id);
                const isSelected = selectedCell?.id === cell.id;
                return (
                  <Card
                    key={cell.id}
                    className={cn('glass border-none shadow-sm cursor-pointer transition-all hover:shadow-md', isSelected && 'ring-2 ring-gold-400 dark:ring-gold-600')}
                    onClick={() => { setSelectedCell(cell); setCellDetailTab('members'); }}
                  >
                    <CardContent className="p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm truncate">{cell.name}</p>
                            {!cell.isActive && <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">Inactive</span>}
                          </div>
                          {leader && <p className="text-xs text-muted-foreground truncate">Leader: {leader.firstName} {leader.lastName}</p>}
                          {cell.meetingDay && <p className="text-xs text-muted-foreground">{cell.meetingDay}{cell.meetingTime ? ` · ${cell.meetingTime}` : ''}</p>}
                          {cell.location && <p className="text-xs text-muted-foreground flex items-center gap-0.5 mt-0.5"><MapPin className="w-2.5 h-2.5" />{cell.location}</p>}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-xs font-semibold text-muted-foreground">{count}</span>
                          <Users className="w-3.5 h-3.5 text-muted-foreground" />
                          <ChevronRight className={cn('w-3.5 h-3.5 text-muted-foreground transition-transform', isSelected && 'rotate-90')} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Cell Detail Panel */}
        <div className="lg:col-span-2">
          {!selectedCell ? (
            <div className="glass rounded-xl border border-dashed border-border h-64 flex items-center justify-center text-center">
              <div>
                <Network className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-30" />
                <p className="text-muted-foreground text-sm">Select a cell group to view details</p>
              </div>
            </div>
          ) : (
            <Card className="glass border-none shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg font-display">{selectedCell.name}</CardTitle>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                      {selectedCell.meetingDay && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{selectedCell.meetingDay}{selectedCell.meetingTime ? ` at ${selectedCell.meetingTime}` : ''}</span>}
                      {selectedCell.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{selectedCell.location}</span>}
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{getCellMemberCount(selectedCell.id)} members</span>
                    </div>
                    {selectedCell.description && <p className="text-xs text-muted-foreground mt-1.5">{selectedCell.description}</p>}
                  </div>
                  {actions.canManageCells && (
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(selectedCell)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(selectedCell)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="px-4 pb-4">
                <div className="flex gap-1 mb-4 bg-muted/50 rounded-lg p-1">
                  {(['members', 'attendance', 'reports'] as const).map(tab => (
                    <button key={tab} onClick={() => setCellDetailTab(tab)} className={cn('flex-1 text-xs font-medium py-1.5 rounded-md transition-colors capitalize', cellDetailTab === tab ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                      {tab} {tab === 'members' ? `(${selectedCellMembers.length})` : tab === 'reports' ? `(${selectedCellReports.length})` : ''}
                    </button>
                  ))}
                </div>

                {/* Members Sub-tab */}
                {cellDetailTab === 'members' && (
                  <div className="space-y-3">
                    {actions.canManageCells && (
                      <Button size="sm" variant="outline" className="w-full h-8 text-xs gap-1.5" onClick={() => { setAssignSearch(''); setAssignDialog(true); }}>
                        <UserPlus className="w-3.5 h-3.5" /> Add Member to Cell
                      </Button>
                    )}
                    {selectedCellMembers.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">No members in this cell yet.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {selectedCellMembers.map(cm => {
                          const member = members.find(m => m.id === cm.memberId);
                          if (!member) return null;
                          return (
                            <div key={cm.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30">
                              <div className="w-8 h-8 rounded-full bg-navy-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                {`${member.firstName[0]}${member.lastName[0]}`.toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{member.firstName} {member.lastName}</p>
                                <p className="text-xs text-muted-foreground">{member.phone}</p>
                              </div>
                              {actions.canManageCells ? (
                                <Select value={cm.role} onValueChange={v => updateCellMemberRole(cm.id, v as CellMember['role'])}>
                                  <SelectTrigger className="h-6 text-[10px] w-[90px] px-1.5"><SelectValue /></SelectTrigger>
                                  <SelectContent>{MEMBER_ROLES.map(r => <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>)}</SelectContent>
                                </Select>
                              ) : (
                                <span className="text-xs text-muted-foreground">{cm.role}</span>
                              )}
                              {actions.canManageCells && (
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10 shrink-0" onClick={() => handleRemoveMember(cm)}>
                                  <X className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Attendance Sub-tab */}
                {cellDetailTab === 'attendance' && (
                  <div className="space-y-3">
                    {actions.canManageCells && (
                      <Button size="sm" variant="outline" className="w-full h-8 text-xs gap-1.5" onClick={() => { setAttPresent(new Set()); setAttForm({ date: format(new Date(), 'yyyy-MM-dd'), topicDiscussed: '', offerings: '', notes: '' }); setAttDialog(true); }}>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Log Meeting Attendance
                      </Button>
                    )}
                    {selectedCellAttendance.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">No attendance records yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedCellAttendance.map(att => (
                          <div key={att.id} className="p-3 rounded-lg bg-muted/30">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm font-medium">{format(new Date(att.date), 'EEEE, MMM d yyyy')}</p>
                              <span className="text-xs font-semibold text-sage-600 dark:text-sage-400">{att.presentMemberIds.length} present</span>
                            </div>
                            {att.topicDiscussed && <p className="text-xs text-muted-foreground">Topic: {att.topicDiscussed}</p>}
                            {att.offerings !== undefined && <p className="text-xs text-muted-foreground">Offering: ₵{att.offerings}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Reports Sub-tab */}
                {cellDetailTab === 'reports' && (
                  <div className="space-y-3">
                    {actions.canManageCells && (
                      <Button size="sm" variant="outline" className="w-full h-8 text-xs gap-1.5" onClick={() => { setRForm({ date: format(new Date(), 'yyyy-MM-dd'), reportedBy: '', attendance: '', newVisitors: '0', conversions: '0', topicCovered: '', highlights: '', challenges: '', prayerPoints: '' }); setReportDialog(true); }}>
                        <FileText className="w-3.5 h-3.5" /> Submit Meeting Report
                      </Button>
                    )}
                    {selectedCellReports.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">No reports submitted yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {selectedCellReports.map(r => (
                          <div key={r.id} className="p-3 rounded-lg bg-muted/30 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium">{format(new Date(r.date), 'MMM d, yyyy')}</p>
                              <span className="text-xs text-muted-foreground">by {r.reportedBy}</span>
                            </div>
                            <p className="text-xs font-medium">{r.topicCovered}</p>
                            <div className="flex gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-0.5"><Users className="w-2.5 h-2.5" />{r.attendance} attended</span>
                              <span className="flex items-center gap-0.5"><UserPlus className="w-2.5 h-2.5" />{r.newVisitors} visitors</span>
                              {r.conversions > 0 && <span className="flex items-center gap-0.5 text-gold-600"><TrendingUp className="w-2.5 h-2.5" />{r.conversions} saved</span>}
                            </div>
                            {r.highlights && <p className="text-xs text-muted-foreground">✨ {r.highlights}</p>}
                            {r.challenges && <p className="text-xs text-muted-foreground">⚡ {r.challenges}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Add/Edit Cell Dialog */}
      <Dialog open={cellDialog} onOpenChange={setCellDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-display text-2xl">{editingCell ? 'Edit Cell Group' : 'New Cell Group'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5 col-span-2">
              <Label>Group Name *</Label>
              <Input value={cForm.name} onChange={e => setCForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Grace Cell Group" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Leader</Label>
              <Select value={cForm.leaderId ?? 'none'} onValueChange={v => setCForm(f => ({ ...f, leaderId: v === 'none' ? undefined : v }))}>
                <SelectTrigger><SelectValue placeholder="Select leader…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {members.map(m => <SelectItem key={m.id} value={m.id}>{m.firstName} {m.lastName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Meeting Day</Label>
              <Select value={cForm.meetingDay} onValueChange={v => setCForm(f => ({ ...f, meetingDay: v }))}>
                <SelectTrigger><SelectValue placeholder="Select day…" /></SelectTrigger>
                <SelectContent>{DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Meeting Time</Label>
              <Input type="time" value={cForm.meetingTime} onChange={e => setCForm(f => ({ ...f, meetingTime: e.target.value }))} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Location</Label>
              <Input value={cForm.location} onChange={e => setCForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Aboabo, Takoradi" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Campus</Label>
              <Select value={cForm.campusId ?? 'all'} onValueChange={v => setCForm(f => ({ ...f, campusId: v === 'all' ? undefined : v }))}>
                <SelectTrigger><SelectValue placeholder="Select campus…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campuses</SelectItem>
                  {campuses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Description</Label>
              <Input value={cForm.description} onChange={e => setCForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description…" />
            </div>
            <div className="col-span-2 flex items-center gap-3">
              <input type="checkbox" id="active" className="accent-sage-600 w-4 h-4" checked={cForm.isActive} onChange={e => setCForm(f => ({ ...f, isActive: e.target.checked }))} />
              <Label htmlFor="active" className="cursor-pointer">Active group</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCellDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-white hover:bg-gray-50 text-navy-900 font-medium">{editingCell ? 'Save Changes' : 'Create Group'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Member Dialog */}
      <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="font-display text-xl">Add Member to {selectedCell?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Input placeholder="Search members…" value={assignSearch} onChange={e => setAssignSearch(e.target.value)} autoFocus />
            <div className="max-h-64 overflow-y-auto space-y-1">
              {unassignedMembers.slice(0, 20).map(m => (
                <button key={m.id} className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 text-left transition-colors"
                  onClick={() => { handleAssignMember(m.id); }}>
                  <div className="w-8 h-8 rounded-full bg-navy-700 flex items-center justify-center text-white text-xs font-bold">
                    {`${m.firstName[0]}${m.lastName[0]}`.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{m.firstName} {m.lastName}</p>
                    <p className="text-xs text-muted-foreground">{m.phone}</p>
                  </div>
                </button>
              ))}
              {unassignedMembers.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">All members already assigned.</p>}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setAssignDialog(false)} className="bg-white hover:bg-gray-50 text-navy-900 font-medium">Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attendance Dialog */}
      <Dialog open={attDialog} onOpenChange={setAttDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="font-display text-2xl">Log Attendance</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={attForm.date} onChange={e => setAttForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Topic Discussed</Label>
              <Input value={attForm.topicDiscussed} onChange={e => setAttForm(f => ({ ...f, topicDiscussed: e.target.value }))} placeholder="e.g. Faith and Trust" />
            </div>
            <div className="space-y-1.5">
              <Label>Offering (₵)</Label>
              <Input type="number" min={0} value={attForm.offerings} onChange={e => setAttForm(f => ({ ...f, offerings: e.target.value }))} placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <Label>Members Present</Label>
              <div className="max-h-40 overflow-y-auto space-y-1 border border-border rounded-lg p-2">
                {selectedCellMembers.map(cm => {
                  const m = members.find(x => x.id === cm.memberId);
                  if (!m) return null;
                  return (
                    <label key={cm.id} className="flex items-center gap-2 p-1 hover:bg-muted/30 rounded cursor-pointer">
                      <input type="checkbox" className="accent-sage-600" checked={attPresent.has(cm.memberId)} onChange={() => {
                        const next = new Set(attPresent);
                        if (attPresent.has(cm.memberId)) next.delete(cm.memberId); else next.add(cm.memberId);
                        setAttPresent(next);
                      }} />
                      <span className="text-sm">{m.firstName} {m.lastName}</span>
                    </label>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">{attPresent.size} of {selectedCellMembers.length} marked present</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttDialog(false)}>Cancel</Button>
            <Button onClick={handleLogAttendance} className="bg-white hover:bg-gray-50 text-navy-900 font-medium">Log Attendance</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={reportDialog} onOpenChange={setReportDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display text-2xl">Meeting Report</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={rForm.date} onChange={e => setRForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Reported By *</Label>
              <Input value={rForm.reportedBy} onChange={e => setRForm(f => ({ ...f, reportedBy: e.target.value }))} placeholder="Your name" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Topic Covered *</Label>
              <Input value={rForm.topicCovered} onChange={e => setRForm(f => ({ ...f, topicCovered: e.target.value }))} placeholder="e.g. Walking by Faith" />
            </div>
            <div className="space-y-1.5">
              <Label>Attendance</Label>
              <Input type="number" min={0} value={rForm.attendance} onChange={e => setRForm(f => ({ ...f, attendance: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>New Visitors</Label>
              <Input type="number" min={0} value={rForm.newVisitors} onChange={e => setRForm(f => ({ ...f, newVisitors: e.target.value }))} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Conversions / Salvations</Label>
              <Input type="number" min={0} value={rForm.conversions} onChange={e => setRForm(f => ({ ...f, conversions: e.target.value }))} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Highlights</Label>
              <Input value={rForm.highlights} onChange={e => setRForm(f => ({ ...f, highlights: e.target.value }))} placeholder="Key moments from the meeting…" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Challenges</Label>
              <Input value={rForm.challenges} onChange={e => setRForm(f => ({ ...f, challenges: e.target.value }))} placeholder="Any challenges faced…" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Prayer Points</Label>
              <Input value={rForm.prayerPoints} onChange={e => setRForm(f => ({ ...f, prayerPoints: e.target.value }))} placeholder="Specific prayer requests…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmitReport} className="bg-white hover:bg-gray-50 text-navy-900 font-medium">Submit Report</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
