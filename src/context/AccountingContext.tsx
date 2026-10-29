import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { demoGlAccounts, demoGlTransactions, demoGlBudgets } from '../demo/accounting';

export type AccountType = 'income' | 'expense' | 'asset' | 'liability' | 'equity';

export interface GlAccount {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  campusId: string | null;
  isGivingSync: boolean;
  createdAt: string;
}

export interface GlTransaction {
  id: string;
  date: string;
  description: string;
  accountId: string;
  amount: number;
  type: 'income' | 'expense';
  campusId: string | null;
  reference: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface GlBudget {
  id: string;
  accountId: string;
  year: number;
  month: number | null;
  amount: number;
  campusId: string | null;
}

const mapAccount = (r: Record<string, unknown>): GlAccount => ({
  id: r.id as string,
  code: r.code as string,
  name: r.name as string,
  type: r.type as AccountType,
  campusId: r.campus_id as string | null,
  isGivingSync: r.is_giving_sync as boolean,
  createdAt: r.created_at as string,
});

const mapTx = (r: Record<string, unknown>): GlTransaction => ({
  id: r.id as string,
  date: r.date as string,
  description: r.description as string,
  accountId: r.account_id as string,
  amount: r.amount as number,
  type: r.type as 'income' | 'expense',
  campusId: r.campus_id as string | null,
  reference: r.reference as string | null,
  createdBy: r.created_by as string | null,
  createdAt: r.created_at as string,
});

const mapBudget = (r: Record<string, unknown>): GlBudget => ({
  id: r.id as string,
  accountId: r.account_id as string,
  year: r.year as number,
  month: r.month as number | null,
  amount: r.amount as number,
  campusId: r.campus_id as string | null,
});

interface AccountingContextValue {
  accounts: GlAccount[];
  transactions: GlTransaction[];
  budgets: GlBudget[];
  loading: boolean;
  /** True when Supabase reports that the accounting tables do not exist yet */
  tablesMissing: boolean;
  addTransaction: (tx: GlTransaction) => Promise<void>;
  updateTransaction: (tx: GlTransaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  upsertBudget: (budget: GlBudget) => Promise<void>;
  addAccount: (account: GlAccount) => Promise<void>;
  updateAccount: (account: GlAccount) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  reload: () => Promise<void>;
}

const AccountingContext = createContext<AccountingContextValue | null>(null);

export function AccountingProvider({ children }: { children: ReactNode }) {
  const { isDemo, profile } = useAuth();
  const churchId = profile?.churchId ?? null;
  const [accounts, setAccounts] = useState<GlAccount[]>([]);
  const [transactions, setTransactions] = useState<GlTransaction[]>([]);
  const [budgets, setBudgets] = useState<GlBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [tablesMissing, setTablesMissing] = useState(false);

  const load = useCallback(async () => {
    if (isDemo) {
      // The demo church has no Supabase rows, so show sample data instead of an empty ledger
      setAccounts(demoGlAccounts);
      setTransactions(demoGlTransactions);
      setBudgets(demoGlBudgets);
      setTablesMissing(false);
      setLoading(false);
      return;
    }
    if (!churchId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [acRes, txRes, bdRes] = await Promise.all([
        supabase.from('gl_accounts').select('*').eq('church_id', churchId).order('code'),
        supabase.from('gl_transactions').select('*').eq('church_id', churchId).order('date', { ascending: false }),
        supabase.from('gl_budgets').select('*').eq('church_id', churchId),
      ]);
      // 42P01 is Postgres "relation does not exist"; PGRST205 is PostgREST "table not in schema cache"
      const missing = [acRes.error, txRes.error, bdRes.error].some(e => e && (e.code === '42P01' || e.code === 'PGRST205'));
      setTablesMissing(missing);
      if (acRes.error) console.error('[accounting] gl_accounts:', acRes.error);
      if (acRes.data) setAccounts((acRes.data as Record<string, unknown>[]).map(mapAccount));
      if (txRes.data) setTransactions((txRes.data as Record<string, unknown>[]).map(mapTx));
      if (bdRes.data) setBudgets((bdRes.data as Record<string, unknown>[]).map(mapBudget));
    } finally {
      setLoading(false);
    }
  }, [churchId, isDemo]);

  useEffect(() => { load(); }, [load]);

  const addTransaction = async (tx: GlTransaction) => {
    setTransactions(prev => [tx, ...prev]);
    if (isDemo) return; // demo changes stay in memory only
    const { error } = await supabase.from('gl_transactions').insert({
      id: tx.id, date: tx.date, description: tx.description,
      account_id: tx.accountId, amount: tx.amount, type: tx.type,
      campus_id: tx.campusId, reference: tx.reference, created_by: tx.createdBy,
      church_id: churchId,
    });
    if (error) { console.error(error); setTransactions(prev => prev.filter(t => t.id !== tx.id)); throw error; }
  };

  const updateTransaction = async (tx: GlTransaction) => {
    setTransactions(prev => prev.map(t => t.id === tx.id ? tx : t));
    if (isDemo) return; // demo changes stay in memory only
    const { error } = await supabase.from('gl_transactions').update({
      date: tx.date, description: tx.description, account_id: tx.accountId,
      amount: tx.amount, type: tx.type, campus_id: tx.campusId, reference: tx.reference,
    }).eq('id', tx.id);
    if (error) { console.error(error); throw error; }
  };

  const deleteTransaction = async (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    if (isDemo) return; // demo changes stay in memory only
    const { error } = await supabase.from('gl_transactions').delete().eq('id', id);
    if (error) { console.error(error); throw error; }
  };

  const upsertBudget = async (budget: GlBudget) => {
    setBudgets(prev => {
      const existing = prev.findIndex(b => b.id === budget.id);
      return existing >= 0 ? prev.map(b => b.id === budget.id ? budget : b) : [...prev, budget];
    });
    if (isDemo) return; // demo changes stay in memory only
    const { error } = await supabase.from('gl_budgets').upsert({
      id: budget.id, account_id: budget.accountId, year: budget.year,
      month: budget.month, amount: budget.amount, campus_id: budget.campusId,
      church_id: churchId,
    });
    if (error) { console.error(error); throw error; }
  };

  const addAccount = async (account: GlAccount) => {
    setAccounts(prev => [...prev, account].sort((a, b) => a.code.localeCompare(b.code)));
    if (isDemo) return; // demo changes stay in memory only
    const { error } = await supabase.from('gl_accounts').insert({
      id: account.id, code: account.code, name: account.name, type: account.type,
      campus_id: account.campusId, is_giving_sync: account.isGivingSync,
      church_id: churchId,
    });
    if (error) { console.error(error); setAccounts(prev => prev.filter(a => a.id !== account.id)); throw error; }
  };

  const updateAccount = async (account: GlAccount) => {
    setAccounts(prev => prev.map(a => a.id === account.id ? account : a));
    if (isDemo) return; // demo changes stay in memory only
    const { error } = await supabase.from('gl_accounts').update({
      code: account.code, name: account.name, type: account.type,
      campus_id: account.campusId, is_giving_sync: account.isGivingSync,
    }).eq('id', account.id);
    if (error) { console.error(error); throw error; }
  };

  const deleteAccount = async (id: string) => {
    setAccounts(prev => prev.filter(a => a.id !== id));
    if (isDemo) return; // demo changes stay in memory only
    const { error } = await supabase.from('gl_accounts').delete().eq('id', id);
    if (error) { console.error(error); throw error; }
  };

  return (
    <AccountingContext.Provider value={{
      accounts, transactions, budgets, loading, tablesMissing,
      addTransaction, updateTransaction, deleteTransaction,
      upsertBudget, addAccount, updateAccount, deleteAccount,
      reload: load,
    }}>
      {children}
    </AccountingContext.Provider>
  );
}

export function useAccounting() {
  const ctx = useContext(AccountingContext);
  if (!ctx) throw new Error('useAccounting must be used within AccountingProvider');
  return ctx;
}
