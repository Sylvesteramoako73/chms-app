import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export type Plan = 'free' | 'starter' | 'growth' | 'pro' | 'custom';

export interface PlanFeatures {
  memberLimit: number | null;   // null = unlimited
  branchLimit: number | null;   // null = unlimited
  userLimit: number | null;     // null = unlimited (total staff accounts)
  adminLimit: number | null;
  bulkMessaging: boolean;       // WhatsApp & SMS bulk send, Automation
  pledges: boolean;             // Pledges & fundraising
  prayerPastoral: boolean;      // Prayer requests & pastoral care
  volunteers: boolean;          // Volunteer management
  multiCampus: boolean;         // Multi-campus / branch management
  advancedReports: boolean;     // Advanced analytics & reports
  accounting: boolean;          // Accounting module
  rolesAccess: boolean;         // Full role-based access control
}

export const PLAN_FEATURES: Record<Plan, PlanFeatures> = {
  free: {
    memberLimit: 50,
    branchLimit: 1,
    userLimit: 1,
    adminLimit: 1,
    bulkMessaging: false,
    pledges: false,
    prayerPastoral: false,
    volunteers: false,
    multiCampus: false,
    advancedReports: false,
    accounting: false,
    rolesAccess: false,
  },
  starter: {
    memberLimit: 150,
    branchLimit: 3,
    userLimit: 3,
    adminLimit: 1,
    bulkMessaging: false,
    pledges: false,
    prayerPastoral: false,
    volunteers: false,
    multiCampus: true,
    advancedReports: false,
    accounting: false,
    rolesAccess: false,
  },
  growth: {
    memberLimit: 500,
    branchLimit: 5,
    userLimit: 10,
    adminLimit: 3,
    bulkMessaging: true,
    pledges: true,
    prayerPastoral: true,
    volunteers: false,
    multiCampus: true,
    advancedReports: false,
    accounting: true,
    rolesAccess: false,
  },
  pro: {
    memberLimit: 2000,
    branchLimit: 25,
    userLimit: 25,
    adminLimit: 10,
    bulkMessaging: true,
    pledges: true,
    prayerPastoral: true,
    volunteers: true,
    multiCampus: true,
    advancedReports: true,
    accounting: true,
    rolesAccess: true,
  },
  custom: {
    memberLimit: null,
    branchLimit: null,
    userLimit: null,
    adminLimit: null,
    bulkMessaging: true,
    pledges: true,
    prayerPastoral: true,
    volunteers: true,
    multiCampus: true,
    advancedReports: true,
    accounting: true,
    rolesAccess: true,
  },
};

export const PLAN_LABELS: Record<Plan, string> = {
  free: 'Free',
  starter: 'Starter',
  growth: 'Growth',
  pro: 'Pro',
  custom: 'Custom',
};

export const PLAN_PRICES: Record<Plan, number> = {
  free: 0,
  starter: 200,
  growth: 350,
  pro: 500,
  custom: 0,  // 0 = contact us
};

export function planPriceDisplay(plan: Plan): string {
  if (plan === 'free') return 'Free';
  if (plan === 'custom') return 'Contact us';
  return `from GHS ${PLAN_PRICES[plan].toLocaleString()}/mo`;
}

export const FEATURE_LABELS: Record<keyof PlanFeatures, string> = {
  memberLimit: 'Member limit',
  branchLimit: 'Branch limit',
  userLimit: 'User accounts',
  adminLimit: 'Admin accounts',
  bulkMessaging: 'Bulk WhatsApp & SMS messaging',
  pledges: 'Pledge & fundraising tracking',
  prayerPastoral: 'Prayer & pastoral care',
  volunteers: 'Volunteer management',
  multiCampus: 'Multi-campus / branch management',
  advancedReports: 'Advanced analytics & reports',
  accounting: 'Accounting module',
  rolesAccess: 'Role-based access control',
};

export const FEATURE_REQUIRED_PLAN: Record<keyof PlanFeatures, Plan> = {
  memberLimit: 'free',
  branchLimit: 'free',
  userLimit: 'free',
  adminLimit: 'free',
  bulkMessaging: 'growth',
  pledges: 'growth',
  prayerPastoral: 'growth',
  volunteers: 'pro',
  multiCampus: 'starter',
  advancedReports: 'pro',
  accounting: 'growth',
  rolesAccess: 'pro',
};

export interface BillingStatus {
  storedPlan: Plan;              // plan saved for the church (may have expired)
  planExpiresAt: Date | null;    // null on a paid plan = no expiry (activation code)
  trialEndsAt: Date | null;
  billingMonths: number | null;
  onTrial: boolean;              // full access because the free trial is running
  expired: boolean;              // trial or paid period is over
  locked: boolean;               // no trial and no paid plan — the church must pay to use the app
  daysLeft: number | null;       // days left on the trial or paid period
  suspended: boolean;            // switched off by the ChurchCare platform admin
  suspendedReason: string | null;
}

interface SettingsRow {
  plan: string | null;
  plan_expires_at: string | null;
  trial_ends_at: string | null;
  billing_months: number | null;
  status?: string | null;
  suspended_reason?: string | null;
}

const TRIAL_PLAN: Plan = 'pro';
const DAY_MS = 24 * 60 * 60 * 1000;

