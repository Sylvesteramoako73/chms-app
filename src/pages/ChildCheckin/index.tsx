import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { useChildren } from '@/hooks/useChildren';
import { useData } from '@/context/DataContext';
import type { Child, Guardian } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Baby, Plus, Search, ShieldCheck, LogIn, LogOut, Users,
  Pencil, Trash2, QrCode, AlertTriangle, CheckCircle2, Clock,
} from 'lucide-react';
import { cn } from '@/utils';

const RELATIONSHIPS = ['Father', 'Mother', 'Grandparent', 'Guardian', 'Sibling', 'Other'];
const CLASS_ROOMS = ['Nursery (0-2)', 'Toddlers (3-4)', 'Kindergarten (5-6)', 'Primary 1-2 (7-8)', 'Primary 3-4 (9-10)', 'Primary 5-6 (11-12)'];

const generateCode = () => Math.floor(1000 + Math.random() * 9000).toString();
const generateQR = (id: string) => `CHK-${id.toUpperCase().slice(-8)}`;

const EMPTY_CHILD: Omit<Child, 'id' | 'createdAt' | 'qrCode'> = {
  firstName: '', lastName: '', gender: 'Male', dateOfBirth: '', classRoom: '', allergies: '', medicalNotes: '',
};
const EMPTY_GUARDIAN: Omit<Guardian, 'id' | 'securityCode' | 'childIds'> = {
  firstName: '', lastName: '', phone: '', email: '', relationship: 'Mother', isAuthorizedPickup: true,
};

