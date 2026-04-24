import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useData } from '@/context/DataContext';
import type { VolunteerRole } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, ClipboardList, Users, Pencil, Trash2, UserPlus, X } from 'lucide-react';
import { format } from 'date-fns';

export default function Volunteers() {
  const { volunteerRoles, events, members, addVolunteerRole, updateVolunteerRole, deleteVolunteerRole } = useData();
  const { toast } = useToast();

  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<VolunteerRole | null>(null);
  const [roleForm, setRoleForm] = useState({ roleName: '', maxVolunteers: '' });
  const [assignDialogRole, setAssignDialogRole] = useState<VolunteerRole | null>(null);
  const [assignSearch, setAssignSearch] = useState('');

  const sortedEvents = useMemo(() =>
    [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [events]
  );

  const selectedEvent = events.find(e => e.id === selectedEventId);
  const rolesForEvent = volunteerRoles.filter(r => r.eventId === selectedEventId);

  const openAddRole = () => {
    setEditingRole(null);
    setRoleForm({ roleName: '', maxVolunteers: '' });
    setRoleDialogOpen(true);
  };

  const openEditRole = (role: VolunteerRole) => {
    setEditingRole(role);
    setRoleForm({ roleName: role.roleName, maxVolunteers: role.maxVolunteers?.toString() ?? '' });
    setRoleDialogOpen(true);
  };

  const handleSaveRole = () => {
    if (!roleForm.roleName.trim()) {
      toast({ title: 'Validation error', description: 'Role name is required.', variant: 'destructive' });
      return;
    }
    if (!selectedEventId) return;
    const max = roleForm.maxVolunteers ? parseInt(roleForm.maxVolunteers) : undefined;
    if (editingRole) {
      updateVolunteerRole({ ...editingRole, roleName: roleForm.roleName.trim(), maxVolunteers: max });
      toast({ title: 'Role updated', description: `"${roleForm.roleName}" has been updated.` });
    } else {
      addVolunteerRole({ id: `vr${Date.now()}`, eventId: selectedEventId, roleName: roleForm.roleName.trim(), assignedMemberIds: [], maxVolunteers: max });
      toast({ title: 'Role added', description: `"${roleForm.roleName}" has been added.` });
    }
    setRoleDialogOpen(false);
  };

  const handleDeleteRole = (role: VolunteerRole) => {
    deleteVolunteerRole(role.id);
    toast({ title: 'Role removed', description: `"${role.roleName}" has been deleted.` });
  };

  const handleToggleAssign = (role: VolunteerRole, memberId: string) => {
    const already = role.assignedMemberIds.includes(memberId);
    const updated = already
      ? role.assignedMemberIds.filter(id => id !== memberId)
      : [...role.assignedMemberIds, memberId];
    updateVolunteerRole({ ...role, assignedMemberIds: updated });
  };

  const filteredAssignMembers = useMemo(() => {
    const q = assignSearch.toLowerCase();
    return members.filter(m => `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) || m.phone.includes(q));
  }, [members, assignSearch]);

  const totalVolunteers = rolesForEvent.reduce((sum, r) => sum + r.assignedMemberIds.length, 0);
  const totalSlots = rolesForEvent.reduce((sum, r) => sum + (r.maxVolunteers ?? r.assignedMemberIds.length), 0);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold text-navy-900 dark:text-cream mb-1">Volunteers</h1>
          <p className="text-sm text-muted-foreground">Assign members to event roles</p>
        </div>
        {selectedEventId && (
          <Button size="sm" onClick={openAddRole} className="gap-2 bg-white hover:bg-gray-50 text-navy-900 font-medium">
            <Plus className="w-4 h-4" /> Add Role
          </Button>
        )}
      </div>

      {/* Event Selector */}
      <Card className="glass border-none shadow-sm">
        <CardContent className="p-4">
          <Label className="mb-2 block">Select Event</Label>
          <Select value={selectedEventId} onValueChange={setSelectedEventId}>
            <SelectTrigger className="max-w-sm">
              <SelectValue placeholder="Choose an event…" />
            </SelectTrigger>
            <SelectContent>
              {sortedEvents.map(e => (
                <SelectItem key={e.id} value={e.id}>
                  {e.title} — {format(new Date(e.date), 'MMM d, yyyy')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {!selectedEventId ? (
        <div className="glass rounded-xl border border-dashed border-border p-16 text-center text-muted-foreground">
          Select an event above to manage volunteer roles.
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: 'Roles', value: rolesForEvent.length, icon: ClipboardList, color: 'text-navy-500 dark:text-navy-300' },
              { label: 'Volunteers', value: totalVolunteers, icon: Users, color: 'text-sage-500' },
              { label: 'Slots Filled', value: totalSlots > 0 ? `${totalVolunteers}/${totalSlots}` : '—', icon: UserPlus, color: 'text-blue-500' },
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

          {/* Role Cards */}
          {rolesForEvent.length === 0 ? (
            <div className="glass rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
              No roles for {selectedEvent?.title} yet. Add one above.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rolesForEvent.map(role => {
                const assignedMembers = role.assignedMemberIds.map(id => members.find(m => m.id === id)).filter(Boolean);
                const isFull = role.maxVolunteers != null && role.assignedMemberIds.length >= role.maxVolunteers;
                return (
                  <Card key={role.id} className="glass border-none shadow-sm">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-sm font-semibold">{role.roleName}</CardTitle>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditRole(role)}><Pencil className="w-3 h-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteRole(role)}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {role.assignedMemberIds.length}{role.maxVolunteers ? `/${role.maxVolunteers}` : ''} volunteer{role.assignedMemberIds.length !== 1 ? 's' : ''}
                        {isFull && <span className="ml-1 text-amber-500 font-medium">· Full</span>}
                      </p>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {assignedMembers.map(m => m && (
                          <span key={m.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-muted text-muted-foreground">
                            {m.firstName} {m.lastName}
                            <button onClick={() => handleToggleAssign(role, m.id)} className="hover:text-destructive"><X className="w-2.5 h-2.5" /></button>
                          </span>
                        ))}
                      </div>
                      <Button variant="outline" size="sm" className="w-full h-7 text-xs gap-1" onClick={() => { setAssignDialogRole(role); setAssignSearch(''); }} disabled={isFull}>
                        <UserPlus className="w-3 h-3" /> Assign Member
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Add/Edit Role Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{editingRole ? 'Edit Role' : 'Add Role'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Role Name *</Label>
              <Input placeholder="e.g. Ushering, Sound, Parking" value={roleForm.roleName} onChange={e => setRoleForm(f => ({ ...f, roleName: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Max Volunteers (optional)</Label>
              <Input type="number" min={1} placeholder="Leave blank for unlimited" value={roleForm.maxVolunteers} onChange={e => setRoleForm(f => ({ ...f, maxVolunteers: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveRole} className="bg-white hover:bg-gray-50 text-navy-900 font-medium">{editingRole ? 'Save Changes' : 'Add Role'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Member Dialog */}
      <Dialog open={!!assignDialogRole} onOpenChange={() => setAssignDialogRole(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Assign to "{assignDialogRole?.roleName}"</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input placeholder="Search members…" value={assignSearch} onChange={e => setAssignSearch(e.target.value)} />
            <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
              {filteredAssignMembers.map(m => {
                const checked = assignDialogRole?.assignedMemberIds.includes(m.id) ?? false;
                return (
                  <label key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                    <input type="checkbox" className="accent-navy-600" checked={checked} onChange={() => { if (assignDialogRole) handleToggleAssign(assignDialogRole, m.id); }} />
                    <span className="text-sm">{m.firstName} {m.lastName}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{m.phone}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setAssignDialogRole(null)} className="bg-white hover:bg-gray-50 text-navy-900 font-medium">Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
