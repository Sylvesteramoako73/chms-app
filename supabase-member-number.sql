-- Run this once in Supabase → SQL Editor to add member numbers to an existing database.
ALTER TABLE members ADD COLUMN IF NOT EXISTS member_number TEXT;