export default function ChildCheckin() {
  const { children, guardians, checkIns, loading, addChild, updateChild, deleteChild, addGuardian, updateGuardian, deleteGuardian, checkInChild, checkOutChild } = useChildren();
  const { members } = useData();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [childDialog, setChildDialog] = useState(false);
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [childForm, setChildForm] = useState({ ...EMPTY_CHILD });

  const [guardianDialog, setGuardianDialog] = useState(false);
  const [editingGuardian, setEditingGuardian] = useState<Guardian | null>(null);
  const [guardianForm, setGuardianForm] = useState({ ...EMPTY_GUARDIAN });

  const [checkInDialog, setCheckInDialog] = useState(false);
  const [checkInSearch, setCheckInSearch] = useState('');
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [selectedGuardian, setSelectedGuardian] = useState<Guardian | null>(null);
  const [checkInStep, setCheckInStep] = useState<1 | 2 | 3>(1);
  const [enteredCode, setEnteredCode] = useState('');

  const [linkDialog, setLinkDialog] = useState(false);
  const [linkChildId, setLinkChildId] = useState('');
  const [linkGuardianId, setLinkGuardianId] = useState('');

  const today = format(new Date(), 'yyyy-MM-dd');
  const todayCheckIns = useMemo(() => checkIns.filter(c => c.date === today), [checkIns, today]);
  const currentlyCheckedIn = useMemo(() => todayCheckIns.filter(c => c.status === 'Checked In'), [todayCheckIns]);

  const filteredChildren = useMemo(() => {
    const q = search.toLowerCase();
    return children.filter(c => `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) || (c.classRoom ?? '').toLowerCase().includes(q));
  }, [children, search]);

  // Child CRUD
  const openAddChild = () => { setEditingChild(null); setChildForm({ ...EMPTY_CHILD }); setChildDialog(true); };
  const openEditChild = (c: Child) => {
    setEditingChild(c);
    setChildForm({ firstName: c.firstName, lastName: c.lastName, gender: c.gender, dateOfBirth: c.dateOfBirth ?? '', classRoom: c.classRoom ?? '', allergies: c.allergies ?? '', medicalNotes: c.medicalNotes ?? '' });
    setChildDialog(true);
  };
  const handleSaveChild = () => {
    if (!childForm.firstName.trim()) { toast({ title: 'First name is required', variant: 'destructive' }); return; }
    if (editingChild) {
      updateChild({ ...editingChild, ...childForm });
      toast({ title: 'Child updated' });
    } else {
      const id = `ch${Date.now()}`;
      addChild({ id, ...childForm, qrCode: generateQR(id), createdAt: new Date().toISOString() });
      toast({ title: 'Child registered', description: `${childForm.firstName} has been registered.` });
    }
    setChildDialog(false);
  };

  // Guardian CRUD
  const openAddGuardian = () => { setEditingGuardian(null); setGuardianForm({ ...EMPTY_GUARDIAN }); setGuardianDialog(true); };
  const openEditGuardian = (g: Guardian) => {
    setEditingGuardian(g);
    setGuardianForm({ firstName: g.firstName, lastName: g.lastName, phone: g.phone, email: g.email ?? '', relationship: g.relationship, isAuthorizedPickup: g.isAuthorizedPickup });
    setGuardianDialog(true);
  };
  const handleSaveGuardian = () => {
    if (!guardianForm.firstName.trim()) { toast({ title: 'First name is required', variant: 'destructive' }); return; }
    if (!guardianForm.phone.trim()) { toast({ title: 'Phone number is required', variant: 'destructive' }); return; }
    if (editingGuardian) {
      updateGuardian({ ...editingGuardian, ...guardianForm });
      toast({ title: 'Guardian updated' });
    } else {
      addGuardian({ id: `gd${Date.now()}`, ...guardianForm, childIds: [], securityCode: generateCode() });
      toast({ title: 'Guardian registered', description: 'Security code auto-generated.' });
    }
    setGuardianDialog(false);
  };

  // Link child ↔ guardian
  const handleLink = () => {
    if (!linkChildId || !linkGuardianId) { toast({ title: 'Select both child and guardian', variant: 'destructive' }); return; }
    const guardian = guardians.find(g => g.id === linkGuardianId);
    if (!guardian) return;
    if (!guardian.childIds.includes(linkChildId)) {
      updateGuardian({ ...guardian, childIds: [...guardian.childIds, linkChildId] });
    }
    toast({ title: 'Linked successfully' });
    setLinkDialog(false);
  };

  // Check-in flow
  const startCheckIn = () => { setCheckInStep(1); setCheckInSearch(''); setSelectedChild(null); setSelectedGuardian(null); setEnteredCode(''); setCheckInDialog(true); };
  const handleCheckInConfirm = () => {
    if (!selectedChild || !selectedGuardian) return;
    if (enteredCode !== selectedGuardian.securityCode) {
      toast({ title: 'Incorrect security code', description: 'Please verify with the guardian.', variant: 'destructive' }); return;
    }
    const alreadyIn = todayCheckIns.find(c => c.childId === selectedChild.id && c.status === 'Checked In');
    if (alreadyIn) { toast({ title: 'Already checked in', description: `${selectedChild.firstName} is already checked in today.` }); return; }
    checkInChild({ id: `ci${Date.now()}`, childId: selectedChild.id, guardianId: selectedGuardian.id, checkInTime: new Date().toISOString(), date: today, checkInBy: 'Staff', status: 'Checked In' });
    toast({ title: `${selectedChild.firstName} checked in!`, description: `Checked in by ${selectedGuardian.firstName} ${selectedGuardian.lastName}` });
    setCheckInDialog(false);
  };

  const handleCheckOut = (checkInId: string, childName: string) => {
    checkOutChild(checkInId, new Date().toISOString(), 'Staff');
    toast({ title: `${childName} checked out` });
  };

  const checkInChildSearch = useMemo(() => {
    if (!checkInSearch) return children;
    const q = checkInSearch.toLowerCase();
    return children.filter(c => `${c.firstName} ${c.lastName}`.toLowerCase().includes(q));
  }, [children, checkInSearch]);

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
          <h1 className="text-4xl font-display font-bold text-navy-900 dark:text-cream mb-1">Child Check-In</h1>
          <p className="text-sm text-muted-foreground">Secure check-in and check-out system for children</p>
        </div>
        <Button size="sm" onClick={startCheckIn} className="gap-2 bg-white hover:bg-gray-50 text-navy-900 font-medium shrink-0">
          <LogIn className="w-4 h-4" /> Check In Child
        </Button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Children', value: children.length, icon: Baby, color: 'text-gold-500' },
          { label: 'Checked In Now', value: currentlyCheckedIn.length, icon: CheckCircle2, color: 'text-sage-500' },
          { label: 'Guardians', value: guardians.length, icon: Users, color: 'text-blue-500' },
          { label: "Today's Check-Ins", value: todayCheckIns.length, icon: Clock, color: 'text-purple-500' },
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

      <Tabs defaultValue="checkin">
        <TabsList className="glass border-none">
          <TabsTrigger value="checkin">Kiosk</TabsTrigger>
          <TabsTrigger value="children">Children ({children.length})</TabsTrigger>
          <TabsTrigger value="guardians">Guardians ({guardians.length})</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* ── Kiosk Tab ── */}
        <TabsContent value="checkin" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Currently Checked In */}
            <Card className="glass border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-sage-500" /> Currently Checked In
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentlyCheckedIn.length === 0 ? (
                  <div className="text-center py-6">
                    <Baby className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                    <p className="text-sm text-muted-foreground">No children checked in.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {currentlyCheckedIn.map(ci => {
                      const child = children.find(c => c.id === ci.childId);
                      const guardian = guardians.find(g => g.id === ci.guardianId);
                      return (
                        <div key={ci.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-sage-500/5 border border-sage-200/50 dark:border-sage-800/30">
                          <div className="w-9 h-9 rounded-full bg-sage-500/10 flex items-center justify-center text-sage-600 font-bold text-sm">
                            {child ? `${child.firstName[0]}${child.lastName[0]}`.toUpperCase() : '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{child ? `${child.firstName} ${child.lastName}` : 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{child?.classRoom} · In: {format(new Date(ci.checkInTime), 'h:mm a')}</p>
                            <p className="text-[10px] text-muted-foreground">Guardian: {guardian ? `${guardian.firstName} ${guardian.lastName}` : '—'}</p>
                          </div>
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 shrink-0" onClick={() => handleCheckOut(ci.id, child?.firstName ?? 'Child')}>
                            <LogOut className="w-3 h-3" /> Out
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="glass border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full gap-2 bg-sage-600 hover:bg-sage-700 text-white h-12 text-base" onClick={startCheckIn}>
                  <LogIn className="w-5 h-5" /> Check In a Child
                </Button>
                <Button variant="outline" className="w-full gap-2 h-10" onClick={openAddChild}>
                  <Plus className="w-4 h-4" /> Register New Child
                </Button>
                <Button variant="outline" className="w-full gap-2 h-10" onClick={openAddGuardian}>
                  <Users className="w-4 h-4" /> Add Guardian
                </Button>
                <Button variant="outline" className="w-full gap-2 h-10" onClick={() => setLinkDialog(true)}>
                  <ShieldCheck className="w-4 h-4" /> Link Child ↔ Guardian
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Children Tab ── */}
        <TabsContent value="children" className="space-y-4 mt-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search children…" className="pl-8 h-8 text-sm" />
            </div>
            <Button size="sm" onClick={openAddChild} className="gap-1.5 h-8 bg-white hover:bg-gray-50 text-navy-900 font-medium shrink-0">
              <Plus className="w-3.5 h-3.5" /> Add Child
            </Button>
          </div>

          {filteredChildren.length === 0 ? (
            <div className="glass rounded-xl border border-dashed border-border p-16 text-center">
              <Baby className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-muted-foreground text-sm">{search ? 'No children match your search.' : 'No children registered yet.'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredChildren.map(child => {
                const childGuardians = guardians.filter(g => g.childIds.includes(child.id));
                const isCheckedIn = currentlyCheckedIn.some(ci => ci.childId === child.id);
                const age = child.dateOfBirth ? new Date().getFullYear() - new Date(child.dateOfBirth).getFullYear() : null;
                return (
                  <Card key={child.id} className="glass border-none shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={cn('w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0', child.gender === 'Male' ? 'bg-blue-500/10 text-blue-600' : 'bg-pink-500/10 text-pink-600')}>
                          {`${child.firstName[0]}${child.lastName[0]}`.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{child.firstName} {child.lastName}</p>
                          <p className="text-xs text-muted-foreground">{child.classRoom ?? 'No class assigned'}{age ? ` · ${age} yrs` : ''}</p>
                          <div className="flex items-center gap-1 mt-1.5">
                            {isCheckedIn && <span className="text-[10px] bg-sage-500/10 text-sage-700 border border-sage-200 px-1.5 py-0.5 rounded-full font-semibold">Checked In</span>}
                            {child.allergies && <span className="text-[10px] bg-orange-500/10 text-orange-600 border border-orange-200 px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-0.5"><AlertTriangle className="w-2.5 h-2.5" /> Allergy</span>}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 pt-2.5 border-t border-border/50">
                        <div className="flex items-center gap-1 mb-2">
                          <QrCode className="w-3 h-3 text-muted-foreground" />
                          <span className="text-[10px] font-mono text-muted-foreground">{child.qrCode}</span>
                        </div>
                        {childGuardians.length > 0 && (
                          <p className="text-xs text-muted-foreground truncate">👨‍👩‍👧 {childGuardians.map(g => `${g.firstName} ${g.lastName}`).join(', ')}</p>
                        )}
                        {child.allergies && <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 truncate">⚠ {child.allergies}</p>}
                      </div>
                      <div className="flex gap-1 mt-2.5">
                        <Button variant="ghost" size="sm" className="flex-1 h-7 text-xs gap-1" onClick={() => openEditChild(child)}><Pencil className="w-3 h-3" /> Edit</Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" onClick={() => { deleteChild(child.id); toast({ title: 'Child removed' }); }}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Guardians Tab ── */}
        <TabsContent value="guardians" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={openAddGuardian} className="gap-1.5 h-8 bg-white hover:bg-gray-50 text-navy-900 font-medium">
              <Plus className="w-3.5 h-3.5" /> Add Guardian
            </Button>
          </div>
          {guardians.length === 0 ? (
            <div className="glass rounded-xl border border-dashed border-border p-16 text-center">
              <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-muted-foreground text-sm">No guardians registered yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {guardians.map(g => {
                const linkedChildren = children.filter(c => g.childIds.includes(c.id));
                return (
                  <Card key={g.id} className="glass border-none shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-navy-700 flex items-center justify-center text-white font-bold text-sm shrink-0">
                          {`${g.firstName[0]}${g.lastName[0]}`.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{g.firstName} {g.lastName}</p>
                          <p className="text-xs text-muted-foreground">{g.relationship} · {g.phone}</p>
                          <div className="mt-1.5 flex items-center gap-2">
                            <span className="text-[10px] font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground flex items-center gap-1">
                              <ShieldCheck className="w-2.5 h-2.5" /> Code: {g.securityCode}
                            </span>
                            {g.isAuthorizedPickup && <span className="text-[10px] bg-sage-500/10 text-sage-700 border border-sage-200 px-1.5 py-0.5 rounded-full font-semibold">Authorized</span>}
                          </div>
                        </div>
                      </div>
                      {linkedChildren.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-border/50">
                          <p className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wide font-semibold">Linked Children</p>
                          <div className="flex flex-wrap gap-1">
                            {linkedChildren.map(c => (
                              <span key={c.id} className="text-xs bg-muted px-2 py-0.5 rounded-full">{c.firstName} {c.lastName}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex gap-1 mt-3">
                        <Button variant="ghost" size="sm" className="flex-1 h-7 text-xs gap-1" onClick={() => openEditGuardian(g)}><Pencil className="w-3 h-3" /> Edit</Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" onClick={() => { deleteGuardian(g.id); toast({ title: 'Guardian removed' }); }}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── History Tab ── */}
        <TabsContent value="history" className="space-y-4 mt-4">
          {checkIns.length === 0 ? (
            <div className="glass rounded-xl border border-dashed border-border p-16 text-center">
              <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-muted-foreground text-sm">No check-in history yet.</p>
            </div>
          ) : (
            <Card className="glass border-none shadow-sm">
              <div className="divide-y divide-border/50">
                {checkIns.slice(0, 50).map(ci => {
                  const child = children.find(c => c.id === ci.childId);
                  const guardian = guardians.find(g => g.id === ci.guardianId);
                  return (
                    <div key={ci.id} className="flex items-center gap-3 px-4 py-3">
                      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0', ci.status === 'Checked In' ? 'bg-sage-500/10 text-sage-700' : 'bg-muted text-muted-foreground')}>
                        {child ? `${child.firstName[0]}${child.lastName[0]}`.toUpperCase() : '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{child ? `${child.firstName} ${child.lastName}` : 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">
                          In: {format(new Date(ci.checkInTime), 'h:mm a')}
                          {ci.checkOutTime && ` · Out: ${format(new Date(ci.checkOutTime), 'h:mm a')}`}
                          {guardian && ` · ${guardian.firstName} ${guardian.lastName}`}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-muted-foreground">{format(new Date(ci.date), 'MMM d, yyyy')}</p>
                        <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', ci.status === 'Checked In' ? 'bg-sage-500/10 text-sage-700 border-sage-200' : 'bg-muted text-muted-foreground border-border')}>
                          {ci.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Check-In Flow Dialog */}
      <Dialog open={checkInDialog} onOpenChange={setCheckInDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {checkInStep === 1 ? 'Select Child' : checkInStep === 2 ? 'Select Guardian' : 'Verify & Check In'}
            </DialogTitle>
          </DialogHeader>

          {checkInStep === 1 && (
            <div className="space-y-3 py-2">
              <Input
                placeholder="Search child by name…"
                value={checkInSearch}
                onChange={e => setCheckInSearch(e.target.value)}
                autoFocus
              />
              <div className="max-h-64 overflow-y-auto space-y-1">
                {checkInChildSearch.map(c => {
                  const isIn = currentlyCheckedIn.some(ci => ci.childId === c.id);
                  return (
                    <button
                      key={c.id}
                      disabled={isIn}
                      className={cn('w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors', isIn ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted/50')}
                      onClick={() => { setSelectedChild(c); setCheckInStep(2); }}
                    >
                      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold', c.gender === 'Male' ? 'bg-blue-500/10 text-blue-600' : 'bg-pink-500/10 text-pink-600')}>
                        {`${c.firstName[0]}${c.lastName[0]}`.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{c.firstName} {c.lastName}</p>
                        <p className="text-xs text-muted-foreground">{c.classRoom ?? 'No class'}{isIn ? ' · Already checked in' : ''}</p>
                      </div>
                    </button>
                  );
                })}
                {checkInChildSearch.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No children found.</p>}
              </div>
            </div>
          )}

          {checkInStep === 2 && selectedChild && (
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground">Select the guardian checking in <strong>{selectedChild.firstName}</strong>:</p>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {guardians.filter(g => g.childIds.includes(selectedChild.id) && g.isAuthorizedPickup).map(g => (
                  <button key={g.id} className="w-full flex items-center gap-3 p-2.5 rounded-lg text-left hover:bg-muted/50 transition-colors"
                    onClick={() => { setSelectedGuardian(g); setCheckInStep(3); }}>
                    <div className="w-8 h-8 rounded-full bg-navy-700 flex items-center justify-center text-white text-xs font-bold">
                      {`${g.firstName[0]}${g.lastName[0]}`.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{g.firstName} {g.lastName}</p>
                      <p className="text-xs text-muted-foreground">{g.relationship} · {g.phone}</p>
                    </div>
                  </button>
                ))}
                {guardians.filter(g => g.childIds.includes(selectedChild.id)).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No guardians linked to this child. <button className="text-gold-500 underline" onClick={() => { setCheckInDialog(false); setLinkDialog(true); }}>Link now</button></p>
                )}
              </div>
              <Button variant="ghost" size="sm" className="w-full h-7 text-xs" onClick={() => setCheckInStep(1)}>← Back</Button>
            </div>
          )}

          {checkInStep === 3 && selectedChild && selectedGuardian && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-lg bg-muted/30 text-sm">
                <p><strong>Child:</strong> {selectedChild.firstName} {selectedChild.lastName}</p>
                <p><strong>Guardian:</strong> {selectedGuardian.firstName} {selectedGuardian.lastName}</p>
                <p><strong>Class:</strong> {selectedChild.classRoom ?? 'N/A'}</p>
                {selectedChild.allergies && <p className="text-orange-600 mt-1">⚠ Allergy: {selectedChild.allergies}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Guardian Security Code *</Label>
                <Input
                  type="password"
                  maxLength={4}
                  value={enteredCode}
                  onChange={e => setEnteredCode(e.target.value.replace(/\D/, ''))}
                  placeholder="Enter 4-digit code"
                  autoFocus
                />
              </div>
              <Button variant="ghost" size="sm" className="w-full h-7 text-xs" onClick={() => setCheckInStep(2)}>← Back</Button>
            </div>
          )}

          {checkInStep === 3 && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setCheckInDialog(false)}>Cancel</Button>
              <Button onClick={handleCheckInConfirm} className="bg-sage-600 hover:bg-sage-700 text-white gap-1">
                <ShieldCheck className="w-4 h-4" /> Confirm Check-In
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Child Dialog */}
      <Dialog open={childDialog} onOpenChange={setChildDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{editingChild ? 'Edit Child' : 'Register Child'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <Label>First Name *</Label>
              <Input value={childForm.firstName} onChange={e => setChildForm(f => ({ ...f, firstName: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Last Name</Label>
              <Input value={childForm.lastName} onChange={e => setChildForm(f => ({ ...f, lastName: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Date of Birth</Label>
              <Input type="date" value={childForm.dateOfBirth} onChange={e => setChildForm(f => ({ ...f, dateOfBirth: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Select value={childForm.gender} onValueChange={v => setChildForm(f => ({ ...f, gender: v as Child['gender'] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Classroom</Label>
              <Select value={childForm.classRoom ?? ''} onValueChange={v => setChildForm(f => ({ ...f, classRoom: v }))}>
                <SelectTrigger><SelectValue placeholder="Select class…" /></SelectTrigger>
                <SelectContent>{CLASS_ROOMS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Allergies / Medical Alerts</Label>
              <Input value={childForm.allergies} onChange={e => setChildForm(f => ({ ...f, allergies: e.target.value }))} placeholder="e.g. Peanut allergy, Asthma" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Medical Notes</Label>
              <Input value={childForm.medicalNotes} onChange={e => setChildForm(f => ({ ...f, medicalNotes: e.target.value }))} placeholder="Any important medical information…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChildDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveChild} className="bg-white hover:bg-gray-50 text-navy-900 font-medium">{editingChild ? 'Save' : 'Register'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Guardian Dialog */}
      <Dialog open={guardianDialog} onOpenChange={setGuardianDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{editingGuardian ? 'Edit Guardian' : 'Add Guardian'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <Label>First Name *</Label>
              <Input value={guardianForm.firstName} onChange={e => setGuardianForm(f => ({ ...f, firstName: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Last Name</Label>
              <Input value={guardianForm.lastName} onChange={e => setGuardianForm(f => ({ ...f, lastName: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone *</Label>
              <Input value={guardianForm.phone} onChange={e => setGuardianForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Relationship</Label>
              <Select value={guardianForm.relationship} onValueChange={v => setGuardianForm(f => ({ ...f, relationship: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{RELATIONSHIPS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Email</Label>
              <Input type="email" value={guardianForm.email} onChange={e => setGuardianForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5 col-span-2 flex items-center gap-3">
              <input type="checkbox" id="auth-pickup" className="accent-sage-600 w-4 h-4" checked={guardianForm.isAuthorizedPickup} onChange={e => setGuardianForm(f => ({ ...f, isAuthorizedPickup: e.target.checked }))} />
              <Label htmlFor="auth-pickup" className="cursor-pointer">Authorized for pickup</Label>
            </div>
            {!editingGuardian && (
              <p className="col-span-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-2.5">
                A 4-digit security code will be auto-generated for pickup verification.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGuardianDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveGuardian} className="bg-white hover:bg-gray-50 text-navy-900 font-medium">{editingGuardian ? 'Save' : 'Add Guardian'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Child ↔ Guardian Dialog */}
      <Dialog open={linkDialog} onOpenChange={setLinkDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Link Child & Guardian</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Child</Label>
              <Select value={linkChildId} onValueChange={setLinkChildId}>
                <SelectTrigger><SelectValue placeholder="Select child…" /></SelectTrigger>
                <SelectContent>{children.map(c => <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Guardian</Label>
              <Select value={linkGuardianId} onValueChange={setLinkGuardianId}>
                <SelectTrigger><SelectValue placeholder="Select guardian…" /></SelectTrigger>
                <SelectContent>{guardians.map(g => <SelectItem key={g.id} value={g.id}>{g.firstName} {g.lastName} ({g.relationship})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {/* Suppress unused members warning */}
            <input type="hidden" value={members.length} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialog(false)}>Cancel</Button>
            <Button onClick={handleLink} className="bg-white hover:bg-gray-50 text-navy-900 font-medium">Link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
