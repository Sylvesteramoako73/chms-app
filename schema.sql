-- =============================================================================
-- ChurchCare SaaS — Complete Database Schema with Row Level Security
--
-- Run this entire file in your Supabase project:
--   Dashboard → SQL Editor → New query → paste → Run
--
-- Design principles:
--   • Every table has church_id UUID NOT NULL
--   • RLS is enabled on every table
--   • The auth_church_id() helper reads church_id from the user's JWT
--   • No query from one church can ever touch another church's rows
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------------
-- 1. Helper: read church_id from the current user's JWT
--    Priority: user_metadata.church_id → auth.uid() (always a non-null UUID)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auth_church_id()
RETURNS UUID
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(auth.jwt() -> 'user_metadata' ->> 'church_id', '')::UUID,
    auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. PROFILES
--    One row per user. church_id inherited from the registering admin.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'Data Entry',
  church_id  UUID NOT NULL,
  branch_id  UUID,
  phone      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "church_isolation" ON profiles
  FOR ALL
  USING  (church_id = auth_church_id())
  WITH CHECK (church_id = auth_church_id());

-- ---------------------------------------------------------------------------
-- 3. CHURCH SETTINGS
--    One row per church. Stores billing plan etc.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS church_settings (
  church_id  UUID PRIMARY KEY,
  plan       TEXT NOT NULL DEFAULT 'starter',
  name       TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE church_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "church_isolation" ON church_settings
  FOR ALL
  USING  (church_id = auth_church_id())
  WITH CHECK (church_id = auth_church_id());

-- ---------------------------------------------------------------------------
-- 4. CAMPUSES  (referenced by many tables — create before them)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS campuses (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id  UUID NOT NULL,
  name       TEXT NOT NULL,
  address    TEXT,
  pastor     TEXT,
  is_main    BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE campuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "church_isolation" ON campuses
  FOR ALL
  USING  (church_id = auth_church_id())
  WITH CHECK (church_id = auth_church_id());

-- ---------------------------------------------------------------------------
-- 5. DEPARTMENTS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS departments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id   UUID NOT NULL,
  name        TEXT NOT NULL,
  leader_id   UUID,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "church_isolation" ON departments
  FOR ALL
  USING  (church_id = auth_church_id())
  WITH CHECK (church_id = auth_church_id());

-- ---------------------------------------------------------------------------
-- 6. SMALL GROUPS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS small_groups (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id    UUID NOT NULL,
  name         TEXT NOT NULL,
  leader_id    UUID,
  meeting_day  TEXT,
  meeting_time TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE small_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "church_isolation" ON small_groups
  FOR ALL
  USING  (church_id = auth_church_id())
  WITH CHECK (church_id = auth_church_id());

-- ---------------------------------------------------------------------------
-- 7. MEMBERS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS members (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id      UUID NOT NULL,
  first_name     TEXT NOT NULL,
  last_name      TEXT NOT NULL,
  phone          TEXT,
  email          TEXT,
  address        TEXT,
  date_of_birth  DATE,
  gender         TEXT,
  marital_status TEXT,
  occupation     TEXT,
  department_id  UUID REFERENCES departments(id) ON DELETE SET NULL,
  small_group_id UUID REFERENCES small_groups(id) ON DELETE SET NULL,
  campus_id      UUID REFERENCES campuses(id) ON DELETE SET NULL,
  status         TEXT NOT NULL DEFAULT 'Active',
  join_date      DATE,
  baptism_date   DATE,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "church_isolation" ON members
  FOR ALL
  USING  (church_id = auth_church_id())
  WITH CHECK (church_id = auth_church_id());

-- ---------------------------------------------------------------------------
-- 8. ATTENDANCE RECORDS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance_records (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id          UUID NOT NULL,
  service_type       TEXT NOT NULL,
  date               DATE NOT NULL,
  present_member_ids UUID[] NOT NULL DEFAULT '{}',
  visitors_count     INTEGER NOT NULL DEFAULT 0,
  campus_id          UUID REFERENCES campuses(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "church_isolation" ON attendance_records
  FOR ALL
  USING  (church_id = auth_church_id())
  WITH CHECK (church_id = auth_church_id());

-- ---------------------------------------------------------------------------
-- 9. GIVING RECORDS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS giving_records (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id      UUID NOT NULL,
  member_id      UUID REFERENCES members(id) ON DELETE SET NULL,
  date           DATE NOT NULL,
  amount         NUMERIC(12,2) NOT NULL,
  type           TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  campus_id      UUID REFERENCES campuses(id) ON DELETE SET NULL,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE giving_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "church_isolation" ON giving_records
  FOR ALL
  USING  (church_id = auth_church_id())
  WITH CHECK (church_id = auth_church_id());

-- ---------------------------------------------------------------------------
-- 10. EVENTS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id           UUID NOT NULL,
  title               TEXT NOT NULL,
  date                DATE NOT NULL,
  time                TEXT,
  location            TEXT,
  description         TEXT,
  department_id       UUID REFERENCES departments(id) ON DELETE SET NULL,
  campus_id           UUID REFERENCES campuses(id) ON DELETE SET NULL,
  organizer           TEXT,
  expected_attendance INTEGER,
  is_recurring        BOOLEAN NOT NULL DEFAULT false,
  recurring_pattern   TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "church_isolation" ON events
  FOR ALL
  USING  (church_id = auth_church_id())
  WITH CHECK (church_id = auth_church_id());

-- ---------------------------------------------------------------------------
-- 11. PRAYER REQUESTS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prayer_requests (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id     UUID NOT NULL,
  member_id     UUID REFERENCES members(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  body          TEXT,
  category      TEXT,
  is_private    BOOLEAN NOT NULL DEFAULT false,
  is_answered   BOOLEAN NOT NULL DEFAULT false,
  answered_note TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE prayer_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "church_isolation" ON prayer_requests
  FOR ALL
  USING  (church_id = auth_church_id())
  WITH CHECK (church_id = auth_church_id());

-- ---------------------------------------------------------------------------
-- 12. PASTORAL VISITS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pastoral_visits (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id          UUID NOT NULL,
  member_id          UUID REFERENCES members(id) ON DELETE CASCADE,
  visit_type         TEXT NOT NULL,
  date               DATE NOT NULL,
  conducted_by       TEXT NOT NULL,
  notes              TEXT,
  follow_up_date     DATE,
  follow_up_complete BOOLEAN NOT NULL DEFAULT false,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE pastoral_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "church_isolation" ON pastoral_visits
  FOR ALL
  USING  (church_id = auth_church_id())
  WITH CHECK (church_id = auth_church_id());

-- ---------------------------------------------------------------------------
-- 13. VOLUNTEER ROLES
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS volunteer_roles (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id           UUID NOT NULL,
  event_id            UUID REFERENCES events(id) ON DELETE CASCADE,
  role_name           TEXT NOT NULL,
  assigned_member_ids UUID[] NOT NULL DEFAULT '{}',
  max_volunteers      INTEGER,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE volunteer_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "church_isolation" ON volunteer_roles
  FOR ALL
  USING  (church_id = auth_church_id())
  WITH CHECK (church_id = auth_church_id());

-- ---------------------------------------------------------------------------
-- 14. CAMPAIGNS  (pledge fundraising)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS campaigns (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id   UUID NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  goal_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  start_date  DATE NOT NULL,
  end_date    DATE,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "church_isolation" ON campaigns
  FOR ALL
  USING  (church_id = auth_church_id())
  WITH CHECK (church_id = auth_church_id());

-- ---------------------------------------------------------------------------
-- 15. PLEDGES
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pledges (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id     UUID NOT NULL,
  campaign_id   UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  member_id     UUID REFERENCES members(id) ON DELETE SET NULL,
  pledge_amount NUMERIC(12,2) NOT NULL,
  paid_amount   NUMERIC(12,2) NOT NULL DEFAULT 0,
  pledge_date   DATE NOT NULL,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE pledges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "church_isolation" ON pledges
  FOR ALL
  USING  (church_id = auth_church_id())
  WITH CHECK (church_id = auth_church_id());

-- ---------------------------------------------------------------------------
-- 16. PLEDGE PAYMENTS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pledge_payments (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id  UUID NOT NULL,
  pledge_id  UUID REFERENCES pledges(id) ON DELETE CASCADE,
  amount     NUMERIC(12,2) NOT NULL,
  date       DATE NOT NULL,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE pledge_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "church_isolation" ON pledge_payments
  FOR ALL
  USING  (church_id = auth_church_id())
  WITH CHECK (church_id = auth_church_id());

-- ---------------------------------------------------------------------------
-- 17. AUDIT LOGS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id   UUID NOT NULL,
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  entity      TEXT NOT NULL,
  action      TEXT NOT NULL,
  entity_id   TEXT,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "church_isolation" ON audit_logs
  FOR ALL
  USING  (church_id = auth_church_id())
  WITH CHECK (church_id = auth_church_id());

-- ---------------------------------------------------------------------------
-- 18. ACCOUNTING: GL ACCOUNTS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gl_accounts (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id      UUID NOT NULL,
  code           TEXT NOT NULL,
  name           TEXT NOT NULL,
  type           TEXT NOT NULL,   -- income | expense | asset | liability | equity
  campus_id      UUID REFERENCES campuses(id) ON DELETE SET NULL,
  is_giving_sync BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (church_id, code)
);
ALTER TABLE gl_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "church_isolation" ON gl_accounts
  FOR ALL
  USING  (church_id = auth_church_id())
  WITH CHECK (church_id = auth_church_id());

-- ---------------------------------------------------------------------------
-- 19. ACCOUNTING: GL TRANSACTIONS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gl_transactions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id   UUID NOT NULL,
  date        DATE NOT NULL,
  description TEXT NOT NULL,
  account_id  UUID REFERENCES gl_accounts(id) ON DELETE RESTRICT,
  amount      NUMERIC(12,2) NOT NULL,
  type        TEXT NOT NULL,   -- income | expense
  campus_id   UUID REFERENCES campuses(id) ON DELETE SET NULL,
  reference   TEXT,
  created_by  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE gl_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "church_isolation" ON gl_transactions
  FOR ALL
  USING  (church_id = auth_church_id())
  WITH CHECK (church_id = auth_church_id());

-- ---------------------------------------------------------------------------
-- 20. ACCOUNTING: GL BUDGETS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gl_budgets (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id  UUID NOT NULL,
  account_id UUID REFERENCES gl_accounts(id) ON DELETE CASCADE,
  year       INTEGER NOT NULL,
  month      INTEGER,
  amount     NUMERIC(12,2) NOT NULL,
  campus_id  UUID REFERENCES campuses(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE gl_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "church_isolation" ON gl_budgets
  FOR ALL
  USING  (church_id = auth_church_id())
  WITH CHECK (church_id = auth_church_id());

-- ---------------------------------------------------------------------------
-- 21. Indexes for common filter + sort patterns
-- ---------------------------------------------------------------------------
CREATE INDEX ON profiles           (church_id);
CREATE INDEX ON campuses           (church_id);
CREATE INDEX ON departments        (church_id);
CREATE INDEX ON small_groups       (church_id);
CREATE INDEX ON members            (church_id, created_at DESC);
CREATE INDEX ON attendance_records (church_id, date DESC);
CREATE INDEX ON giving_records     (church_id, date DESC);
CREATE INDEX ON events             (church_id, date DESC);
CREATE INDEX ON prayer_requests    (church_id, created_at DESC);
CREATE INDEX ON pastoral_visits    (church_id, date DESC);
CREATE INDEX ON volunteer_roles    (church_id);
CREATE INDEX ON campaigns          (church_id, start_date DESC);
CREATE INDEX ON pledges            (church_id, pledge_date DESC);
CREATE INDEX ON pledge_payments    (church_id, date DESC);
CREATE INDEX ON audit_logs         (church_id, timestamp DESC);
CREATE INDEX ON gl_accounts        (church_id, code);
CREATE INDEX ON gl_transactions    (church_id, date DESC);
CREATE INDEX ON gl_budgets         (church_id, year, month);
