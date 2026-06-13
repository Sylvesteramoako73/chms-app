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
  return `GHS ${PLAN_PRICES[plan].toLocaleString()}/mo`;
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

interface PackageContextValue {
  plan: Plan;
  features: PlanFeatures;
  hasFeature: (f: keyof PlanFeatures) => boolean;
  loading: boolean;
  updatePlan: (p: Plan) => Promise<void>;
  activatePlan: (code: string) => Promise<{ error: string | null; plan?: Plan }>;
}

const PackageContext = createContext<PackageContextValue | null>(null);

export function PackageProvider({ children }: { children: ReactNode }) {
  const { isDemo, profile } = useAuth();
  const churchId = profile?.churchId ?? null;
  const [plan, setPlan] = useState<Plan>('custom');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    // Open demo period — everyone gets full access regardless of stored plan
    setPlan('custom');
    setLoading(false);
  }, [churchId, isDemo]);

  useEffect(() => { load(); }, [load]);

  const features = PLAN_FEATURES[plan];

  const hasFeature = (f: keyof PlanFeatures): boolean => {
    const val = features[f];
    if (typeof val === 'boolean') return val;
    return true; // numeric limits are checked separately
  };

  const updatePlan = async (p: Plan) => {
    if (!churchId) return;
    setPlan(p);
    await supabase
      .from('church_settings')
      .upsert({ church_id: churchId, plan: p, updated_at: new Date().toISOString() });
  };

  const activatePlan = async (code: string): Promise<{ error: string | null; plan?: Plan }> => {
    if (!churchId) return { error: 'Not authenticated.' };
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return { error: 'Please enter an activation code.' };

    // Look up the code
    const { data, error } = await supabase
      .from('activation_codes')
      .select('*')
      .eq('code', trimmed)
      .single();

    if (error || !data) return { error: 'Invalid activation code. Please check and try again.' };
    if (data.used_by) return { error: 'This code has already been used.' };
    if (data.expires_at && new Date(data.expires_at) < new Date()) return { error: 'This activation code has expired.' };

    // Claim the code — RLS ensures used_by must equal auth_church_id()
    const { error: claimError } = await supabase
      .from('activation_codes')
      .update({ used_by: churchId, used_at: new Date().toISOString() })
      .eq('id', data.id);

    if (claimError) return { error: 'Failed to activate. Please try again.' };

    // Upgrade the plan
    await updatePlan(data.plan as Plan);
    return { error: null, plan: data.plan as Plan };
  };

  return (
    <PackageContext.Provider value={{ plan, features, hasFeature, loading, updatePlan, activatePlan }}>
      {children}
    </PackageContext.Provider>
  );
}

export function usePackage() {
  const ctx = useContext(PackageContext);
  if (!ctx) throw new Error('usePackage must be used within PackageProvider');
  return ctx;
}
