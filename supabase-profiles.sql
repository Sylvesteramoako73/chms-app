-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)
-- This creates the profiles table that links to Supabase Auth users

CREATE TABLE IF NOT EXISTS profiles (
  id      UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name    TEXT        NOT NULL,
  email   TEXT        NOT NULL,
  role    TEXT        NOT NULL DEFAULT 'Data Entry',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_role CHECK (role IN ('Administrator', 'Pastor', 'Department Head', 'Data Entry'))
);

-- Disable RLS for now (matches the rest of the schema)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Index for fast role lookups
CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles(role);
