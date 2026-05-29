import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { usePaystackPayment } from 'react-paystack';
import { useAuth } from '@/context/AuthContext';
import { usePackage, PLAN_LABELS, PLAN_PRICES, planPriceDisplay, type Plan } from '@/context/PackageContext';
import { Button } from '@/components/ui/button';
import { Check, ArrowLeft, Sparkles, ShieldCheck, Zap, Mail } from 'lucide-react';
import { cn } from '@/utils';

const PAYSTACK_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY as string;

type PaidPlan = 'starter' | 'growth' | 'pro' | 'custom';

const PLAN_HIGHLIGHTS: Record<PaidPlan, string[]> = {
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
    'Flexible billing terms',
  ],
};

const PLAN_COLOR: Record<PaidPlan, { border: string; selected: string; shadow: string; title: string; check: string }> = {
  starter: { border: 'border-sage-500', selected: 'bg-sage-500/5 shadow-sage-500/10', shadow: 'shadow-lg', title: 'text-sage-600 dark:text-sage-400', check: 'text-sage-500' },
  growth:  { border: 'border-gold-500',  selected: 'bg-gold-500/5 shadow-gold-500/10',  shadow: 'shadow-lg', title: 'text-gold-600 dark:text-gold-400',  check: 'text-gold-500'  },
  pro:     { border: 'border-purple-500', selected: 'bg-purple-500/5 shadow-purple-500/10', shadow: 'shadow-lg', title: 'text-purple-600 dark:text-purple-400', check: 'text-purple-500' },
  custom:  { border: 'border-blue-500',  selected: 'bg-blue-500/5 shadow-blue-500/10',  shadow: 'shadow-lg', title: 'text-blue-600 dark:text-blue-400',  check: 'text-blue-500'  },
};

interface SuccessScreenProps {
  plan: Plan;
  reference: string;
  onDone: () => void;
}

function SuccessScreen({ plan, reference, onDone }: SuccessScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 max-w-md mx-auto px-4"
    >
      <div className="w-20 h-20 rounded-full bg-sage-500/10 flex items-center justify-center">
        <ShieldCheck className="w-10 h-10 text-sage-500" />
      </div>
      <div className="space-y-2">
        <h2 className="text-3xl font-display font-bold text-navy-900 dark:text-cream">
          You're on {PLAN_LABELS[plan]}!
        </h2>
        <p className="text-muted-foreground">
          Payment confirmed. Your account has been upgraded and all {PLAN_LABELS[plan]} features are now active.
        </p>
      </div>
      <div className="w-full p-4 rounded-xl bg-muted/30 border border-border/40 text-sm space-y-1 text-left">
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-2">Transaction Details</p>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Plan</span>
          <span className="font-semibold">{PLAN_LABELS[plan]}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Amount</span>
          <span className="font-semibold">GHS {PLAN_PRICES[plan].toLocaleString()}/month</span>
        </div>
        <div className="flex justify-between items-start gap-4">
          <span className="text-muted-foreground shrink-0">Reference</span>
          <span className="font-mono text-xs text-right break-all">{reference}</span>
        </div>
      </div>
      <Button
        className="bg-gold-500 hover:bg-gold-600 text-navy-900 font-bold gap-2 w-full"
        onClick={onDone}
      >
        <Zap className="w-4 h-4" /> Go to Dashboard
      </Button>
      <p className="text-xs text-muted-foreground">
        Save your reference number for billing records. Questions? Email{' '}
        <a href="mailto:support@faithchurchcare.com" className="underline">support@faithchurchcare.com</a>
      </p>
    </motion.div>
  );
}

interface PlanCardProps {
  plan: PaidPlan;
  selected: boolean;
  current: boolean;
  onSelect: () => void;
}

