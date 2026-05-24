-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)
-- This creates the profiles table that links to Supabase Auth users

CREATE TABLE IF NOT EXISTS profiles (
  id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  email      TEXT        NOT NULL,
  role       TEXT        NOT NULL DEFAULT 'Data Entry',
  branch_id  TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_role CHECK (role IN ('Administrator', 'Branch Pastor', 'Pastor', 'Department Head', 'Data Entry'))
);

-- Disable RLS for now (matches the rest of the schema)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Index for fast role lookups
CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles(role);

-- ─── Migration: run these if the table already exists ───────────────────────
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS branch_id TEXT;
-- ALTER TABLE profiles DROP CONSTRAINT IF EXISTS valid_role;
-- ALTER TABLE profiles ADD CONSTRAINT valid_role
--   CHECK (role IN ('Administrator', 'Branch Pastor', 'Pastor', 'Department Head', 'Data Entry'));
