-- =============================================================================
-- ChurchCare — Billing: 1-month free trial, paid periods (3 / 6 / 12 months)
--
-- Run once in Supabase: Dashboard → SQL Editor → New query → paste → Run.
-- Safe to re-run.
--
-- After this runs:
--   • Every church gets a trial (14 days from now for existing churches,
--     14 days from sign-up for new ones). After that the app is locked until they pay.
--   • Only the server (service role key, used by /api/* on Vercel) can change
--     plan, plan_expires_at or trial_ends_at. Browsers can no longer upgrade
--     themselves.
--   • Payments are recorded in the `payments` table, one row per Paystack
--     reference, so a payment can never be applied twice.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. New billing columns on church_settings
-- ---------------------------------------------------------------------------
ALTER TABLE church_settings ADD COLUMN IF NOT EXISTS trial_ends_at   TIMESTAMPTZ;
ALTER TABLE church_settings ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;  -- NULL on a paid plan = no expiry (activation code / manual)
ALTER TABLE church_settings ADD COLUMN IF NOT EXISTS billing_months  INT;

ALTER TABLE church_settings ALTER COLUMN plan SET DEFAULT 'free';
ALTER TABLE church_settings ALTER COLUMN trial_ends_at SET DEFAULT NOW() + INTERVAL '14 days';

-- Existing churches: everyone had full access during the open demo period,
-- so give them a fresh 14-day trial from today.
UPDATE church_settings SET trial_ends_at = NOW() + INTERVAL '14 days' WHERE trial_ends_at IS NULL;

-- 'free' now means "no paid plan": during the trial they have full access, after it the app is locked.
-- Existing churches that never redeemed an activation code start from 'free' + the trial.
DO $$
BEGIN
  IF to_regclass('public.activation_codes') IS NOT NULL THEN
    UPDATE church_settings cs SET plan = 'free'
    WHERE plan <> 'free'
      AND plan_expires_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM activation_codes ac WHERE ac.used_by = cs.church_id);
  ELSE
    UPDATE church_settings SET plan = 'free' WHERE plan <> 'free' AND plan_expires_at IS NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Lock billing fields: only the service role may change them
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION protect_church_billing()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Browsers run as 'authenticated' / 'anon'. The server (service_role) and
  -- SECURITY DEFINER functions such as redeem_activation_code() run as other roles.
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.plan            := 'free';
    NEW.trial_ends_at   := NOW() + INTERVAL '14 days';
    NEW.plan_expires_at := NULL;
    NEW.billing_months  := NULL;
  ELSE
    NEW.plan            := OLD.plan;
    NEW.trial_ends_at   := OLD.trial_ends_at;
    NEW.plan_expires_at := OLD.plan_expires_at;
    NEW.billing_months  := OLD.billing_months;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_church_billing ON church_settings;
CREATE TRIGGER protect_church_billing
  BEFORE INSERT OR UPDATE ON church_settings
  FOR EACH ROW EXECUTE FUNCTION protect_church_billing();

-- No DELETE from the browser (deleting + re-inserting would restart the trial)
DROP POLICY IF EXISTS "church_isolation" ON church_settings;
DROP POLICY IF EXISTS "church_settings_select" ON church_settings;
DROP POLICY IF EXISTS "church_settings_insert" ON church_settings;
DROP POLICY IF EXISTS "church_settings_update" ON church_settings;
CREATE POLICY "church_settings_select" ON church_settings
  FOR SELECT USING (church_id = auth_church_id());
CREATE POLICY "church_settings_insert" ON church_settings
  FOR INSERT WITH CHECK (church_id = auth_church_id());
CREATE POLICY "church_settings_update" ON church_settings
  FOR UPDATE USING (church_id = auth_church_id()) WITH CHECK (church_id = auth_church_id());

-- ---------------------------------------------------------------------------
-- 3. Payments ledger (written only by the server)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference      TEXT NOT NULL UNIQUE,          -- Paystack reference
  church_id      UUID,                          -- NULL until matched to a church (website payments)
  email          TEXT NOT NULL,
  plan           TEXT NOT NULL,
  months         INT  NOT NULL,
  amount_pesewas INT  NOT NULL,
  church_name    TEXT,
  source         TEXT,                          -- 'website' | 'app'
  paid_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_at     TIMESTAMPTZ                    -- when the plan was extended for this payment
);
CREATE INDEX IF NOT EXISTS payments_unclaimed_email ON payments (lower(email)) WHERE church_id IS NULL;

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payments_select" ON payments;
CREATE POLICY "payments_select" ON payments
  FOR SELECT USING (church_id = auth_church_id());

-- ---------------------------------------------------------------------------
-- 4. Activation codes now redeem through a server-side function
--    (the browser can no longer write `plan` directly)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.activation_codes') IS NOT NULL THEN
    EXECUTE $fn$
      CREATE OR REPLACE FUNCTION redeem_activation_code(p_code TEXT)
      RETURNS TEXT
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $body$
      DECLARE
        v_church UUID := auth_church_id();
        v_row    activation_codes%ROWTYPE;
      BEGIN
        IF v_church IS NULL THEN RAISE EXCEPTION 'Not authenticated.'; END IF;

        SELECT * INTO v_row FROM activation_codes
        WHERE code = upper(trim(p_code)) FOR UPDATE;

        IF NOT FOUND THEN RAISE EXCEPTION 'Invalid activation code. Please check and try again.'; END IF;
        IF v_row.used_by IS NOT NULL THEN RAISE EXCEPTION 'This code has already been used.'; END IF;
        IF v_row.expires_at IS NOT NULL AND v_row.expires_at < NOW() THEN
          RAISE EXCEPTION 'This activation code has expired.';
        END IF;

        UPDATE activation_codes SET used_by = v_church, used_at = NOW() WHERE id = v_row.id;

        -- Runs as the function owner, so the billing trigger lets this through
        INSERT INTO church_settings (church_id, plan, plan_expires_at, updated_at)
        VALUES (v_church, v_row.plan, NULL, NOW())
        ON CONFLICT (church_id) DO UPDATE
          SET plan = EXCLUDED.plan, plan_expires_at = NULL, updated_at = NOW();

        RETURN v_row.plan;
      END;
      $body$;
    $fn$;
    GRANT EXECUTE ON FUNCTION redeem_activation_code(TEXT) TO authenticated;
  END IF;
END $$;
