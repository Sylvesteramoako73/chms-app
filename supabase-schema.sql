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

-- ============================================================
-- FEATURE EXTENSIONS — Run after the base schema above
-- ============================================================

-- Workers Management
create table if not exists workers (
  id text primary key,
  member_id text references members(id) on delete set null,
  first_name text not null,
  last_name text not null default '',
  phone text not null default '',
  email text,
  department_id text references departments(id) on delete set null,
  role_title text not null default 'Member',
  service_unit text,
  status text not null default 'Active',
  join_date text not null,
  notes text,
  created_at timestamptz default now()
);

create table if not exists worker_attendance (
  id text primary key,
  worker_id text not null references workers(id) on delete cascade,
  date text not null,
  service_type text not null,
  present boolean not null default true,
  notes text
);

create table if not exists worker_schedules (
  id text primary key,
  worker_id text not null references workers(id) on delete cascade,
  date text not null,
  start_time text not null,
  end_time text not null,
  duty text not null,
  department_id text,
  notes text,
  status text not null default 'Scheduled'
);

alter table workers disable row level security;
alter table worker_attendance disable row level security;
alter table worker_schedules disable row level security;

-- Automation / Reminder System
create table if not exists reminder_templates (
  id text primary key,
  name text not null,
  type text not null,
  channel text not null,
  subject text,
  body text not null,
  is_active boolean not null default true,
  days_before_event int not null default 0,
  created_at timestamptz default now()
);

create table if not exists reminder_logs (
  id text primary key,
  template_id text,
  template_name text,
  recipient_name text not null,
  recipient_contact text not null,
  channel text not null,
  type text not null,
  message text not null,
  sent_at text not null,
  status text not null default 'Sent'
);

alter table reminder_templates disable row level security;
alter table reminder_logs disable row level security;

-- Child Check-In System
create table if not exists children (
  id text primary key,
  first_name text not null,
  last_name text not null default '',
  date_of_birth text,
  gender text not null default 'Male',
  allergies text,
  medical_notes text,
  class_room text,
  qr_code text not null,
  created_at timestamptz default now()
);

create table if not exists guardians (
  id text primary key,
  first_name text not null,
  last_name text not null default '',
  phone text not null,
  email text,
  relationship text not null default 'Parent',
  child_ids text[] not null default '{}',
  member_id text references members(id) on delete set null,
  security_code text not null,
  is_authorized_pickup boolean not null default true
);

create table if not exists child_checkins (
  id text primary key,
  child_id text not null,
  guardian_id text not null,
  check_in_time text not null,
  check_out_time text,
  check_in_by text not null,
  check_out_by text,
  date text not null,
  notes text,
  status text not null default 'Checked In'
);

alter table children disable row level security;
alter table guardians disable row level security;
alter table child_checkins disable row level security;

-- Sermon & Media Library
create table if not exists preachers (
  id text primary key,
  name text not null,
  title text,
  bio text,
  avatar_url text
);

create table if not exists sermon_categories (
  id text primary key,
  name text not null,
  color text not null default '#4A7C6F'
);

create table if not exists sermons (
  id text primary key,
  title text not null,
  preacher_id text references preachers(id) on delete set null,
  category_id text references sermon_categories(id) on delete set null,
  scripture text,
  description text,
  date text not null,
  audio_url text,
  video_url text,
  pdf_url text,
  thumbnail_url text,
  tags text[] not null default '{}',
  duration text,
  is_featured boolean not null default false,
  view_count int not null default 0,
  created_at timestamptz default now()
);

alter table preachers disable row level security;
alter table sermon_categories disable row level security;
alter table sermons disable row level security;

-- Cell / Small Group Management
create table if not exists cell_groups (
  id text primary key,
  name text not null,
  leader_id text references members(id) on delete set null,
  co_leader_id text references members(id) on delete set null,
  meeting_day text,
  meeting_time text,
  location text,
  description text,
  campus_id text references campuses(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists cell_members (
  id text primary key,
  cell_id text not null references cell_groups(id) on delete cascade,
  member_id text not null references members(id) on delete cascade,
  role text not null default 'Member',
  join_date text not null
);

create table if not exists cell_attendance (
  id text primary key,
  cell_id text not null references cell_groups(id) on delete cascade,
  date text not null,
  present_member_ids text[] not null default '{}',
  topic_discussed text,
  offerings numeric,
  notes text
);

create table if not exists cell_reports (
  id text primary key,
  cell_id text not null references cell_groups(id) on delete cascade,
  date text not null,
  reported_by text not null,
  attendance int not null default 0,
  new_visitors int not null default 0,
  conversions int not null default 0,
  topic_covered text not null,
  highlights text,
  challenges text,
  prayer_points text,
  created_at timestamptz default now()
);

alter table cell_groups disable row level security;
alter table cell_members disable row level security;
alter table cell_attendance disable row level security;
alter table cell_reports disable row level security;

-- Seed default sermon categories
insert into sermon_categories (id, name, color) values
  ('sc1', 'Sunday Service', '#C9A84C'),
  ('sc2', 'Midweek Teaching', '#4A7C6F'),
  ('sc3', 'Prayer & Worship', '#6366f1'),
  ('sc4', 'Evangelism', '#f97316'),
  ('sc5', 'Youth', '#ec4899')
on conflict (id) do nothing;
