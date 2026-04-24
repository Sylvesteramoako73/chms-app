import { useState } from 'react';
import { motion } from 'framer-motion';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { useRole } from '@/context/RoleContext';
import type { Campus, UserRole } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Save, Upload, Church, Shield, Moon, Cog, Building2, ClipboardList, Pencil, Trash2, MessageCircle, Users2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { WhatsAppConnect } from '@/components/WhatsAppConnect';

const SERVICE_TYPES_DEFAULT = [
  'Sunday First Service',
  'Sunday Second Service',
  'Midweek',
  'Prayer Meeting',
  'Special Program',
];

const EMPTY_CAMPUS = { name: '', address: '', pastor: '', isMain: false };

const ROLE_OPTIONS: UserRole[] = ['Administrator', 'Pastor', 'Department Head', 'Data Entry'];

const ROLE_BADGE: Record<UserRole, string> = {
  Administrator: 'bg-gold-500/10 text-gold-700 dark:text-gold-400 border-gold-300 dark:border-gold-800/40',
  Pastor: 'bg-sage-500/10 text-sage-700 dark:text-sage-400 border-sage-300 dark:border-sage-800/40',
  'Department Head': 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800/40',
  'Data Entry': 'bg-muted text-muted-foreground border-border',
};

export default function Settings() {
  const { theme, toggleTheme, departments, campuses, auditLogs, addCampus, updateCampus, deleteCampus } = useData();
  const { profile, allProfiles, updateUserRole, refreshProfiles } = useAuth();
  const { actions } = useRole();
  const { toast } = useToast();
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

  const [campusDialogOpen, setCampusDialogOpen] = useState(false);
  const [editingCampus, setEditingCampus] = useState<Campus | null>(null);
  const [campusForm, setCampusForm] = useState(EMPTY_CAMPUS);
  const [auditFilter, setAuditFilter] = useState('all');

  const [churchName, setChurchName] = useState('Grace Cathedral');
  const [denomination, setDenomination] = useState('Non-Denominational');
  const [email, setEmail] = useState('info@grace.org');
  const [phone, setPhone] = useState('+1 (555) 123-4567');
  const [address, setAddress] = useState('123 Faith Avenue, Cityville, ST 12345');
  const [founded, setFounded] = useState('1985');

  const handleSaveProfile = () => {
    toast({ title: 'Profile saved', description: 'Church profile has been updated successfully.' });
  };

  const openAddCampus = () => { setEditingCampus(null); setCampusForm(EMPTY_CAMPUS); setCampusDialogOpen(true); };
  const openEditCampus = (c: Campus) => {
    setEditingCampus(c);
    setCampusForm({ name: c.name, address: c.address ?? '', pastor: c.pastor ?? '', isMain: c.isMain });
    setCampusDialogOpen(true);
  };
  const handleSaveCampus = () => {
    if (!campusForm.name.trim()) {
      toast({ title: 'Name required', variant: 'destructive' });
      return;
    }
    const data = { name: campusForm.name.trim(), address: campusForm.address.trim() || undefined, pastor: campusForm.pastor.trim() || undefined, isMain: campusForm.isMain };
    if (editingCampus) {
      updateCampus({ ...editingCampus, ...data });
      toast({ title: 'Campus updated' });
    } else {
      addCampus({ id: `c${Date.now()}`, ...data });
      toast({ title: 'Campus added' });
    }
    setCampusDialogOpen(false);
  };
  const handleDeleteCampus = (c: Campus) => {
    const ok = deleteCampus(c.id);
    if (!ok) toast({ title: 'Cannot delete', description: 'Members are assigned to this campus.', variant: 'destructive' });
    else toast({ title: 'Campus deleted' });
  };

  const handleRoleChange = async (userId: string, role: UserRole) => {
    setUpdatingRole(userId);
    const { error } = await updateUserRole(userId, role);
    setUpdatingRole(null);
    if (error) toast({ title: 'Error', description: error, variant: 'destructive' });
    else toast({ title: 'Role updated', description: 'User role has been changed.' });
  };

  const filteredAuditLogs = auditFilter === 'all' ? auditLogs : auditLogs.filter(l => l.entity === auditFilter);
  const auditEntities = Array.from(new Set(auditLogs.map(l => l.entity))).sort();
  const ACTION_COLORS: Record<string, string> = { CREATE: 'text-sage-500', UPDATE: 'text-blue-500', DELETE: 'text-destructive' };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-4xl font-display font-bold text-navy-900 dark:text-cream mb-1">Settings</h1>
        <p className="text-sm text-muted-foreground">Configure your church profile and system preferences.</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="profile" className="gap-2"><Church className="w-4 h-4" /> Church Profile</TabsTrigger>
          <TabsTrigger value="preferences" className="gap-2"><Cog className="w-4 h-4" /> Preferences</TabsTrigger>
          <TabsTrigger value="campuses" className="gap-2"><Building2 className="w-4 h-4" /> Campuses</TabsTrigger>
          <TabsTrigger value="audit" className="gap-2"><ClipboardList className="w-4 h-4" /> Audit Log</TabsTrigger>
          <TabsTrigger value="roles" className="gap-2"><Shield className="w-4 h-4" /> Roles</TabsTrigger>
          {actions.canManageUsers && (
            <TabsTrigger value="users" className="gap-2"><Users2 className="w-4 h-4" /> Users</TabsTrigger>
          )}
          <TabsTrigger value="whatsapp" className="gap-2"><MessageCircle className="w-4 h-4" /> WhatsApp</TabsTrigger>
        </TabsList>

        {/* Church Profile Tab */}
        <TabsContent value="profile" className="mt-0">
          <Card className="glass border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Church className="w-5 h-5 text-gold-500" /> Organization Details</CardTitle>
              <CardDescription>Update your church's public information and branding.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo */}
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 rounded-xl bg-navy-900 flex items-center justify-center border border-border shadow-sm">
                  <span className="font-display font-bold text-3xl text-gold-500">G</span>
                </div>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Upload className="w-4 h-4" /> Upload Logo
                  </Button>
                  <p className="text-xs text-muted-foreground">PNG, JPG up to 2MB. Recommended 512×512.</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Church Name</Label>
                  <Input value={churchName} onChange={e => setChurchName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Denomination</Label>
                  <Input value={denomination} onChange={e => setDenomination(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email Address</Label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone Number</Label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Year Founded</Label>
                  <Input value={founded} onChange={e => setFounded(e.target.value)} placeholder="e.g. 1985" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Physical Address</Label>
                  <Input value={address} onChange={e => setAddress(e.target.value)} />
                </div>
              </div>

              <div className="pt-2">
                <Button onClick={handleSaveProfile} className="gap-2 bg-white hover:bg-gray-50 text-navy-900 font-medium">
                  <Save className="w-4 h-4" /> Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="mt-0 space-y-4">
          {/* Theme */}
          <Card className="glass border-none shadow-sm">
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize how the application looks and feels.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border border-border/40 bg-muted/20">
                <div className="flex items-center gap-3">
                  <Moon className="w-5 h-5 text-navy-400" />
                  <div>
                    <p className="font-medium text-sm">Dark Mode</p>
                    <p className="text-xs text-muted-foreground">Midnight navy theme</p>
                  </div>
                </div>
                <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
              </div>
            </CardContent>
          </Card>

          {/* Service Types */}
          <Card className="glass border-none shadow-sm">
            <CardHeader>
              <CardTitle>Service Types</CardTitle>
              <CardDescription>Manage the service types used in attendance tracking.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {SERVICE_TYPES_DEFAULT.map(type => (
                <div key={type} className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-muted/10">
                  <span className="text-sm font-medium">{type}</span>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">Edit</Button>
                </div>
              ))}
              <Button variant="outline" size="sm" className="mt-2 gap-2 w-full">
                + Add Service Type
              </Button>
            </CardContent>
          </Card>

          {/* Departments quick-link */}
          <Card className="glass border-none shadow-sm">
            <CardHeader>
              <CardTitle>Departments</CardTitle>
              <CardDescription>{departments.length} departments configured.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {departments.map(d => (
                  <span key={d.id} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-navy-100 dark:bg-navy-800 text-navy-700 dark:text-navy-300 border border-navy-200 dark:border-navy-700">
                    {d.name}
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">Manage departments from the <strong>Departments</strong> page.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Campuses Tab */}
        <TabsContent value="campuses" className="mt-0">
          <Card className="glass border-none shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5 text-navy-500" /> Campuses</CardTitle>
                  <CardDescription>{campuses.length} campus{campuses.length !== 1 ? 'es' : ''} configured.</CardDescription>
                </div>
                <Button size="sm" onClick={openAddCampus} className="gap-2 bg-white hover:bg-gray-50 text-navy-900 font-medium">Add Campus</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {campuses.length === 0 && <p className="text-sm text-muted-foreground">No campuses yet.</p>}
              {campuses.map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-muted/10">
                  <div>
                    <p className="text-sm font-medium">{c.name}{c.isMain && <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-gold-600 dark:text-gold-400">Main</span>}</p>
                    {c.pastor && <p className="text-xs text-muted-foreground">Pastor: {c.pastor}</p>}
                    {c.address && <p className="text-xs text-muted-foreground">{c.address}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditCampus(c)}><Pencil className="w-3 h-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteCampus(c)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit" className="mt-0">
          <Card className="glass border-none shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <CardTitle className="flex items-center gap-2"><ClipboardList className="w-5 h-5 text-navy-500" /> Audit Log</CardTitle>
                  <CardDescription>{auditLogs.length} events recorded.</CardDescription>
                </div>
                <Select value={auditFilter} onValueChange={setAuditFilter}>
                  <SelectTrigger className="w-44"><SelectValue placeholder="All Entities" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Entities</SelectItem>
                    {auditEntities.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[480px] overflow-y-auto">
                {filteredAuditLogs.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">No log entries.</p>
                ) : filteredAuditLogs.map(log => (
                  <div key={log.id} className="flex items-start gap-3 px-4 py-3 border-b border-border/20 last:border-0 hover:bg-muted/10 transition-colors">
                    <span className={`text-[11px] font-bold uppercase tracking-wider shrink-0 mt-0.5 w-14 ${ACTION_COLORS[log.action] ?? 'text-muted-foreground'}`}>{log.action}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{log.description}</p>
                      <p className="text-xs text-muted-foreground">{log.entity} · {format(new Date(log.timestamp), 'MMM d, yyyy HH:mm')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roles & Permissions Tab */}
        <TabsContent value="roles" className="mt-0">
          <Card className="glass border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-sage-500" /> Roles & Permissions</CardTitle>
              <CardDescription>Access levels for church staff. Administrators can change user roles in the Users tab.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {([
                { role: 'Administrator' as UserRole, desc: 'Full access to all modules, settings, user management, and WhatsApp.' },
                { role: 'Pastor' as UserRole, desc: 'Members, attendance, giving, communication, reports, prayer, pastoral care, volunteers, pledges.' },
                { role: 'Department Head' as UserRole, desc: 'Members, attendance, events, prayer requests, and volunteers only.' },
                { role: 'Data Entry' as UserRole, desc: 'Log attendance and tithes/offerings only. No reports or settings.' },
              ] as { role: UserRole; desc: string }[]).map(r => (
                <div key={r.role} className="p-4 rounded-xl border border-border/40 bg-muted/10 flex items-start gap-4">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border shrink-0 mt-0.5 ${ROLE_BADGE[r.role]}`}>
                    {r.role}
                  </span>
                  <p className="text-sm text-muted-foreground">{r.desc}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab (admin only) */}
        {actions.canManageUsers && (
          <TabsContent value="users" className="mt-0">
            <Card className="glass border-none shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2"><Users2 className="w-5 h-5 text-navy-500" /> User Accounts</CardTitle>
                    <CardDescription>{allProfiles.length} account{allProfiles.length !== 1 ? 's' : ''} registered</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2" onClick={refreshProfiles}>
                    <Loader2 className="w-3.5 h-3.5" /> Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {allProfiles.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4 text-center">No users found. Have staff sign up via the login page.</p>
                )}
                {allProfiles.map(u => (
                  <div key={u.id} className="flex items-center justify-between gap-4 p-3 rounded-lg border border-border/40 bg-muted/10">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-navy-100 dark:bg-navy-800 flex items-center justify-center shrink-0 border border-navy-200 dark:border-navy-700">
                        <span className="text-xs font-bold text-navy-700 dark:text-navy-200">
                          {u.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {u.name}
                          {u.id === profile?.id && <span className="ml-1.5 text-[10px] text-muted-foreground">(you)</span>}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {updatingRole === u.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      ) : (
                        <Select
                          value={u.role}
                          onValueChange={v => handleRoleChange(u.id, v as UserRole)}
                          disabled={u.id === profile?.id}
                        >
                          <SelectTrigger className="w-[150px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLE_OPTIONS.map(r => (
                              <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* WhatsApp Tab */}
        <TabsContent value="whatsapp" className="mt-0">
          <Card className="glass border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-green-500" /> WhatsApp Integration
              </CardTitle>
              <CardDescription>
                Scan a QR code to link your WhatsApp account. Once connected, send messages directly from the Communication page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-700 dark:text-amber-400">
                <strong>Setup required:</strong> The WhatsApp server must be running separately.
                Open a second terminal and run: <code className="bg-black/10 px-1 rounded">npm run server:install</code> (once),
                then <code className="bg-black/10 px-1 rounded">npm run server</code>.
              </div>
              <WhatsAppConnect />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Campus Dialog */}
      <Dialog open={campusDialogOpen} onOpenChange={setCampusDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{editingCampus ? 'Edit Campus' : 'Add Campus'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Campus Name *</Label>
              <Input placeholder="e.g. North Campus" value={campusForm.name} onChange={e => setCampusForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Lead Pastor</Label>
              <Input placeholder="e.g. Pastor John Smith" value={campusForm.pastor} onChange={e => setCampusForm(f => ({ ...f, pastor: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input placeholder="123 Main St, City" value={campusForm.address} onChange={e => setCampusForm(f => ({ ...f, address: e.target.value }))} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-muted/20">
              <p className="text-sm font-medium">Main Campus</p>
              <Switch checked={campusForm.isMain} onCheckedChange={v => setCampusForm(f => ({ ...f, isMain: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCampusDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveCampus} className="bg-white hover:bg-gray-50 text-navy-900 font-medium">{editingCampus ? 'Save Changes' : 'Add Campus'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
