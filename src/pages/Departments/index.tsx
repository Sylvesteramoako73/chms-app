import { useState } from 'react';
import { motion } from 'framer-motion';
import { useData } from '@/context/DataContext';
import type { Department, SmallGroup } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Users, Clock, Pencil } from 'lucide-react';

export default function Departments() {
  const { departments, smallGroups, members, addDepartment, updateDepartment, addSmallGroup, updateSmallGroup } = useData();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('departments');
  const [deptDialog, setDeptDialog] = useState(false);
  const [groupDialog, setGroupDialog] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [editingGroup, setEditingGroup] = useState<SmallGroup | null>(null);

  const [deptForm, setDeptForm] = useState({ name: '', description: '' });
  const [groupForm, setGroupForm] = useState({ name: '', meetingDay: 'Sunday', meetingTime: '18:00' });

  const openAddDept = () => { setEditingDept(null); setDeptForm({ name: '', description: '' }); setDeptDialog(true); };
  const openEditDept = (d: Department) => { setEditingDept(d); setDeptForm({ name: d.name, description: d.description ?? '' }); setDeptDialog(true); };

  const openAddGroup = () => { setEditingGroup(null); setGroupForm({ name: '', meetingDay: 'Sunday', meetingTime: '18:00' }); setGroupDialog(true); };
  const openEditGroup = (g: SmallGroup) => { setEditingGroup(g); setGroupForm({ name: g.name, meetingDay: g.meetingDay, meetingTime: g.meetingTime }); setGroupDialog(true); };

  const saveDept = () => {
    if (!deptForm.name.trim()) { toast({ title: 'Error', description: 'Department name is required.', variant: 'destructive' }); return; }
    if (editingDept) {
      updateDepartment({ ...editingDept, ...deptForm });
      toast({ title: 'Department updated', description: `${deptForm.name} has been updated.` });
    } else {
      addDepartment({ id: `d${Date.now()}`, ...deptForm });
      toast({ title: 'Department added', description: `${deptForm.name} has been created.` });
    }
    setDeptDialog(false);
  };

  const saveGroup = () => {
    if (!groupForm.name.trim()) { toast({ title: 'Error', description: 'Group name is required.', variant: 'destructive' }); return; }
    if (editingGroup) {
      updateSmallGroup({ ...editingGroup, ...groupForm });
      toast({ title: 'Group updated', description: `${groupForm.name} has been updated.` });
    } else {
      addSmallGroup({ id: `sg${Date.now()}`, ...groupForm });
      toast({ title: 'Group added', description: `${groupForm.name} has been created.` });
    }
    setGroupDialog(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold text-navy-900 dark:text-cream mb-1">Groups & Departments</h1>
          <p className="text-sm text-muted-foreground">Manage church ministries and small groups.</p>
        </div>
        <Button size="sm"
          onClick={() => activeTab === 'departments' ? openAddDept() : openAddGroup()}
          className="gap-2 bg-white hover:bg-gray-50 text-navy-900 font-medium">
          <Plus className="w-4 h-4" /> {activeTab === 'departments' ? 'Add Department' : 'Add Group'}
        </Button>
      </div>

      <Tabs defaultValue="departments" onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="departments">Departments ({departments.length})</TabsTrigger>
          <TabsTrigger value="groups">Small Groups ({smallGroups.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="departments" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {departments.map(dept => {
              const deptMembers = members.filter(m => m.departmentId === dept.id);
              return (
                <Card key={dept.id} className="glass border-none shadow-sm hover:shadow-md transition-all group">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 rounded-lg bg-gold-500/10 border border-gold-200 dark:border-gold-800/40 flex items-center justify-center mb-3">
                        <Users className="w-5 h-5 text-gold-600 dark:text-gold-400" />
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => openEditDept(dept)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <CardTitle className="text-lg">{dept.name}</CardTitle>
                    {dept.description && <CardDescription className="text-sm line-clamp-2">{dept.description}</CardDescription>}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between pt-3 border-t border-border/40">
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Users className="w-3.5 h-3.5" />
                        <span className="font-semibold text-foreground">{deptMembers.length}</span> members
                      </div>
                      <div className="flex -space-x-2">
                        {deptMembers.slice(0, 5).map((m, i) => (
                          <div key={m.id} className="w-7 h-7 rounded-full bg-navy-100 dark:bg-navy-800 border-2 border-background flex items-center justify-center" style={{ zIndex: 5 - i }}>
                            <span className="text-[9px] font-bold text-navy-700 dark:text-navy-200">{m.firstName[0]}{m.lastName[0]}</span>
                          </div>
                        ))}
                        {deptMembers.length > 5 && (
                          <div className="w-7 h-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[9px] font-bold text-muted-foreground">
                            +{deptMembers.length - 5}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Member list */}
                    {deptMembers.length > 0 && (
                      <div className="mt-3 space-y-1.5 max-h-[120px] overflow-y-auto">
                        {deptMembers.map(m => (
                          <div key={m.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <div className="w-1.5 h-1.5 rounded-full bg-sage-400" />
                            {m.firstName} {m.lastName}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="groups" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {smallGroups.map(group => {
              const groupMembers = members.filter(m => m.smallGroupId === group.id);
              return (
                <Card key={group.id} className="glass border-none shadow-sm hover:shadow-md transition-all group">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 rounded-lg bg-sage-500/10 border border-sage-200 dark:border-sage-800/40 flex items-center justify-center mb-3">
                        <Users className="w-5 h-5 text-sage-600 dark:text-sage-400" />
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => openEditGroup(group)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                      <Clock className="w-3.5 h-3.5 text-sage-500" />
                      {group.meetingDay}s at {group.meetingTime}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between pt-3 border-t border-border/40">
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Users className="w-3.5 h-3.5" />
                        <span className="font-semibold text-foreground">{groupMembers.length}</span> members
                      </div>
                      <div className="flex -space-x-2">
                        {groupMembers.slice(0, 5).map((m, i) => (
                          <div key={m.id} className="w-7 h-7 rounded-full bg-navy-100 dark:bg-navy-800 border-2 border-background flex items-center justify-center" style={{ zIndex: 5 - i }}>
                            <span className="text-[9px] font-bold text-navy-700 dark:text-navy-200">{m.firstName[0]}{m.lastName[0]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Department Dialog */}
      <Dialog open={deptDialog} onOpenChange={setDeptDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="font-display text-xl">{editingDept ? 'Edit Department' : 'Add Department'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input placeholder="e.g. Choir" value={deptForm.name} onChange={e => setDeptForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input placeholder="Brief description…" value={deptForm.description} onChange={e => setDeptForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeptDialog(false)}>Cancel</Button>
            <Button onClick={saveDept} className="bg-white hover:bg-gray-50 text-navy-900 font-medium">{editingDept ? 'Save' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Small Group Dialog */}
      <Dialog open={groupDialog} onOpenChange={setGroupDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="font-display text-xl">{editingGroup ? 'Edit Small Group' : 'Add Small Group'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Group Name *</Label>
              <Input placeholder="e.g. Men of Valor" value={groupForm.name} onChange={e => setGroupForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Meeting Day</Label>
                <Input placeholder="e.g. Tuesday" value={groupForm.meetingDay} onChange={e => setGroupForm(f => ({ ...f, meetingDay: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Meeting Time</Label>
                <Input type="time" value={groupForm.meetingTime} onChange={e => setGroupForm(f => ({ ...f, meetingTime: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupDialog(false)}>Cancel</Button>
            <Button onClick={saveGroup} className="bg-white hover:bg-gray-50 text-navy-900 font-medium">{editingGroup ? 'Save' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
