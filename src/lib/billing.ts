// Billing periods and prices. Keep in sync with api/_billing.js and the website's Pricing.tsx.

export type PaidPlanKey = 'starter' | 'growth' | 'pro';

export const BILLING_PERIODS = [
  { months: 3, label: '3 months', discount: 0, badge: '' },
  { months: 6, label: '6 months', discount: 5, badge: 'Save 5%' },
  { months: 12, label: '1 year', discount: 100 / 6, badge: '2 months free' }, // pay for 10 of 12 months
] as const;

export type BillingPeriod = (typeof BILLING_PERIODS)[number];

export const MONTHLY_GHS: Record<PaidPlanKey, number> = { starter: 200, growth: 350, pro: 500 };

/** Total charged for a plan over a billing period, in GHS */
export const periodPriceGHS = (plan: PaidPlanKey, period: BillingPeriod) =>
  Math.round(MONTHLY_GHS[plan] * period.months * (1 - period.discount / 100));

export const TRIAL_DAYS = 14;
