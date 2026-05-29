import { Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { usePackage, PLAN_FEATURES, PLAN_LABELS, PLAN_PRICES, FEATURE_REQUIRED_PLAN, type Plan, type PlanFeatures } from '@/context/PackageContext';

const PLAN_COLOR: Record<Plan, string> = {
  free:    'text-slate-600 dark:text-slate-400',
  starter: 'text-sage-600 dark:text-sage-400',
  growth:  'text-gold-600 dark:text-gold-400',
  pro:     'text-purple-600 dark:text-purple-400',
  custom:  'text-blue-600 dark:text-blue-400',
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
    'Bulk WhatsApp & SMS messaging',
    'Pledge & fundraising · Accounting',
    'Prayer & pastoral care',
  ],
  pro: [
    'Up to 25 branches · 25 users',
    'Up to 2,000 members',
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

interface Props {
  feature: keyof PlanFeatures;
}

export function UpgradePrompt({ feature }: Props) {
  const { plan } = usePackage();
  const navigate = useNavigate();
  const requiredPlan = FEATURE_REQUIRED_PLAN[feature];
  const requiredFeatures = PLAN_FEATURES[requiredPlan];
  const highlights = PLAN_HIGHLIGHTS[requiredPlan];

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 space-y-6">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
        <Lock className="w-7 h-7 text-muted-foreground" />
      </div>

      <div className="space-y-2 max-w-md">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {PLAN_LABELS[plan]} Plan
        </p>
        <h2 className="text-2xl font-bold text-navy-900 dark:text-cream">
          Upgrade to <span className={PLAN_COLOR[requiredPlan]}>{PLAN_LABELS[requiredPlan]}</span> to unlock this
        </h2>
        <p className="text-sm text-muted-foreground">
          This feature is available on the <strong>{PLAN_LABELS[requiredPlan]}</strong> plan
          {PLAN_PRICES[requiredPlan] > 0 && <> at <strong>GHS {PLAN_PRICES[requiredPlan].toLocaleString()}/month</strong></>}.
        </p>
      </div>

      <div className="glass rounded-xl p-5 w-full max-w-sm text-left space-y-2 border border-border/40">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          {PLAN_LABELS[requiredPlan]} includes
        </p>
        {highlights.map(h => (
          <div key={h} className="flex items-start gap-2 text-sm">
            <span className={`mt-0.5 shrink-0 font-bold ${PLAN_COLOR[requiredPlan]}`}>✓</span>
            <span>{h}</span>
          </div>
        ))}
        {requiredFeatures.memberLimit && (
          <p className="text-xs text-muted-foreground mt-2">
            Member limit: up to {requiredFeatures.memberLimit.toLocaleString()}
          </p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          className="bg-gold-500 hover:bg-gold-600 text-navy-900 font-bold gap-2"
          onClick={() => navigate('/upgrade')}
        >
          Upgrade Now
        </Button>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Go back
        </Button>
      </div>
    </div>
  );
}
