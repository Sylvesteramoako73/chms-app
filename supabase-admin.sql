-- =============================================================================
-- ChurchCare — Platform admin: suspend / reactivate churches
--
-- Run once in Supabase AFTER supabase-billing.sql:
--   Dashboard → SQL Editor → New query → paste → Run. Safe to re-run.
--
-- Adds a status to every church ('active' or 'suspended'). Only the server
-- (service role, used by /api/admin on Vercel) can change it; a church can
-- never unsuspend itself from the browser.
-- =============================================================================

ALTER TABLE church_settings ADD COLUMN IF NOT EXISTS status           TEXT NOT NULL DEFAULT 'active';
ALTER TABLE church_settings ADD COLUMN IF NOT EXISTS suspended_reason TEXT;
ALTER TABLE church_settings ADD COLUMN IF NOT EXISTS suspended_at     TIMESTAMPTZ;
ALTER TABLE church_settings ADD COLUMN IF NOT EXISTS created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE church_settings DROP CONSTRAINT IF EXISTS church_settings_status_check;
ALTER TABLE church_settings ADD CONSTRAINT church_settings_status_check
  CHECK (status IN ('active', 'suspended'));

-- Same protection as supabase-billing.sql, now also covering the status fields
CREATE OR REPLACE FUNCTION protect_church_billing()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.plan             := 'free';
    NEW.trial_ends_at    := NOW() + INTERVAL '14 days';
    NEW.plan_expires_at  := NULL;
    NEW.billing_months   := NULL;
    NEW.status           := 'active';
    NEW.suspended_reason := NULL;
    NEW.suspended_at     := NULL;
    NEW.created_at       := NOW();
  ELSE
    NEW.plan             := OLD.plan;
    NEW.trial_ends_at    := OLD.trial_ends_at;
    NEW.plan_expires_at  := OLD.plan_expires_at;
    NEW.billing_months   := OLD.billing_months;
    NEW.status           := OLD.status;
    NEW.suspended_reason := OLD.suspended_reason;
    NEW.suspended_at     := OLD.suspended_at;
    NEW.created_at       := OLD.created_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_church_billing ON church_settings;
CREATE TRIGGER protect_church_billing
  BEFORE INSERT OR UPDATE ON church_settings
  FOR EACH ROW EXECUTE FUNCTION protect_church_billing();
