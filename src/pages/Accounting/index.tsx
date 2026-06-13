import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAccounting, type GlAccount, type GlTransaction } from '@/context/AccountingContext';
import { useData } from '@/context/DataContext';
import { useRole } from '@/context/RoleContext';
import { useAuth } from '@/context/AuthContext';
import { useCampus } from '@/context/CampusContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import {
  Landmark, Plus, Trash2, TrendingUp, TrendingDown, Wallet,
  Target, Search, Pencil, AlertCircle,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, startOfYear, endOfYear } from 'date-fns';

const GHS = '₵';

const ACCOUNT_TYPE_BADGE: Record<string, string> = {
  income:    'bg-sage-500/10 text-sage-700 dark:text-sage-400',
  expense:   'bg-red-500/10 text-red-700 dark:text-red-400',
  asset:     'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  liability: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
  equity:    'bg-purple-500/10 text-purple-700 dark:text-purple-400',
};

const EMPTY_TX: Omit<GlTransaction, 'id' | 'createdAt' | 'createdBy'> = {
  date: format(new Date(), 'yyyy-MM-dd'),
  description: '',
  accountId: '',
  amount: 0,
  type: 'expense',
  campusId: null,
  reference: null,
};

const EMPTY_ACCOUNT: Omit<GlAccount, 'id' | 'createdAt'> = {
  code: '',
  name: '',
  type: 'expense',
  campusId: null,
  isGivingSync: false,
};

