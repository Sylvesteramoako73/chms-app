import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useData } from '@/context/DataContext';
import type { Campaign, Pledge } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Target, TrendingUp, Users, DollarSign, Pencil, Trash2, CreditCard } from 'lucide-react';
import { format } from 'date-fns';

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
      <div className="h-full rounded-full bg-sage-500 transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

const EMPTY_CAMPAIGN = { title: '', description: '', goalAmount: '', startDate: format(new Date(), 'yyyy-MM-dd'), endDate: '', isActive: true };
const EMPTY_PLEDGE = { campaignId: '', memberId: '', pledgeAmount: '', notes: '' };
const EMPTY_PAYMENT = { amount: '', date: format(new Date(), 'yyyy-MM-dd'), notes: '' };

export default function Pledges() {
  const { campaigns, pledges, pledgePayments, members, addCampaign, updateCampaign, deleteCampaign, addPledge, updatePledge, deletePledge, recordPledgePayment } = useData();
  const { toast } = useToast();

  const [filterCampaignId, setFilterCampaignId] = useState<string>('all');
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [campaignForm, setCampaignForm] = useState(EMPTY_CAMPAIGN);

  const [pledgeDialogOpen, setPledgeDialogOpen] = useState(false);
  const [editingPledge, setEditingPledge] = useState<Pledge | null>(null);
  const [pledgeForm, setPledgeForm] = useState(EMPTY_PLEDGE);

  const [paymentDialogPledge, setPaymentDialogPledge] = useState<Pledge | null>(null);
  const [paymentForm, setPaymentForm] = useState(EMPTY_PAYMENT);

  const campaignTotals = useMemo(() => {
    const map: Record<string, { raised: number; pledgeCount: number }> = {};
    for (const c of campaigns) map[c.id] = { raised: 0, pledgeCount: 0 };
    for (const p of pledges) {
      if (map[p.campaignId]) {
        map[p.campaignId].raised += p.paidAmount;
        map[p.campaignId].pledgeCount++;
      }
    }
    return map;
  }, [campaigns, pledges]);

  const totalRaised = Object.values(campaignTotals).reduce((s, v) => s + v.raised, 0);
  const totalPledged = pledges.reduce((s, p) => s + p.pledgeAmount, 0);

  const filteredPledges = filterCampaignId === 'all' ? pledges : pledges.filter(p => p.campaignId === filterCampaignId);

  const getMemberName = (id?: string) => {
    if (!id) return 'Anonymous';
    const m = members.find(x => x.id === id);
    return m ? `${m.firstName} ${m.lastName}` : 'Unknown';
  };

  const getCampaignTitle = (id: string) => campaigns.find(c => c.id === id)?.title ?? 'Unknown';

  // Campaign CRUD
  const openAddCampaign = () => { setEditingCampaign(null); setCampaignForm(EMPTY_CAMPAIGN); setCampaignDialogOpen(true); };
  const openEditCampaign = (c: Campaign) => {
    setEditingCampaign(c);
    setCampaignForm({ title: c.title, description: c.description ?? '', goalAmount: c.goalAmount.toString(), startDate: c.startDate, endDate: c.endDate ?? '', isActive: c.isActive });
    setCampaignDialogOpen(true);
  };
  const handleSaveCampaign = () => {
    if (!campaignForm.title.trim() || !campaignForm.goalAmount) {
      toast({ title: 'Validation error', description: 'Title and goal amount are required.', variant: 'destructive' });
      return;
    }
    const data = { title: campaignForm.title.trim(), description: campaignForm.description.trim() || undefined, goalAmount: parseFloat(campaignForm.goalAmount), startDate: campaignForm.startDate, endDate: campaignForm.endDate || undefined, isActive: campaignForm.isActive };
    if (editingCampaign) {
      updateCampaign({ ...editingCampaign, ...data });
      toast({ title: 'Campaign updated' });
    } else {
      addCampaign({ id: `camp${Date.now()}`, ...data });
      toast({ title: 'Campaign created', description: `"${data.title}" is live.` });
    }
    setCampaignDialogOpen(false);
  };
  const handleDeleteCampaign = (c: Campaign) => {
    deleteCampaign(c.id);
    toast({ title: 'Campaign deleted', description: `"${c.title}" removed.` });
  };

  // Pledge CRUD
  const openAddPledge = () => { setEditingPledge(null); setPledgeForm(EMPTY_PLEDGE); setPledgeDialogOpen(true); };
  const openEditPledge = (p: Pledge) => {
    setEditingPledge(p);
    setPledgeForm({ campaignId: p.campaignId, memberId: p.memberId ?? '', pledgeAmount: p.pledgeAmount.toString(), notes: p.notes ?? '' });
    setPledgeDialogOpen(true);
  };
  const handleSavePledge = () => {
    if (!pledgeForm.campaignId || !pledgeForm.pledgeAmount) {
      toast({ title: 'Validation error', description: 'Campaign and pledge amount are required.', variant: 'destructive' });
      return;
    }
    const data = { campaignId: pledgeForm.campaignId, memberId: pledgeForm.memberId || undefined, pledgeAmount: parseFloat(pledgeForm.pledgeAmount), notes: pledgeForm.notes.trim() || undefined };
    if (editingPledge) {
      updatePledge({ ...editingPledge, ...data });
      toast({ title: 'Pledge updated' });
    } else {
      addPledge({ id: `pl${Date.now()}`, ...data, paidAmount: 0, pledgeDate: format(new Date(), 'yyyy-MM-dd') });
      toast({ title: 'Pledge recorded', description: `₵${data.pledgeAmount.toLocaleString()} pledge added.` });
    }
    setPledgeDialogOpen(false);
  };
  const handleDeletePledge = (p: Pledge) => {
    deletePledge(p.id);
    toast({ title: 'Pledge deleted' });
  };

  // Payment
  const openPayment = (p: Pledge) => { setPaymentDialogPledge(p); setPaymentForm(EMPTY_PAYMENT); };
  const handleRecordPayment = () => {
    if (!paymentForm.amount || !paymentDialogPledge) return;
    const amount = parseFloat(paymentForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Invalid amount', variant: 'destructive' });
      return;
    }
    recordPledgePayment({ id: `pp${Date.now()}`, pledgeId: paymentDialogPledge.id, amount, date: paymentForm.date, notes: paymentForm.notes.trim() || undefined });
    toast({ title: 'Payment recorded', description: `₵${amount.toLocaleString()} recorded.` });
    setPaymentDialogPledge(null);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold text-navy-900 dark:text-cream mb-1">Pledges & Campaigns</h1>
          <p className="text-sm text-muted-foreground">{campaigns.filter(c => c.isActive).length} active campaigns · {pledges.length} pledges</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={openAddPledge} className="gap-1.5">
            <Plus className="w-4 h-4" /> Add Pledge
          </Button>
          <Button size="sm" onClick={openAddCampaign} className="gap-2 bg-white hover:bg-gray-50 text-navy-900 font-medium">
            <Plus className="w-4 h-4" /> New Campaign
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Campaigns', value: campaigns.length, icon: Target, color: 'text-navy-500 dark:text-navy-300' },
          { label: 'Total Pledged', value: `₵${totalPledged.toLocaleString()}`, icon: TrendingUp, color: 'text-blue-500' },
          { label: 'Total Raised', value: `₵${totalRaised.toLocaleString()}`, icon: DollarSign, color: 'text-sage-500' },
          { label: 'Pledgers', value: pledges.length, icon: Users, color: 'text-gold-500' },
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

      {/* Campaign Cards */}
      {campaigns.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map(c => {
            const totals = campaignTotals[c.id] ?? { raised: 0, pledgeCount: 0 };
            const pct = c.goalAmount > 0 ? Math.min(Math.round((totals.raised / c.goalAmount) * 100), 100) : 0;
            return (
              <Card key={c.id} className="glass border-none shadow-sm">
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm font-semibold">{c.title}</CardTitle>
                      <CardDescription className="text-xs mt-0.5">{c.isActive ? <span className="text-sage-500 font-medium">Active</span> : 'Closed'} · {totals.pledgeCount} pledges</CardDescription>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditCampaign(c)}><Pencil className="w-3 h-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteCampaign(c)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2">
                  {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
                  <ProgressBar value={totals.raised} max={c.goalAmount} />
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">₵{totals.raised.toLocaleString()} raised</span>
                    <span className="font-medium">{pct}% of ₵{c.goalAmount.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pledges Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-semibold">Pledges</h2>
          <Select value={filterCampaignId} onValueChange={setFilterCampaignId}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All Campaigns" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              {campaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {filteredPledges.length === 0 ? (
          <div className="glass rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
            No pledges yet.
          </div>
        ) : (
          <div className="glass rounded-xl border-none shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Member</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Campaign</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Pledged</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Paid</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Progress</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Date</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filteredPledges.map(p => {
                    const paidPct = p.pledgeAmount > 0 ? Math.min(Math.round((p.paidAmount / p.pledgeAmount) * 100), 100) : 0;
                    const fulfilled = paidPct >= 100;
                    const paymentsForPledge = pledgePayments.filter(pp => pp.pledgeId === p.id);
                    return (
                      <tr key={p.id} className="border-b border-border/20 last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-medium">{getMemberName(p.memberId)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{getCampaignTitle(p.campaignId)}</td>
                        <td className="px-4 py-3 text-right">₵{p.pledgeAmount.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right">₵{p.paidAmount.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 min-w-[80px]">
                            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full bg-sage-500" style={{ width: `${paidPct}%` }} />
                            </div>
                            <span className={`text-xs shrink-0 ${fulfilled ? 'text-sage-500 font-medium' : 'text-muted-foreground'}`}>{paidPct}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{format(new Date(p.pledgeDate), 'MMM d, yyyy')}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 justify-end">
                            {!fulfilled && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-sage-600" title={`${paymentsForPledge.length} payment(s)`} onClick={() => openPayment(p)}><CreditCard className="w-3 h-3" /></Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditPledge(p)}><Pencil className="w-3 h-3" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeletePledge(p)}><Trash2 className="w-3 h-3" /></Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Campaign Dialog */}
      <Dialog open={campaignDialogOpen} onOpenChange={setCampaignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{editingCampaign ? 'Edit Campaign' : 'New Campaign'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input placeholder="e.g. Building Fund 2025" value={campaignForm.title} onChange={e => setCampaignForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea rows={2} value={campaignForm.description} onChange={e => setCampaignForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Goal Amount (₵) *</Label>
                <Input type="number" min={0} value={campaignForm.goalAmount} onChange={e => setCampaignForm(f => ({ ...f, goalAmount: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input type="date" value={campaignForm.startDate} onChange={e => setCampaignForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>End Date (optional)</Label>
              <Input type="date" value={campaignForm.endDate} onChange={e => setCampaignForm(f => ({ ...f, endDate: e.target.value }))} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-muted/20">
              <p className="text-sm font-medium">Active Campaign</p>
              <Switch checked={campaignForm.isActive} onCheckedChange={v => setCampaignForm(f => ({ ...f, isActive: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCampaignDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveCampaign} className="bg-white hover:bg-gray-50 text-navy-900 font-medium">{editingCampaign ? 'Save Changes' : 'Create Campaign'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pledge Dialog */}
      <Dialog open={pledgeDialogOpen} onOpenChange={setPledgeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{editingPledge ? 'Edit Pledge' : 'Record Pledge'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Campaign *</Label>
              <Select value={pledgeForm.campaignId} onValueChange={v => setPledgeForm(f => ({ ...f, campaignId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select campaign…" /></SelectTrigger>
                <SelectContent>{campaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Member (optional)</Label>
              <Select value={pledgeForm.memberId || 'anon'} onValueChange={v => setPledgeForm(f => ({ ...f, memberId: v === 'anon' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Anonymous" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="anon">Anonymous</SelectItem>
                  {members.map(m => <SelectItem key={m.id} value={m.id}>{m.firstName} {m.lastName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Pledge Amount (₵) *</Label>
              <Input type="number" min={0} value={pledgeForm.pledgeAmount} onChange={e => setPledgeForm(f => ({ ...f, pledgeAmount: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={2} value={pledgeForm.notes} onChange={e => setPledgeForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPledgeDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSavePledge} className="bg-white hover:bg-gray-50 text-navy-900 font-medium">{editingPledge ? 'Save Changes' : 'Record Pledge'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={!!paymentDialogPledge} onOpenChange={() => setPaymentDialogPledge(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Record Payment</DialogTitle>
          </DialogHeader>
          {paymentDialogPledge && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                {getMemberName(paymentDialogPledge.memberId)} — {getCampaignTitle(paymentDialogPledge.campaignId)}<br />
                Remaining: <strong>₵{(paymentDialogPledge.pledgeAmount - paymentDialogPledge.paidAmount).toLocaleString()}</strong>
              </p>
              <div className="space-y-1.5">
                <Label>Amount (₵) *</Label>
                <Input type="number" min={0} max={paymentDialogPledge.pledgeAmount - paymentDialogPledge.paidAmount} value={paymentForm.amount} onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={paymentForm.date} onChange={e => setPaymentForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea rows={2} value={paymentForm.notes} onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogPledge(null)}>Cancel</Button>
            <Button onClick={handleRecordPayment} className="bg-white hover:bg-gray-50 text-navy-900 font-medium">
              <CreditCard className="w-4 h-4 mr-2" /> Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