function PlanCard({ plan, selected, current, onSelect }: PlanCardProps) {
  const colors = PLAN_COLOR[plan];
  const isCustom = plan === 'custom';
  return (
    <motion.div
      whileHover={{ y: -2 }}
      onClick={current ? undefined : onSelect}
      className={cn(
        'relative rounded-2xl border-2 p-6 flex flex-col gap-5 cursor-pointer transition-all duration-200',
        current
          ? 'border-border/40 bg-muted/10 opacity-50 cursor-not-allowed'
          : selected
            ? `${colors.border} ${colors.selected} ${colors.shadow}`
            : 'border-border/40 bg-muted/10 hover:border-border'
      )}
    >
      {plan === 'pro' && !current && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-purple-500 text-white whitespace-nowrap">
          Most Popular
        </span>
      )}
      {current && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-muted text-muted-foreground border border-border whitespace-nowrap">
          Current Plan
        </span>
      )}

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={cn('text-xl font-bold', colors.title)}>{PLAN_LABELS[plan]}</p>
          <p className="mt-1">
            {isCustom ? (
              <span className="text-2xl font-display font-bold">Contact us</span>
            ) : (
              <>
                <span className="text-3xl font-display font-bold">GHS {PLAN_PRICES[plan].toLocaleString()}</span>
                <span className="text-sm text-muted-foreground">/month</span>
              </>
            )}
          </p>
        </div>
        <div className={cn(
          'w-5 h-5 rounded-full border-2 shrink-0 mt-1 flex items-center justify-center transition-all',
          selected && !current ? `${colors.border} bg-current` : 'border-border'
        )}>
          {selected && !current && <Check className="w-3 h-3 text-white" />}
        </div>
      </div>

      <ul className="space-y-2 flex-1">
        {PLAN_HIGHLIGHTS[plan].map(h => (
          <li key={h} className="flex items-start gap-2 text-sm">
            <Check className={cn('w-4 h-4 shrink-0 mt-0.5', colors.check)} />
            <span className="text-muted-foreground">{h}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

export default function Upgrade() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { plan: currentPlan, updatePlan } = usePackage();
  const [selected, setSelected] = useState<PaidPlan>('starter');
  const [success, setSuccess] = useState<{ reference: string; plan: Plan } | null>(null);
  const [paying, setPaying] = useState(false);

  const isCustomSelected = selected === 'custom';
  const amount = isCustomSelected ? 20000 : PLAN_PRICES[selected] * 100;

  const initializePayment = usePaystackPayment({
    reference: `chms-${Date.now()}`,
    email: profile?.email ?? '',
    amount,
    currency: 'GHS',
    publicKey: PAYSTACK_KEY,
    metadata: {
      custom_fields: [
        { display_name: 'Church Plan', variable_name: 'plan', value: selected },
        { display_name: 'Church ID', variable_name: 'church_id', value: profile?.churchId ?? '' },
      ],
    },
  });

  const handlePay = () => {
    if (isCustomSelected) {
      window.location.href = 'mailto:support@faithchurchcare.com?subject=Custom%20Plan%20Enquiry';
      return;
    }
    if (!PAYSTACK_KEY || PAYSTACK_KEY.includes('xxxx')) {
      alert('Paystack public key not configured.');
      return;
    }
    setPaying(true);
    initializePayment({
      onSuccess: async (response: { reference: string }) => {
        await updatePlan(selected as Plan);
        setSuccess({ reference: response.reference, plan: selected as Plan });
        setPaying(false);
      },
      onClose: () => setPaying(false),
    });
  };

  const PAID_PLANS: PaidPlan[] = ['starter', 'growth', 'pro', 'custom'];

  if (success) {
    return <SuccessScreen plan={success.plan} reference={success.reference} onDone={() => navigate('/')} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8 max-w-4xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mt-1 shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-4xl font-display font-bold text-navy-900 dark:text-cream mb-1">
            Upgrade Your Plan
          </h1>
          <p className="text-muted-foreground text-sm">
            Choose the plan that fits your church. Upgrade instantly — no contracts.
          </p>
        </div>
      </div>

      {/* Plan cards — 2×2 grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {PAID_PLANS.map(p => (
          <PlanCard
            key={p}
            plan={p}
            selected={selected === p}
            current={currentPlan === p}
            onSelect={() => setSelected(p)}
          />
        ))}
      </div>

      {/* CTA button */}
      <AnimatePresence mode="wait">
        {currentPlan !== selected && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="flex flex-col items-center gap-3"
          >
            <Button
              size="lg"
              className={cn(
                'w-full max-w-sm gap-2 font-bold text-base h-12',
                isCustomSelected
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gold-500 hover:bg-gold-600 text-navy-900'
              )}
              onClick={handlePay}
              disabled={paying}
            >
              {paying ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                  Opening payment…
                </span>
              ) : isCustomSelected ? (
                <><Mail className="w-4 h-4" /> Contact us for Custom pricing</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Pay {planPriceDisplay(selected)} — Activate {PLAN_LABELS[selected]}</>
              )}
            </Button>
            {!isCustomSelected && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-sage-500" />
                Secured by Paystack · Mobile Money, Cards &amp; Bank Transfer accepted
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