export default function Accounting() {
  const { accounts, transactions, budgets, addTransaction, updateTransaction, deleteTransaction, upsertBudget, addAccount, updateAccount, deleteAccount } = useAccounting();
  const { giving, campuses } = useData();
  const { actions } = useRole();
  const { profile } = useAuth();
  const { selectedCampusId, isLocked } = useCampus();
  const { toast } = useToast();

  const canEdit = actions.canManageGiving;

  // ── Period state ──────────────────────────────────────────────────────────
  const currentYear = new Date().getFullYear();
  const [ovYear, setOvYear] = useState(currentYear);
  const [budgetYear, setBudgetYear] = useState(currentYear);
  const [txSearch, setTxSearch] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState<'all' | 'income' | 'expense'>('all');

  // ── Campus filter ────────────────────────────────────────────────────────
  // When "All Branches" is selected, campusId is null (admin view across all branches).
  // Branch Pastors always have a specific campusId via isLocked.
  const campusId = selectedCampusId === 'all' ? null : selectedCampusId;
  const viewingAll = campusId === null && !isLocked;

  const filteredGiving = useMemo(() =>
    campusId ? giving.filter(g => g.campusId === campusId) : giving,
    [giving, campusId]);

  const filteredTx = useMemo(() =>
    campusId ? transactions.filter(t => t.campusId === campusId) : transactions,
    [transactions, campusId]);

  const filteredBudgets = useMemo(() =>
    campusId ? budgets.filter(b => b.campusId === campusId || b.campusId === null) : budgets,
    [budgets, campusId]);

  // ── Overview calculations ─────────────────────────────────────────────────
  const yearStart = startOfYear(new Date(ovYear, 0, 1));
  const yearEnd = endOfYear(new Date(ovYear, 0, 1));

  const yearGiving = filteredGiving.filter(g => {
    const d = new Date(g.date); return d >= yearStart && d <= yearEnd;
  });
  const yearIncomeTx = filteredTx.filter(t => {
    const d = new Date(t.date); return t.type === 'income' && d >= yearStart && d <= yearEnd;
  });
  const yearExpenseTx = filteredTx.filter(t => {
    const d = new Date(t.date); return t.type === 'expense' && d >= yearStart && d <= yearEnd;
  });

  const totalGivingYTD = yearGiving.reduce((s, g) => s + g.amount, 0);
  const totalOtherIncomeYTD = yearIncomeTx.reduce((s, t) => s + t.amount, 0);
  const totalIncomeYTD = totalGivingYTD + totalOtherIncomeYTD;
  const totalExpensesYTD = yearExpenseTx.reduce((s, t) => s + t.amount, 0);
  const netYTD = totalIncomeYTD - totalExpensesYTD;

  const totalBudgeted = filteredBudgets
    .filter(b => b.year === ovYear && b.month === null)
    .reduce((s, b) => s + b.amount, 0);

  // Monthly chart data (last 6 months)
  const chartMonths = useMemo(() => {
    const months = eachMonthOfInterval({ start: subMonths(new Date(), 5), end: new Date() });
    return months.map(month => {
      const s = startOfMonth(month); const e = endOfMonth(month);
      const giving = filteredGiving.filter(g => { const d = new Date(g.date); return d >= s && d <= e; })
        .reduce((sum, g) => sum + g.amount, 0);
      const income = filteredTx.filter(t => { const d = new Date(t.date); return t.type === 'income' && d >= s && d <= e; })
        .reduce((sum, t) => sum + t.amount, 0);
      const expenses = filteredTx.filter(t => { const d = new Date(t.date); return t.type === 'expense' && d >= s && d <= e; })
        .reduce((sum, t) => sum + t.amount, 0);
      return { name: format(month, 'MMM yy'), Income: giving + income, Expenses: expenses };
    });
  }, [filteredGiving, filteredTx]);

  // ── Transaction dialog ────────────────────────────────────────────────────
  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<GlTransaction | null>(null);
  const [txForm, setTxForm] = useState({ ...EMPTY_TX });
  const [txSaving, setTxSaving] = useState(false);

  const openAddTx = () => {
    setEditingTx(null);
    setTxForm({ ...EMPTY_TX, campusId: campusId });
    setTxDialogOpen(true);
  };

  const openEditTx = (tx: GlTransaction) => {
    setEditingTx(tx);
    setTxForm({ date: tx.date, description: tx.description, accountId: tx.accountId, amount: tx.amount, type: tx.type, campusId: tx.campusId, reference: tx.reference });
    setTxDialogOpen(true);
  };

  const saveTx = async () => {
    if (!txForm.description || !txForm.accountId || !txForm.amount) {
      toast({ title: 'Missing fields', description: 'Fill in all required fields.', variant: 'destructive' }); return;
    }
    if (!txForm.campusId) {
      toast({ title: 'Branch required', description: 'Please select a branch for this transaction.', variant: 'destructive' }); return;
    }
    setTxSaving(true);
    try {
      if (editingTx) {
        await updateTransaction({ ...editingTx, ...txForm, amount: Number(txForm.amount) });
      } else {
        await addTransaction({
          id: crypto.randomUUID(),
          ...txForm,
          amount: Number(txForm.amount),
          createdBy: profile?.id ?? null,
          createdAt: new Date().toISOString(),
        });
      }
      setTxDialogOpen(false);
      toast({ title: editingTx ? 'Transaction updated' : 'Transaction added' });
    } catch {
      toast({ title: 'Error saving transaction', variant: 'destructive' });
    } finally {
      setTxSaving(false);
    }
  };

  const handleDeleteTx = async (id: string) => {
    try {
      await deleteTransaction(id);
      toast({ title: 'Transaction deleted' });
    } catch {
      toast({ title: 'Error deleting transaction', variant: 'destructive' });
    }
  };

  // ── Account dialog ────────────────────────────────────────────────────────
  const [acDialogOpen, setAcDialogOpen] = useState(false);
  const [editingAc, setEditingAc] = useState<GlAccount | null>(null);
  const [acForm, setAcForm] = useState({ ...EMPTY_ACCOUNT });
  const [acSaving, setAcSaving] = useState(false);

  const openAddAc = () => {
    setEditingAc(null);
    setAcForm({ ...EMPTY_ACCOUNT });
    setAcDialogOpen(true);
  };

  const openEditAc = (ac: GlAccount) => {
    setEditingAc(ac);
    setAcForm({ code: ac.code, name: ac.name, type: ac.type, campusId: ac.campusId, isGivingSync: ac.isGivingSync });
    setAcDialogOpen(true);
  };

  const saveAccount = async () => {
    if (!acForm.code || !acForm.name) {
      toast({ title: 'Missing fields', description: 'Code and name are required.', variant: 'destructive' }); return;
    }
    setAcSaving(true);
    try {
      if (editingAc) {
        await updateAccount({ ...editingAc, ...acForm });
      } else {
        await addAccount({ id: crypto.randomUUID(), ...acForm, createdAt: new Date().toISOString() });
      }
      setAcDialogOpen(false);
      toast({ title: editingAc ? 'Account updated' : 'Account added' });
    } catch {
      toast({ title: 'Error saving account', variant: 'destructive' });
    } finally {
      setAcSaving(false);
    }
  };

  const handleDeleteAc = async (id: string) => {
    const hasTransactions = transactions.some(t => t.accountId === id);
    if (hasTransactions) {
      toast({ title: 'Cannot delete', description: 'This account has existing transactions.', variant: 'destructive' }); return;
    }
    try {
      await deleteAccount(id);
      toast({ title: 'Account deleted' });
    } catch {
      toast({ title: 'Error deleting account', variant: 'destructive' });
    }
  };

  // ── Budget inline edit ────────────────────────────────────────────────────
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [budgetInput, setBudgetInput] = useState('');

  const saveBudget = async (accountId: string) => {
    const amount = parseFloat(budgetInput);
    if (isNaN(amount) || amount < 0) { setEditingBudgetId(null); return; }
    if (!campusId) {
      toast({ title: 'Select a branch first', description: 'Use the branch selector in the sidebar to pick a branch before setting a budget.', variant: 'destructive' });
      setEditingBudgetId(null); return;
    }
    const existing = filteredBudgets.find(b => b.accountId === accountId && b.year === budgetYear && b.month === null);
    try {
      await upsertBudget({
        id: existing?.id ?? crypto.randomUUID(),
        accountId,
        year: budgetYear,
        month: null,
        amount,
        campusId: campusId,
      });
      toast({ title: 'Budget saved' });
    } catch {
      toast({ title: 'Error saving budget', variant: 'destructive' });
    }
    setEditingBudgetId(null);
  };

  // ── Filtered transactions for list ────────────────────────────────────────
  const displayedTx = useMemo(() => {
    const q = txSearch.toLowerCase();
    return filteredTx.filter(t => {
      const acName = accounts.find(a => a.id === t.accountId)?.name ?? '';
      const matchSearch = !q || t.description.toLowerCase().includes(q) || acName.toLowerCase().includes(q) || (t.reference ?? '').toLowerCase().includes(q);
      const matchType = txTypeFilter === 'all' || t.type === txTypeFilter;
      return matchSearch && matchType;
    });
  }, [filteredTx, accounts, txSearch, txTypeFilter]);

  // ── Budget data ───────────────────────────────────────────────────────────
  const totalGivingBudgetYear = useMemo(() =>
    filteredGiving.filter(g => new Date(g.date).getFullYear() === budgetYear).reduce((s, g) => s + g.amount, 0),
    [filteredGiving, budgetYear]);

  const budgetRows = useMemo(() => {
    // Exclude isGivingSync accounts — giving is shown as a single aggregate row below
    const allAccounts = accounts.filter(a => (a.type === 'income' || a.type === 'expense') && !a.isGivingSync);
    return allAccounts.map(ac => {
      const budget = filteredBudgets.find(b => b.accountId === ac.id && b.year === budgetYear && b.month === null);
      const budgetAmt = budget?.amount ?? 0;
      const actualAmt = filteredTx
        .filter(t => { const d = new Date(t.date); return t.accountId === ac.id && d.getFullYear() === budgetYear; })
        .reduce((s, t) => s + t.amount, 0);
      const variance = budgetAmt > 0 ? budgetAmt - actualAmt : null;
      const pct = budgetAmt > 0 ? Math.round((actualAmt / budgetAmt) * 100) : null;
      return { ac, budgetAmt, actualAmt, variance, pct, budgetId: budget?.id };
    });
  }, [accounts, filteredBudgets, filteredTx, budgetYear]);

  const tooltipStyle = { borderRadius: '8px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', background: 'hsl(var(--card))' };

  const incomeAccounts = accounts.filter(a => a.type === 'income');
  const expenseAccounts = accounts.filter(a => a.type === 'expense');
  const txAccounts = txForm.type === 'income' ? incomeAccounts : expenseAccounts;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div>
        <h1 className="text-4xl font-display font-bold text-navy-900 dark:text-cream mb-1">Accounting</h1>
        <p className="text-sm text-muted-foreground">Track income, expenses, and budgets across your church.</p>
      </div>

      {accounts.length === 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/10 p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm text-amber-800 dark:text-amber-300">Database tables not set up yet</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">Run the accounting SQL in your Supabase SQL editor to create the required tables and default chart of accounts.</p>
          </div>
        </div>
      )}

      {viewingAll && (
        <div className="rounded-xl border border-blue-200 dark:border-blue-800/40 bg-blue-50 dark:bg-blue-900/10 p-3 flex gap-3 items-center">
          <AlertCircle className="w-4 h-4 text-blue-500 shrink-0" />
          <p className="text-xs text-blue-700 dark:text-blue-300">
            Viewing combined data across <strong>all branches</strong>. Select a specific branch in the sidebar to filter by branch, or to add transactions and set budgets.
          </p>
        </div>
      )}

      <Tabs defaultValue="overview">
        <TabsList className="mb-6">
          <TabsTrigger value="overview"  className="gap-2"><Wallet className="w-4 h-4" /> Overview</TabsTrigger>
          <TabsTrigger value="transactions" className="gap-2"><TrendingDown className="w-4 h-4" /> Transactions</TabsTrigger>
          <TabsTrigger value="budget"    className="gap-2"><Target className="w-4 h-4" /> Budget</TabsTrigger>
          <TabsTrigger value="accounts"  className="gap-2"><Landmark className="w-4 h-4" /> Chart of Accounts</TabsTrigger>
        </TabsList>

        {/* ── Overview ── */}
        <TabsContent value="overview" className="space-y-6 mt-0">
          <div className="flex items-center gap-3">
            <Label className="text-sm shrink-0">Year</Label>
            <Select value={String(ovYear)} onValueChange={v => setOvYear(Number(v))}>
              <SelectTrigger className="w-28 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[currentYear - 2, currentYear - 1, currentYear].map(yr => (
                  <SelectItem key={yr} value={String(yr)}>{yr}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="glass border-none shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-sage-500" />
                  <p className="text-xs text-muted-foreground">Total Income</p>
                </div>
                <p className="text-2xl font-bold">{GHS}{totalIncomeYTD.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">Giving + Other Income</p>
              </CardContent>
            </Card>
            <Card className="glass border-none shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-4 h-4 text-red-500" />
                  <p className="text-xs text-muted-foreground">Total Expenses</p>
                </div>
                <p className="text-2xl font-bold">{GHS}{totalExpensesYTD.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className={`glass border-none shadow-sm ${netYTD >= 0 ? '' : 'border-red-200 dark:border-red-800/40'}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className={`w-4 h-4 ${netYTD >= 0 ? 'text-gold-500' : 'text-red-500'}`} />
                  <p className="text-xs text-muted-foreground">Net Position</p>
                </div>
                <p className={`text-2xl font-bold ${netYTD >= 0 ? 'text-sage-600 dark:text-sage-400' : 'text-red-600 dark:text-red-400'}`}>
                  {netYTD >= 0 ? '+' : ''}{GHS}{Math.abs(netYTD).toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card className="glass border-none shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-navy-500 dark:text-navy-300" />
                  <p className="text-xs text-muted-foreground">Total Budgeted</p>
                </div>
                <p className="text-2xl font-bold">{GHS}{totalBudgeted.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">{ovYear} annual budgets</p>
              </CardContent>
            </Card>
          </div>

          {/* Monthly chart */}
          <Card className="glass border-none shadow-sm">
            <CardHeader>
              <CardTitle>Monthly Income vs Expenses</CardTitle>
              <CardDescription>Last 6 months (includes Tithes & Giving)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartMonths} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} dy={8} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={v => `${GHS}${(v as number).toLocaleString()}`} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => [`${GHS}${(v as number).toLocaleString()}`, undefined]} />
                    <Legend wrapperStyle={{ paddingTop: '16px', fontSize: '12px' }} />
                    <Bar dataKey="Income"   fill="#4A7C6F" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="Expenses" fill="#C9A84C" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Income breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="glass border-none shadow-sm">
              <CardHeader>
                <CardTitle>Income Breakdown</CardTitle>
                <CardDescription>{ovYear} income sources</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm py-2 border-b border-border/30">
                  <span className="text-muted-foreground">Tithes & Giving (auto)</span>
                  <span className="font-semibold">{GHS}{totalGivingYTD.toLocaleString()}</span>
                </div>
                {incomeAccounts.filter(a => !a.isGivingSync).map(ac => {
                  const amt = yearIncomeTx.filter(t => t.accountId === ac.id).reduce((s, t) => s + t.amount, 0);
                  if (amt === 0) return null;
                  return (
                    <div key={ac.id} className="flex justify-between text-sm py-1">
                      <span className="text-muted-foreground">{ac.name}</span>
                      <span className="font-medium">{GHS}{amt.toLocaleString()}</span>
                    </div>
                  );
                })}
                <div className="flex justify-between text-sm py-2 border-t border-border/40 font-bold">
                  <span>Total Income</span>
                  <span className="text-sage-600 dark:text-sage-400">{GHS}{totalIncomeYTD.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="glass border-none shadow-sm">
              <CardHeader>
                <CardTitle>Expense Breakdown</CardTitle>
                <CardDescription>{ovYear} expense categories</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[300px] overflow-y-auto">
                {expenseAccounts.map(ac => {
                  const amt = yearExpenseTx.filter(t => t.accountId === ac.id).reduce((s, t) => s + t.amount, 0);
                  if (amt === 0) return null;
                  const pct = totalExpensesYTD > 0 ? Math.round((amt / totalExpensesYTD) * 100) : 0;
                  return (
                    <div key={ac.id} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground truncate mr-2">{ac.name}</span>
                        <span className="font-medium shrink-0">{GHS}{amt.toLocaleString()} <span className="text-xs text-muted-foreground">({pct}%)</span></span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-gold-400 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                {totalExpensesYTD === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No expenses recorded for {ovYear}.</p>
                )}
                {totalExpensesYTD > 0 && (
                  <div className="flex justify-between text-sm pt-2 border-t border-border/40 font-bold">
                    <span>Total Expenses</span>
                    <span className="text-red-600 dark:text-red-400">{GHS}{totalExpensesYTD.toLocaleString()}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Transactions ── */}
        <TabsContent value="transactions" className="space-y-4 mt-0">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search transactions…" className="pl-9" value={txSearch} onChange={e => setTxSearch(e.target.value)} />
            </div>
            <Select value={txTypeFilter} onValueChange={v => setTxTypeFilter(v as 'all' | 'income' | 'expense')}>
              <SelectTrigger className="w-36 h-9 text-sm">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
            {canEdit && (
              <Button size="sm" onClick={openAddTx} disabled={viewingAll} title={viewingAll ? 'Select a branch first' : undefined} className="gap-2 bg-navy-900 hover:bg-navy-800 text-gold-400 disabled:opacity-50">
                <Plus className="w-4 h-4" /> Add Transaction
              </Button>
            )}
          </div>

          <Card className="glass border-none shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Type</TableHead>
                      {canEdit && <TableHead />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedTx.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={canEdit ? 7 : 6} className="text-center py-10 text-muted-foreground">
                          {txSearch ? 'No matching transactions.' : 'No transactions yet. Add your first one.'}
                        </TableCell>
                      </TableRow>
                    ) : displayedTx.map(tx => {
                      const ac = accounts.find(a => a.id === tx.accountId);
                      return (
                        <TableRow key={tx.id}>
                          <TableCell className="font-medium whitespace-nowrap">{format(new Date(tx.date), 'MMM d, yyyy')}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{tx.description}</TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">{ac?.name ?? '—'}</span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{tx.reference ?? '—'}</TableCell>
                          <TableCell className="text-right font-semibold">
                            <span className={tx.type === 'income' ? 'text-sage-600 dark:text-sage-400' : 'text-red-600 dark:text-red-400'}>
                              {tx.type === 'income' ? '+' : '-'}{GHS}{tx.amount.toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${tx.type === 'income' ? 'bg-sage-500/10 text-sage-700 dark:text-sage-400' : 'bg-red-500/10 text-red-700 dark:text-red-400'}`}>
                              {tx.type}
                            </span>
                          </TableCell>
                          {canEdit && (
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditTx(tx)}>
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteTx(tx.id)}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Budget ── */}
        <TabsContent value="budget" className="space-y-4 mt-0">
          <div className="flex items-center gap-3">
            <Label className="text-sm shrink-0">Year</Label>
            <Select value={String(budgetYear)} onValueChange={v => setBudgetYear(Number(v))}>
              <SelectTrigger className="w-28 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[currentYear - 1, currentYear, currentYear + 1].map(yr => (
                  <SelectItem key={yr} value={String(yr)}>{yr}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card className="glass border-none shadow-sm">
            <CardHeader>
              <CardTitle>Budget vs Actual — {budgetYear}</CardTitle>
              <CardDescription>Click any budget figure to edit it. Actual figures pull from transactions and Tithes & Giving.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Annual Budget</TableHead>
                      <TableHead className="text-right">YTD Actual</TableHead>
                      <TableHead className="text-right">Variance</TableHead>
                      <TableHead className="text-right">% Used</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Tithes & Giving — always shown as a single auto row */}
                    <TableRow className="bg-sage-500/5">
                      <TableCell className="font-medium">
                        <span className="text-xs text-muted-foreground mr-2">AUTO</span>
                        Tithes & Giving
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-sage-500/10 text-sage-700 dark:text-sage-400">income</span>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground italic">auto-synced</TableCell>
                      <TableCell className="text-right font-medium text-sage-600 dark:text-sage-400">
                        {GHS}{totalGivingBudgetYear.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right"><span className="text-muted-foreground text-xs">—</span></TableCell>
                      <TableCell className="text-right"><span className="text-muted-foreground text-xs">—</span></TableCell>
                    </TableRow>
                    {budgetRows.map(({ ac, budgetAmt, actualAmt, variance, pct }) => (
                      <TableRow key={ac.id}>
                        <TableCell className="font-medium">
                          <span className="text-xs text-muted-foreground mr-2">{ac.code}</span>
                          {ac.name}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ACCOUNT_TYPE_BADGE[ac.type]}`}>
                            {ac.type}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {canEdit && editingBudgetId === ac.id ? (
                            <div className="flex justify-end gap-1">
                              <Input
                                className="w-28 h-7 text-right text-sm"
                                value={budgetInput}
                                onChange={e => setBudgetInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') saveBudget(ac.id); if (e.key === 'Escape') setEditingBudgetId(null); }}
                                autoFocus
                              />
                              <Button size="sm" className="h-7 px-2 text-xs" onClick={() => saveBudget(ac.id)}>Save</Button>
                            </div>
                          ) : (
                            <button
                              className={`text-sm font-medium ${canEdit ? 'hover:text-gold-600 cursor-pointer underline-offset-2 hover:underline' : 'cursor-default'}`}
                              onClick={() => { if (!canEdit) return; setEditingBudgetId(ac.id); setBudgetInput(String(budgetAmt)); }}
                            >
                              {budgetAmt > 0 ? `${GHS}${budgetAmt.toLocaleString()}` : <span className="text-muted-foreground text-xs">Set budget</span>}
                            </button>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {GHS}{actualAmt.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {variance !== null ? (
                            <span className={variance >= 0 ? 'text-sage-600 dark:text-sage-400' : 'text-red-600 dark:text-red-400'}>
                              {variance >= 0 ? '+' : ''}{GHS}{Math.abs(variance).toLocaleString()}
                            </span>
                          ) : <span className="text-muted-foreground text-xs">—</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          {pct !== null ? (
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${pct > 100 ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-sage-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                              </div>
                              <span className="text-xs font-medium w-8 text-right">{pct}%</span>
                            </div>
                          ) : <span className="text-muted-foreground text-xs">—</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Chart of Accounts ── */}
        <TabsContent value="accounts" className="space-y-4 mt-0">
          <div className="flex justify-end">
            {canEdit && (
              <Button size="sm" onClick={openAddAc} className="gap-2 bg-navy-900 hover:bg-navy-800 text-gold-400">
                <Plus className="w-4 h-4" /> Add Account
              </Button>
            )}
          </div>

          <Card className="glass border-none shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Giving Sync</TableHead>
                      {canEdit && <TableHead />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={canEdit ? 5 : 4} className="text-center py-10 text-muted-foreground">
                          No accounts yet. Run the SQL setup or add one manually.
                        </TableCell>
                      </TableRow>
                    ) : accounts.map(ac => (
                      <TableRow key={ac.id}>
                        <TableCell className="font-mono text-sm">{ac.code}</TableCell>
                        <TableCell className="font-medium">{ac.name}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${ACCOUNT_TYPE_BADGE[ac.type]}`}>
                            {ac.type}
                          </span>
                        </TableCell>
                        <TableCell>
                          {ac.isGivingSync ? (
                            <span className="text-xs bg-sage-500/10 text-sage-700 dark:text-sage-400 px-2 py-0.5 rounded">Auto-synced</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Manual</span>
                          )}
                        </TableCell>
                        {canEdit && (
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditAc(ac)}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteAc(ac.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Transaction Dialog */}
      <Dialog open={txDialogOpen} onOpenChange={setTxDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editingTx ? 'Edit Transaction' : 'Add Transaction'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Type *</Label>
                <Select value={txForm.type} onValueChange={v => setTxForm(f => ({ ...f, type: v as 'income' | 'expense', accountId: '' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Date *</Label>
                <Input type="date" value={txForm.date} onChange={e => setTxForm(f => ({ ...f, date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Account *</Label>
              <Select value={txForm.accountId} onValueChange={v => setTxForm(f => ({ ...f, accountId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select account…" /></SelectTrigger>
                <SelectContent>
                  {txAccounts.length === 0 ? (
                    <SelectItem value="__none__" disabled>No {txForm.type} accounts found</SelectItem>
                  ) : txAccounts.map(ac => (
                    <SelectItem key={ac.id} value={ac.id}>{ac.code} — {ac.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description *</Label>
              <Input placeholder="e.g. Electricity bill for May" value={txForm.description} onChange={e => setTxForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Amount (GHS) *</Label>
                <Input type="number" min="0" step="0.01" placeholder="0.00" value={txForm.amount || ''} onChange={e => setTxForm(f => ({ ...f, amount: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Reference / Invoice</Label>
                <Input placeholder="INV-001" value={txForm.reference ?? ''} onChange={e => setTxForm(f => ({ ...f, reference: e.target.value || null }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Branch *</Label>
              {isLocked ? (
                <p className="text-sm font-medium h-9 flex items-center px-3 rounded-md border border-border/40 bg-muted/30">
                  {campuses.find(c => c.id === campusId)?.name ?? 'My Branch'}
                </p>
              ) : (
                <Select value={txForm.campusId ?? ''} onValueChange={v => setTxForm(f => ({ ...f, campusId: v || null }))}>
                  <SelectTrigger className={!txForm.campusId ? 'border-amber-400' : ''}>
                    <SelectValue placeholder="Select branch…" />
                  </SelectTrigger>
                  <SelectContent>
                    {campuses.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTxDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveTx} disabled={txSaving} className="bg-navy-900 hover:bg-navy-800 text-gold-400">
              {txSaving ? 'Saving…' : editingTx ? 'Update' : 'Add Transaction'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Account Dialog */}
      <Dialog open={acDialogOpen} onOpenChange={setAcDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{editingAc ? 'Edit Account' : 'Add Account'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Code *</Label>
                <Input placeholder="e.g. 5200" value={acForm.code} onChange={e => setAcForm(f => ({ ...f, code: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Type *</Label>
                <Select value={acForm.type} onValueChange={v => setAcForm(f => ({ ...f, type: v as typeof acForm.type }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="asset">Asset</SelectItem>
                    <SelectItem value="liability">Liability</SelectItem>
                    <SelectItem value="equity">Equity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Name *</Label>
              <Input placeholder="e.g. Office Supplies" value={acForm.name} onChange={e => setAcForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={acForm.isGivingSync} onChange={e => setAcForm(f => ({ ...f, isGivingSync: e.target.checked }))} className="accent-navy-900 w-4 h-4" />
              <span className="text-sm">Auto-include Tithes & Giving records</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveAccount} disabled={acSaving} className="bg-navy-900 hover:bg-navy-800 text-gold-400">
              {acSaving ? 'Saving…' : editingAc ? 'Update' : 'Add Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
