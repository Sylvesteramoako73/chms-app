-- ============================================================
-- Winners' Chapel Takoradi Fijai — ChMS Database Schema
-- Run this entire file in Supabase SQL Editor
-- ============================================================

create table if not exists campuses (
  id text primary key,
  name text not null,
  address text,
  pastor text,
  is_main boolean not null default false
);

create table if not exists departments (
  id text primary key,
  name text not null,
  leader_id text,
  description text
);

create table if not exists small_groups (
  id text primary key,
  name text not null,
  leader_id text,
  meeting_day text not null default '',
  meeting_time text not null default ''
);

create table if not exists members (
  id text primary key,
  first_name text not null,
  last_name text not null default '',
  phone text not null default '',
  email text not null default '',
  address text not null default '',
  date_of_birth text,
  gender text not null default 'Male',
  marital_status text not null default 'Single',
  occupation text,
  department_id text references departments(id) on delete set null,
  small_group_id text references small_groups(id) on delete set null,
  campus_id text references campuses(id) on delete set null,
  status text not null default 'Visitor',
  join_date text not null default '',
  baptism_date text,
  notes text,
  avatar_url text,
  created_at timestamptz default now()
);

create table if not exists attendance_records (
  id text primary key,
  service_type text not null,
  date text not null,
  present_member_ids text[] not null default '{}',
  visitors_count int not null default 0,
  campus_id text references campuses(id) on delete set null
);

create table if not exists giving_records (
  id text primary key,
  member_id text references members(id) on delete set null,
  date text not null,
  amount numeric not null,
  type text not null,
  payment_method text not null,
  campus_id text references campuses(id) on delete set null,
  notes text
);

create table if not exists events (
  id text primary key,
  title text not null,
  date text not null,
  time text not null,
  location text not null,
  description text not null default '',
  department_id text references departments(id) on delete set null,
  campus_id text references campuses(id) on delete set null,
  organizer text not null,
  expected_attendance int,
  is_recurring boolean not null default false,
  recurring_pattern text
);

create table if not exists prayer_requests (
  id text primary key,
  member_id text references members(id) on delete set null,
  title text not null,
  body text not null,
  category text not null,
  is_private boolean not null default false,
  is_answered boolean not null default false,
  answered_note text,
  created_at text not null
);

create table if not exists pastoral_visits (
  id text primary key,
  member_id text not null,
  visit_type text not null,
  date text not null,
  conducted_by text not null,
  notes text,
  follow_up_date text,
  follow_up_complete boolean not null default false
);

create table if not exists volunteer_roles (
  id text primary key,
  event_id text not null,
  role_name text not null,
  assigned_member_ids text[] not null default '{}',
  max_volunteers int
);

create table if not exists campaigns (
  id text primary key,
  title text not null,
  description text,
  goal_amount numeric not null,
  start_date text not null,
  end_date text,
  is_active boolean not null default true
);

create table if not exists pledges (
  id text primary key,
  campaign_id text not null,
  member_id text references members(id) on delete set null,
  pledge_amount numeric not null,
  paid_amount numeric not null default 0,
  pledge_date text not null,
  notes text
);

create table if not exists pledge_payments (
  id text primary key,
  pledge_id text not null,
  amount numeric not null,
  date text not null,
  notes text
);

create table if not exists audit_logs (
  id text primary key,
  timestamp timestamptz not null default now(),
  entity text not null,
  action text not null,
  entity_id text not null,
  description text not null
);

-- Disable RLS for now (no auth yet — enable & add policies when you add login)
alter table campuses disable row level security;
alter table departments disable row level security;
alter table small_groups disable row level security;
alter table members disable row level security;
alter table attendance_records disable row level security;
alter table giving_records disable row level security;
alter table events disable row level security;
alter table prayer_requests disable row level security;
alter table pastoral_visits disable row level security;
alter table volunteer_roles disable row level security;
alter table campaigns disable row level security;
alter table pledges disable row level security;
alter table pledge_payments disable row level security;
alter table audit_logs disable row level security;

-- ============================================================
-- Seed: Winners' Chapel Takoradi Fijai — Campuses & Departments
-- ============================================================
insert into campuses (id, name, address, pastor, is_main) values
  ('c1', 'Winners'' Chapel Takoradi Fijai', 'Fijai, Takoradi, Western Region, Ghana', 'Pst. Callistus Madilo', true)
on conflict (id) do nothing;

insert into departments (id, name) values
  ('d1', 'Choir'),
  ('d2', 'Ushers'),
  ('d3', 'Youth'),
  ('d4', 'Children''s Ministry'),
  ('d5', 'Media'),
  ('d6', 'Evangelism')
on conflict (id) do nothing;