function resolveBilling(row: SettingsRow | null): { plan: Plan; billing: BillingStatus } {
  const now = Date.now();
  const storedPlan = (row?.plan && row.plan in PLAN_FEATURES ? row.plan : 'free') as Plan;
  const planExpiresAt = row?.plan_expires_at ? new Date(row.plan_expires_at) : null;
  const trialEndsAt = row?.trial_ends_at ? new Date(row.trial_ends_at) : null;
  const daysUntil = (d: Date) => Math.max(0, Math.ceil((d.getTime() - now) / DAY_MS));
  const base = {
    storedPlan, planExpiresAt, trialEndsAt, billingMonths: row?.billing_months ?? null,
    suspended: row?.status === 'suspended',
    suspendedReason: row?.suspended_reason ?? null,
  };

  if (storedPlan !== 'free' && (!planExpiresAt || planExpiresAt.getTime() > now)) {
    return { plan: storedPlan, billing: { ...base, onTrial: false, expired: false, locked: false, daysLeft: planExpiresAt ? daysUntil(planExpiresAt) : null } };
  }
  if (trialEndsAt && trialEndsAt.getTime() > now) {
    return { plan: TRIAL_PLAN, billing: { ...base, onTrial: true, expired: false, locked: false, daysLeft: daysUntil(trialEndsAt) } };
  }
  // There is no free tier: once the trial or paid period ends the app is locked until they pay
  return { plan: 'free', billing: { ...base, onTrial: false, expired: true, locked: true, daysLeft: null } };
}

interface PackageContextValue {
  plan: Plan;
  features: PlanFeatures;
  billing: BillingStatus | null;
  hasFeature: (f: keyof PlanFeatures) => boolean;
  loading: boolean;
  /** Re-read the plan from the server (also picks up payments made on the website) */
  refresh: () => Promise<void>;
  /** Verify a Paystack payment on the server and apply it to this church */
  confirmPayment: (reference: string) => Promise<{ error: string | null }>;
  activatePlan: (code: string) => Promise<{ error: string | null; plan?: Plan }>;
}

const PackageContext = createContext<PackageContextValue | null>(null);

async function syncWithServer(reference?: string): Promise<{ settings: SettingsRow | null; error: string | null }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { settings: null, error: 'Not signed in.' };
  try {
    const res = await fetch('/api/billing-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(reference ? { reference } : {}),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { settings: null, error: body.error ?? 'Could not reach the billing server.' };
    return { settings: body.settings ?? null, error: null };
  } catch {
    return { settings: null, error: 'Could not reach the billing server.' };
  }
}

export function PackageProvider({ children }: { children: ReactNode }) {
  const { isDemo, profile } = useAuth();
  const churchId = profile?.churchId ?? null;
  const [plan, setPlan] = useState<Plan>(isDemo ? 'custom' : 'free');
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const apply = (row: SettingsRow | null | 'unavailable') => {
    if (row === 'unavailable') {
      // Billing not set up in the database yet — keep everyone on full access
      setPlan('custom');
      setBilling(null);
      return;
    }
    const resolved = resolveBilling(row);
    setPlan(resolved.plan);
    setBilling(resolved.billing);
  };

  // Returns 'unavailable' if the billing columns don't exist yet (supabase-billing.sql not run)
  const readSettings = useCallback(async (): Promise<SettingsRow | null | 'unavailable'> => {
    if (!churchId) return null;
    let select = 'plan, plan_expires_at, trial_ends_at, billing_months, status, suspended_reason';
    let { data, error } = await supabase.from('church_settings').select(select).eq('church_id', churchId).maybeSingle();
    if (error) {
      // supabase-admin.sql not run yet: read without the status columns
      select = 'plan, plan_expires_at, trial_ends_at, billing_months';
      ({ data, error } = await supabase.from('church_settings').select(select).eq('church_id', churchId).maybeSingle());
    }
    if (error) return 'unavailable';
    if (data) return data as unknown as SettingsRow;
    // No row yet (older accounts) — create one; the database starts the free trial
    await supabase.from('church_settings').insert({ church_id: churchId });
    const { data: created } = await supabase.from('church_settings').select(select).eq('church_id', churchId).maybeSingle();
    return (created as unknown as SettingsRow) ?? null;
  }, [churchId]);

  const load = useCallback(async () => {
    if (isDemo) {
      setPlan('custom');
      setBilling(null);
      setLoading(false);
      return;
    }
    if (!churchId) { setLoading(false); return; }
    apply(await readSettings());
    setLoading(false);
    // Pick up any website payments made with this email
    const { settings } = await syncWithServer();
    if (settings) apply(settings);
  }, [churchId, isDemo, readSettings]);

  useEffect(() => { load(); }, [load]);

  const features = PLAN_FEATURES[plan];

  const hasFeature = (f: keyof PlanFeatures): boolean => {
    const val = features[f];
    if (typeof val === 'boolean') return val;
    return true; // numeric limits are checked separately
  };

  const refresh = async () => {
    const { settings } = await syncWithServer();
    apply(settings ?? (await readSettings()));
  };

  const confirmPayment = async (reference: string) => {
    const { settings, error } = await syncWithServer(reference);
    if (error) return { error };
    apply(settings);
    return { error: null };
  };

  const activatePlan = async (code: string): Promise<{ error: string | null; plan?: Plan }> => {
    if (!churchId) return { error: 'Not authenticated.' };
    if (!code.trim()) return { error: 'Please enter an activation code.' };

    const { data, error } = await supabase.rpc('redeem_activation_code', { p_code: code });
    if (error) return { error: error.message || 'Failed to activate. Please try again.' };

    apply(await readSettings());
    return { error: null, plan: data as Plan };
  };

  return (
    <PackageContext.Provider value={{ plan, features, billing, hasFeature, loading, refresh, confirmPayment, activatePlan }}>
      {children}
    </PackageContext.Provider>
  );
}

export function usePackage() {
  const ctx = useContext(PackageContext);
  if (!ctx) throw new Error('usePackage must be used within PackageProvider');
  return ctx;
}
