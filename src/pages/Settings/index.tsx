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
import { Save, Upload, Church, Shield, Moon, Cog, Building2, ClipboardList, Pencil, Trash2, MessageCircle, MessageSquare, Users2, Loader2, UserPlus, Eye, EyeOff, CreditCard, Check, KeyRound, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { WhatsAppConnect } from '@/components/WhatsAppConnect';
import { usePackage, PLAN_LABELS, planPriceDisplay, type Plan } from '@/context/PackageContext';

const SERVICE_TYPES_DEFAULT = [
  'Sunday First Service',
  'Sunday Second Service',
  'Midweek',
  'Prayer Meeting',
  'Special Program',
];

const EMPTY_CAMPUS = { name: '', address: '', pastor: '', isMain: false };

const ROLE_OPTIONS: UserRole[] = ['Administrator', 'Branch Pastor', 'Pastor', 'Department Head', 'Data Entry'];

const ROLE_BADGE: Record<UserRole, string> = {
  Administrator: 'bg-gold-500/10 text-gold-700 dark:text-gold-400 border-gold-300 dark:border-gold-800/40',
  'Branch Pastor': 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-800/40',
  Pastor: 'bg-sage-500/10 text-sage-700 dark:text-sage-400 border-sage-300 dark:border-sage-800/40',
  'Department Head': 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800/40',
  'Data Entry': 'bg-muted text-muted-foreground border-border',
};

const PLAN_HIGHLIGHTS: Record<Plan, string[]> = {
  free: [
    '1 branch · 1 user',
    'Up to 50 members',
    'Member profiles & attendance',
    'Giving & tithe records',
  ],
  starter: [
    'Up to 3 branches · 3 users',
    'Up to 150 members',
    'Everything in Free',
    'Basic PDF reports',
    'Event & visitor management',
  ],
  growth: [
    'Up to 5 branches · 10 users',
    'Up to 500 members',
    'Everything in Starter',
    'Bulk WhatsApp & SMS messaging',
    'Pledge & fundraising · Accounting',
    'Prayer & pastoral care',
  ],
  pro: [
    'Up to 25 branches · 25 users',
    'Up to 2,000 members',
    'Everything in Growth',
    'Role-based access control',
    'Advanced analytics & reports',
    'Volunteer management · Audit log',
  ],
  custom: [
    'Unlimited branches & users',
    'Unlimited members',
    'Everything in Pro',
    'Tailored to your church size',
    'Priority support',
  ],
};

const PLAN_COLORS: Record<Plan, { border: string; badgeBg: string; check: string; title: string }> = {
  free:    { border: 'border-slate-400',  badgeBg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-300/50',   check: 'text-slate-500',  title: 'text-slate-600 dark:text-slate-400'   },
  starter: { border: 'border-sage-500',   badgeBg: 'bg-sage-500/10 text-sage-700 dark:text-sage-400 border-sage-300/50',       check: 'text-sage-500',   title: 'text-sage-700 dark:text-sage-400'     },
  growth:  { border: 'border-gold-500',   badgeBg: 'bg-gold-500/10 text-gold-700 dark:text-gold-400 border-gold-300/50',       check: 'text-gold-500',   title: 'text-gold-700 dark:text-gold-400'     },
  pro:     { border: 'border-purple-500', badgeBg: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-300/50', check: 'text-purple-500', title: 'text-purple-700 dark:text-purple-400' },
  custom:  { border: 'border-blue-500',   badgeBg: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-300/50',       check: 'text-blue-500',   title: 'text-blue-700 dark:text-blue-400'     },
};

export default function Settings() {
  const { theme, toggleTheme, departments, campuses, auditLogs, addCampus, updateCampus, deleteCampus } = useData();
  const { profile, allProfiles, updateUserProfile, createUser, deleteUser, refreshProfiles } = useAuth();
  const { actions } = useRole();
  const { toast } = useToast();
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [addUserForm, setAddUserForm] = useState({ name: '', email: '', password: '', phone: '', role: 'Data Entry' as UserRole });
  const [addUserBranchId, setAddUserBranchId] = useState('');
  const [addUserLoading, setAddUserLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmDeleteName, setConfirmDeleteName] = useState('');
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [editUserLoading, setEditUserLoading] = useState(false);
  const [editUserForm, setEditUserForm] = useState({ id: '', name: '', email: '', phone: '', role: 'Data Entry' as UserRole, branchId: '' });
  const { plan: currentPlan, features, activatePlan } = usePackage();
  const [activationCode, setActivationCode] = useState('');
  const [activating, setActivating] = useState(false);
  const [activationError, setActivationError] = useState('');

  const [campusDialogOpen, setCampusDialogOpen] = useState(false);
  const [editingCampus, setEditingCampus] = useState<Campus | null>(null);
  const [campusForm, setCampusForm] = useState(EMPTY_CAMPUS);
  const [auditFilter, setAuditFilter] = useState('all');

  const [smsSettings, setSmsSettings] = useState<{ apiKey: string; senderId: string }>(() => {
    try { return { apiKey: '', senderId: 'ChurchCare', ...JSON.parse(localStorage.getItem('chms_sms_settings') ?? '{}') }; }
    catch { return { apiKey: '', senderId: 'ChurchCare' }; }
  });
  const updateSmsSettings = (key: 'apiKey' | 'senderId', val: string) => {
    const next = { ...smsSettings, [key]: val };
    setSmsSettings(next);
    localStorage.setItem('chms_sms_settings', JSON.stringify(next));
  };

  const [emailjsSettings, setEmailjsSettings] = useState<{ serviceId: string; templateId: string; publicKey: string }>(() => {
    try { return { serviceId: '', templateId: '', publicKey: '', ...JSON.parse(localStorage.getItem('chms_emailjs_settings') ?? '{}') }; }
    catch { return { serviceId: '', templateId: '', publicKey: '' }; }
  });
  const updateEmailjsSettings = (key: 'serviceId' | 'templateId' | 'publicKey', val: string) => {
    const next = { ...emailjsSettings, [key]: val };
    setEmailjsSettings(next);
    localStorage.setItem('chms_emailjs_settings', JSON.stringify(next));
  };

  const [smsGivingReceipt, setSmsGivingReceipt] = useState<boolean>(() => {
    try { return JSON.parse(localStorage.getItem('chms_sms_giving_receipt') ?? 'false'); }
    catch { return false; }
  });
  const toggleSmsGivingReceipt = (val: boolean) => {
    setSmsGivingReceipt(val);
    localStorage.setItem('chms_sms_giving_receipt', JSON.stringify(val));
  };

  const [birthdayWA, setBirthdayWA] = useState<{ birthdayEnabled: boolean; anniversaryEnabled: boolean }>(() => {
    try { return { birthdayEnabled: false, anniversaryEnabled: false, ...JSON.parse(localStorage.getItem('chms_birthday_wa') ?? '{}') }; }
    catch { return { birthdayEnabled: false, anniversaryEnabled: false }; }
  });

  const updateBirthdayWA = (key: 'birthdayEnabled' | 'anniversaryEnabled', val: boolean) => {
    const next = { ...birthdayWA, [key]: val };
    setBirthdayWA(next);
    localStorage.setItem('chms_birthday_wa', JSON.stringify(next));
  };

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
      toast({ title: 'Branch updated' });
    } else {
      addCampus({ id: crypto.randomUUID(), ...data });
      toast({ title: 'Branch added' });
    }
    setCampusDialogOpen(false);
  };
  const handleDeleteCampus = (c: Campus) => {
    const ok = deleteCampus(c.id);
    if (!ok) toast({ title: 'Cannot delete', description: 'Members are assigned to this branch.', variant: 'destructive' });
    else toast({ title: 'Branch deleted' });
  };

  const handleAddUser = async () => {
    if (!addUserForm.name.trim() || !addUserForm.email.trim() || !addUserForm.password) {
      toast({ title: 'All fields required', variant: 'destructive' });
      return;
    }
    if (addUserForm.role === 'Branch Pastor' && !addUserBranchId) {
      toast({ title: 'Branch required', description: 'Please assign a branch for the Branch Pastor.', variant: 'destructive' });
      return;
    }
    if (addUserForm.password.length < 6) {
      toast({ title: 'Password too short', description: 'Minimum 6 characters.', variant: 'destructive' });
      return;
    }
    setAddUserLoading(true);
    const branchId = addUserForm.role === 'Branch Pastor' ? addUserBranchId || undefined : undefined;
    const { error } = await createUser(addUserForm.name, addUserForm.email, addUserForm.password, addUserForm.role, branchId, addUserForm.phone.trim() || undefined);
    setAddUserLoading(false);
    if (error) {
      toast({ title: 'Failed to create user', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'User created', description: `${addUserForm.name} has been added with ${addUserForm.role} role.` });
      setAddUserOpen(false);
      setAddUserForm({ name: '', email: '', password: '', phone: '', role: 'Data Entry' });
      setAddUserBranchId('');
    }
  };

  const openEditUser = (u: typeof allProfiles[0]) => {
    setEditUserForm({ id: u.id, name: u.name, email: u.email, phone: u.phone ?? '', role: u.role, branchId: u.branchId ?? '' });
    setEditUserOpen(true);
  };

  const handleEditUser = async () => {
    if (!editUserForm.name.trim()) { toast({ title: 'Name is required', variant: 'destructive' }); return; }
    if (editUserForm.role === 'Branch Pastor' && !editUserForm.branchId) {
      toast({ title: 'Branch required', description: 'Please assign a branch for the Branch Pastor.', variant: 'destructive' }); return;
    }
    setEditUserLoading(true);
    const { error } = await updateUserProfile(editUserForm.id, {
      name: editUserForm.name.trim(),
      phone: editUserForm.phone.trim(),
      role: editUserForm.role,
      branchId: editUserForm.role === 'Branch Pastor' ? editUserForm.branchId : undefined,
    });
    setEditUserLoading(false);
    if (error) { toast({ title: 'Failed to update user', description: error, variant: 'destructive' }); return; }
    toast({ title: 'User updated', description: `${editUserForm.name} has been updated.` });
    setEditUserOpen(false);
  };

  const promptDeleteUser = (userId: string, name: string) => {
    setDeletingUserId(userId);
    setConfirmDeleteName(name);
    setConfirmDeleteOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!deletingUserId) return;
    const { error } = await deleteUser(deletingUserId);
    setConfirmDeleteOpen(false);
    setDeletingUserId(null);
    if (error) toast({ title: 'Error', description: error, variant: 'destructive' });
    else toast({ title: 'User removed', description: `${confirmDeleteName} has been removed from the app.` });
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
          <TabsTrigger value="campuses" className="gap-2"><Building2 className="w-4 h-4" /> Branches</TabsTrigger>
          <TabsTrigger value="audit" className="gap-2"><ClipboardList className="w-4 h-4" /> Audit Log</TabsTrigger>
          <TabsTrigger value="roles" className="gap-2"><Shield className="w-4 h-4" /> Roles</TabsTrigger>
          {actions.canManageUsers && (
            <TabsTrigger value="users" className="gap-2"><Users2 className="w-4 h-4" /> Users</TabsTrigger>
          )}
          <TabsTrigger value="whatsapp" className="gap-2"><MessageCircle className="w-4 h-4" /> WhatsApp</TabsTrigger>
          <TabsTrigger value="subscription" className="gap-2"><CreditCard className="w-4 h-4" /> Subscription</TabsTrigger>
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

          {/* WhatsApp Notifications */}
          <Card className="glass border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><MessageCircle className="w-4 h-4 text-green-500" /> WhatsApp Notifications</CardTitle>
              <CardDescription>Automatically send greetings via WhatsApp. Requires WhatsApp to be connected.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-4 rounded-lg border border-border/40 bg-muted/20">
                <div>
                  <p className="font-medium text-sm">Birthday Greetings</p>
                  <p className="text-xs text-muted-foreground">Send a birthday message to members on their birthday</p>
                </div>
                <Switch checked={birthdayWA.birthdayEnabled} onCheckedChange={v => updateBirthdayWA('birthdayEnabled', v)} />
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg border border-border/40 bg-muted/20">
                <div>
                  <p className="font-medium text-sm">Join Anniversaries</p>
                  <p className="text-xs text-muted-foreground">Celebrate members' years of membership each year</p>
                </div>
                <Switch checked={birthdayWA.anniversaryEnabled} onCheckedChange={v => updateBirthdayWA('anniversaryEnabled', v)} />
              </div>
            </CardContent>
          </Card>

          {/* SMS Settings */}
          <Card className="glass border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><MessageSquare className="w-4 h-4 text-blue-500" /> SMS Settings (mNotify)</CardTitle>
              <CardDescription>Enter your mNotify API key to send bulk SMS directly from the app — no separate server needed.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>mNotify API Key</Label>
                <Input
                  type="password"
                  placeholder="Paste your mNotify API key…"
                  value={smsSettings.apiKey}
                  onChange={e => updateSmsSettings('apiKey', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Get your API key from <strong>mnotify.com</strong> → Account → API.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Sender ID</Label>
                <Input
                  placeholder="e.g. ChurchCare (max 11 chars)"
                  maxLength={11}
                  value={smsSettings.senderId}
                  onChange={e => updateSmsSettings('senderId', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">The name recipients see as the sender. Must be registered with mNotify.</p>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div>
                  <p className="text-sm font-medium">Auto SMS receipt on giving</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Send an SMS confirmation to members when their tithe or offering is recorded.</p>
                </div>
                <Switch checked={smsGivingReceipt} onCheckedChange={toggleSmsGivingReceipt} />
              </div>
            </CardContent>
          </Card>

          {/* EmailJS Settings */}
          <Card className="glass border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><MessageCircle className="w-4 h-4 text-orange-500" /> Email Settings (EmailJS)</CardTitle>
              <CardDescription>Connect EmailJS to send real emails from the Communication page — free up to 200/month, no backend needed.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 space-y-1">
                <p className="font-semibold">Setup steps:</p>
                <ol className="list-decimal list-inside space-y-0.5">
                  <li>Sign up at <strong>emailjs.com</strong> and connect your Gmail / Outlook</li>
                  <li>Create an email template with variables: <code className="bg-muted px-1 rounded">{'{{to_name}}'}</code> <code className="bg-muted px-1 rounded">{'{{to_email}}'}</code> <code className="bg-muted px-1 rounded">{'{{subject}}'}</code> <code className="bg-muted px-1 rounded">{'{{message}}'}</code> <code className="bg-muted px-1 rounded">{'{{from_name}}'}</code></li>
                  <li>Paste your Service ID, Template ID, and Public Key below</li>
                </ol>
              </div>
              <div className="space-y-1.5">
                <Label>Service ID</Label>
                <Input placeholder="e.g. service_xxxxxxx" value={emailjsSettings.serviceId} onChange={e => updateEmailjsSettings('serviceId', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Template ID</Label>
                <Input placeholder="e.g. template_xxxxxxx" value={emailjsSettings.templateId} onChange={e => updateEmailjsSettings('templateId', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Public Key</Label>
                <Input type="password" placeholder="Your EmailJS public key…" value={emailjsSettings.publicKey} onChange={e => updateEmailjsSettings('publicKey', e.target.value)} />
                <p className="text-xs text-muted-foreground">Found in EmailJS → Account → General → Public Key.</p>
              </div>
              {emailjsSettings.serviceId && emailjsSettings.templateId && emailjsSettings.publicKey && (
                <p className="text-xs text-sage-600 dark:text-sage-400 flex items-center gap-1">✓ EmailJS configured — email sending is enabled.</p>
              )}
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

        {/* Branches Tab */}
        <TabsContent value="campuses" className="mt-0">
          <Card className="glass border-none shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5 text-navy-500" /> Branches</CardTitle>
                  <CardDescription>
                    {campuses.length}{features.branchLimit !== null ? `/${features.branchLimit}` : ''} branch{campuses.length !== 1 ? 'es' : ''} configured.
                    {features.branchLimit !== null && campuses.length >= features.branchLimit && (
                      <span className="ml-2 text-amber-600 dark:text-amber-400 font-medium">Branch limit reached — upgrade to add more.</span>
                    )}
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={openAddCampus}
                  disabled={features.branchLimit !== null && campuses.length >= features.branchLimit}
                  className="gap-2 bg-white hover:bg-gray-50 text-navy-900 font-medium disabled:opacity-50"
                >
                  Add Branch
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {campuses.length === 0 && <p className="text-sm text-muted-foreground">No branches yet.</p>}
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
                { role: 'Administrator' as UserRole, desc: 'Full access to all branches, modules, settings, and user management.' },
                { role: 'Branch Pastor' as UserRole, desc: 'Oversees a single branch — members, attendance, giving, communication, reports, prayer, volunteers, and pastoral care for their branch only.' },
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
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <CardTitle className="flex items-center gap-2"><Users2 className="w-5 h-5 text-navy-500" /> User Accounts</CardTitle>
                    <CardDescription>
                      {allProfiles.length}{features.userLimit !== null ? `/${features.userLimit}` : ''} account{allProfiles.length !== 1 ? 's' : ''} registered
                      {features.userLimit !== null && allProfiles.length >= features.userLimit && (
                        <span className="ml-2 text-amber-600 dark:text-amber-400 font-medium">User limit reached — upgrade to add more.</span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-2" onClick={refreshProfiles}>
                      <Loader2 className="w-3.5 h-3.5" /> Refresh
                    </Button>
                    <Button
                      size="sm"
                      className="gap-2 bg-white hover:bg-gray-50 text-navy-900 font-medium disabled:opacity-50"
                      disabled={features.userLimit !== null && allProfiles.length >= features.userLimit}
                      onClick={() => setAddUserOpen(true)}
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Add User
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {allProfiles.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4 text-center">No users found. Add your first user above.</p>
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
                        {u.phone && <p className="text-xs text-muted-foreground">{u.phone}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${ROLE_BADGE[u.role]}`}>{u.role}</span>
                      <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => openEditUser(u)}
                        title="Edit user"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        disabled={u.id === profile?.id}
                        onClick={() => promptDeleteUser(u.id, u.name)}
                        title="Delete user"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
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
                Connect your Meta WhatsApp Business account. Once configured, messages from Communication and Task Assignment use this account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WhatsAppConnect sessionId={profile?.churchId ?? 'default'} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscription Tab */}
        <TabsContent value="subscription" className="mt-0 space-y-4">
          {/* Current plan banner */}
          <Card className="glass border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-gold-500" /> Your Plan
              </CardTitle>
              <CardDescription>
                You are currently on the <strong>{PLAN_LABELS[currentPlan]}</strong> plan.
                {currentPlan === 'starter' && ' Activate a code below to unlock more features.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`rounded-xl border-2 p-5 ${PLAN_COLORS[currentPlan].border} bg-muted/20`}>
                <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                  <div>
                    <p className={`text-xl font-bold ${PLAN_COLORS[currentPlan].title}`}>{PLAN_LABELS[currentPlan]} Plan</p>
                    <p className="text-sm text-muted-foreground">{planPriceDisplay(currentPlan)}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${PLAN_COLORS[currentPlan].badgeBg}`}>
                    Active
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {PLAN_HIGHLIGHTS[currentPlan].map(h => (
                    <li key={h} className="flex items-start gap-2 text-sm">
                      <Check className={`w-4 h-4 shrink-0 mt-0.5 ${PLAN_COLORS[currentPlan].check}`} />
                      <span className="text-muted-foreground">{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Plan comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {(['free', 'starter', 'growth', 'pro', 'custom'] as Plan[]).map(p => {
              const isCurrent = p === currentPlan;
              const colors = PLAN_COLORS[p];
              return (
                <div key={p} className={`relative rounded-xl border-2 p-5 flex flex-col gap-3 ${isCurrent ? `${colors.border} bg-muted/20` : 'border-border/40 bg-muted/5 opacity-70'}`}>
                  {isCurrent && (
                    <span className={`absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${colors.badgeBg}`}>
                      Current
                    </span>
                  )}
                  <div>
                    <p className={`text-base font-bold ${isCurrent ? colors.title : ''}`}>{PLAN_LABELS[p]}</p>
                    <p className="text-sm text-muted-foreground">{planPriceDisplay(p)}</p>
                  </div>
                  <ul className="space-y-1 flex-1">
                    {PLAN_HIGHLIGHTS[p].map(h => (
                      <li key={h} className="flex items-start gap-2 text-xs">
                        <Check className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${colors.check}`} />
                        <span className="text-muted-foreground">{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* Activation code — only show if not already on Pro, and only to admins */}
          {actions.canManageUsers && currentPlan !== 'pro' && (
            <Card className="glass border-none shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-gold-500" /> Activate Your Plan
                </CardTitle>
                <CardDescription>
                  Enter the activation code you received after purchasing a Growth or Pro plan.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. GRACE-CHAPEL-PRO-2024"
                    value={activationCode}
                    onChange={e => { setActivationCode(e.target.value.toUpperCase()); setActivationError(''); }}
                    className="font-mono tracking-widest uppercase"
                    disabled={activating}
                  />
                  <Button
                    className="gap-2 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold shrink-0"
                    disabled={activating || !activationCode.trim()}
                    onClick={async () => {
                      setActivating(true);
                      setActivationError('');
                      const { error, plan } = await activatePlan(activationCode);
                      setActivating(false);
                      if (error) {
                        setActivationError(error);
                      } else {
                        setActivationCode('');
                        toast({ title: '🎉 Plan activated!', description: `Your account has been upgraded to the ${PLAN_LABELS[plan!]} plan.` });
                      }
                    }}
                  >
                    {activating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {activating ? 'Activating…' : 'Activate'}
                  </Button>
                </div>
                {activationError && (
                  <p className="text-sm text-destructive flex items-center gap-1.5">
                    <span>⚠</span> {activationError}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Don't have a code?{' '}
                  <a href="mailto:support@faithchurchcare.com" className="underline underline-offset-2 hover:text-foreground transition-colors">
                    Contact us
                  </a>{' '}
                  to purchase a Growth or Pro plan.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Add User Dialog */}
      <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Add User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input placeholder="e.g. John Mensah" value={addUserForm.name} onChange={e => setAddUserForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Email Address *</Label>
              <Input type="email" placeholder="john@church.org" value={addUserForm.email} onChange={e => setAddUserForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Temporary Password *</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 6 characters"
                  value={addUserForm.password}
                  onChange={e => setAddUserForm(f => ({ ...f, password: e.target.value }))}
                  className="pr-10"
                />
                <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Share this password with the user so they can sign in.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Phone Number</Label>
              <Input placeholder="+233 XX XXX XXXX" value={addUserForm.phone} onChange={e => setAddUserForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Role *</Label>
              <Select value={addUserForm.role} onValueChange={v => { setAddUserForm(f => ({ ...f, role: v as UserRole })); setAddUserBranchId(''); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {addUserForm.role === 'Branch Pastor' && (
              <div className="space-y-1.5">
                <Label>Assign to Branch *</Label>
                <Select value={addUserBranchId} onValueChange={setAddUserBranchId}>
                  <SelectTrigger><SelectValue placeholder="Select branch…" /></SelectTrigger>
                  <SelectContent>
                    {campuses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddUserOpen(false)}>Cancel</Button>
            <Button onClick={handleAddUser} disabled={addUserLoading} className="gap-2 bg-white hover:bg-gray-50 text-navy-900 font-medium">
              {addUserLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {addUserLoading ? 'Creating…' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editUserOpen} onOpenChange={setEditUserOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input value={editUserForm.name} onChange={e => setEditUserForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. John Mensah" />
            </div>
            <div className="space-y-1.5">
              <Label>Email Address</Label>
              <Input value={editUserForm.email} disabled className="opacity-50 cursor-not-allowed" />
              <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Phone Number</Label>
              <Input value={editUserForm.phone} onChange={e => setEditUserForm(f => ({ ...f, phone: e.target.value }))} placeholder="+233 XX XXX XXXX" />
            </div>
            <div className="space-y-1.5">
              <Label>Role *</Label>
              <Select value={editUserForm.role} onValueChange={v => setEditUserForm(f => ({ ...f, role: v as UserRole, branchId: '' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {editUserForm.role === 'Branch Pastor' && (
              <div className="space-y-1.5">
                <Label>Assign to Branch *</Label>
                <Select value={editUserForm.branchId} onValueChange={v => setEditUserForm(f => ({ ...f, branchId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select branch…" /></SelectTrigger>
                  <SelectContent>
                    {campuses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUserOpen(false)}>Cancel</Button>
            <Button onClick={handleEditUser} disabled={editUserLoading} className="gap-2">
              {editUserLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editUserLoading ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation */}
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Remove User?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            This will remove <strong>{confirmDeleteName}</strong> from the app. They will lose their role and no longer appear here.
            Their Supabase Auth account remains — contact your Supabase dashboard to fully revoke login access.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteUser} className="gap-2">
              <Trash2 className="w-4 h-4" /> Remove User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Branch Dialog */}
      <Dialog open={campusDialogOpen} onOpenChange={setCampusDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{editingCampus ? 'Edit Branch' : 'Add Branch'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Branch Name *</Label>
              <Input placeholder="e.g. North Branch" value={campusForm.name} onChange={e => setCampusForm(f => ({ ...f, name: e.target.value }))} />
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
              <p className="text-sm font-medium">Main Branch</p>
              <Switch checked={campusForm.isMain} onCheckedChange={v => setCampusForm(f => ({ ...f, isMain: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCampusDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveCampus} className="bg-white hover:bg-gray-50 text-navy-900 font-medium">{editingCampus ? 'Save Changes' : 'Add Branch'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
