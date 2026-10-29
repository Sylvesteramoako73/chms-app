import type { GlAccount, GlTransaction, GlBudget } from '../context/AccountingContext';
import { DEMO_CAMPUS_ID } from './data';

// Sample chart of accounts, transactions and budgets for the demo church.
// Dates are relative to today so the Accounting charts always have recent activity.
const daysAgo = (n: number) => {
  const dt = new Date();
  dt.setDate(dt.getDate() - n);
  return dt.toISOString().split('T')[0];
};

const created = '2026-01-01T00:00:00.000Z';

export const demoGlAccounts: GlAccount[] = [
  { id: 'gl-4000', code: '4000', name: 'Tithes and Offerings',  type: 'income',  campusId: null, isGivingSync: true,  createdAt: created },
  { id: 'gl-4100', code: '4100', name: 'Special Donations',     type: 'income',  campusId: null, isGivingSync: false, createdAt: created },
  { id: 'gl-4200', code: '4200', name: 'Hall Rental Income',    type: 'income',  campusId: null, isGivingSync: false, createdAt: created },
  { id: 'gl-5000', code: '5000', name: 'Staff Salaries',        type: 'expense', campusId: null, isGivingSync: false, createdAt: created },
  { id: 'gl-5100', code: '5100', name: 'Utilities',             type: 'expense', campusId: null, isGivingSync: false, createdAt: created },
  { id: 'gl-5200', code: '5200', name: 'Outreach and Missions', type: 'expense', campusId: null, isGivingSync: false, createdAt: created },
  { id: 'gl-5300', code: '5300', name: 'Building Maintenance',  type: 'expense', campusId: null, isGivingSync: false, createdAt: created },
  { id: 'gl-5400', code: '5400', name: 'Media and Equipment',   type: 'expense', campusId: null, isGivingSync: false, createdAt: created },
  { id: 'gl-1000', code: '1000', name: 'Main Bank Account',     type: 'asset',   campusId: null, isGivingSync: false, createdAt: created },
];

const tx = (
  id: string, n: number, description: string, accountId: string,
  amount: number, type: 'income' | 'expense', campusId: string = DEMO_CAMPUS_ID, reference: string | null = null,
): GlTransaction => ({
  id, date: daysAgo(n), description, accountId, amount, type, campusId, reference,
  createdBy: 'Demo Admin', createdAt: `${daysAgo(n)}T10:00:00.000Z`,
});

export const demoGlTransactions: GlTransaction[] = [
  tx('gtx-01',   3, 'Electricity bill',                  'gl-5100',   850, 'expense'),
  tx('gtx-02',   6, 'Youth outreach at Labadi',          'gl-5200', 1200, 'expense'),
  tx('gtx-03',  10, 'Wedding reception hall rental',     'gl-4200', 1500, 'income'),
  tx('gtx-04',  14, 'Staff salaries',                    'gl-5000', 6400, 'expense', DEMO_CAMPUS_ID, 'PAY 001'),
  tx('gtx-05',  20, 'Donation towards new sound desk',   'gl-4100', 3000, 'income'),
  tx('gtx-06',  27, 'Roof gutter repairs',               'gl-5300', 1750, 'expense'),
  tx('gtx-07',  33, 'Water bill',                        'gl-5100',   320, 'expense'),
  tx('gtx-08',  44, 'Staff salaries',                    'gl-5000', 6400, 'expense', DEMO_CAMPUS_ID, 'PAY 002'),
  tx('gtx-09',  52, 'Livestream camera',                 'gl-5400', 4200, 'expense'),
  tx('gtx-10',  60, 'Hospital visitation support',       'gl-5200',   600, 'expense', 'demo-campus-tema'),
  tx('gtx-11',  68, 'Conference hall rental',            'gl-4200', 2000, 'income'),
  tx('gtx-12',  75, 'Staff salaries',                    'gl-5000', 6400, 'expense', DEMO_CAMPUS_ID, 'PAY 003'),
  tx('gtx-13',  88, 'Electricity bill',                  'gl-5100',   910, 'expense', 'demo-campus-tema'),
  tx('gtx-14', 105, 'Staff salaries',                    'gl-5000', 6400, 'expense', DEMO_CAMPUS_ID, 'PAY 004'),
  tx('gtx-15', 120, 'Missions support for partner church','gl-5200', 2500, 'expense'),
  tx('gtx-16', 140, 'Special harvest donation',          'gl-4100', 5000, 'income'),
];

const year = new Date().getFullYear();

export const demoGlBudgets: GlBudget[] = [
  { id: 'gbd-1', accountId: 'gl-5000', year, month: null, amount: 78000, campusId: null },
  { id: 'gbd-2', accountId: 'gl-5100', year, month: null, amount: 12000, campusId: null },
  { id: 'gbd-3', accountId: 'gl-5200', year, month: null, amount: 15000, campusId: null },
  { id: 'gbd-4', accountId: 'gl-5300', year, month: null, amount:  8000, campusId: null },
  { id: 'gbd-5', accountId: 'gl-5400', year, month: null, amount: 10000, campusId: null },
];
