-- Run this once in your Supabase project's SQL Editor.

create extension if not exists "pgcrypto";

create table questions (
  id uuid primary key default gen_random_uuid(),
  type text not null,               -- 'mcq' | 'short' | 'long'
  subject text not null,
  text text not null,
  options jsonb,                    -- array of strings, mcq only
  correct int,                      -- index of correct option, mcq only
  marks int not null default 1,
  created_at timestamptz default now()
);

create table papers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subject text not null,
  question_ids jsonb not null,      -- array of question ids
  duration_min int not null default 60,
  total_marks int not null default 0,
  neg_marking boolean default false,
  neg_value numeric default 0,
  shuffle boolean default true,
  available_at timestamptz not null default now(),
  created_at timestamptz default now()
);

create table students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  roll text not null,
  class_name text,
  created_at timestamptz default now()
);

create table attempts (
  id uuid primary key default gen_random_uuid(),
  paper_id uuid references papers(id) on delete cascade,
  student_id uuid references students(id) on delete cascade,
  answers jsonb not null default '{}',
  mcq_score numeric not null default 0,
  mcq_max numeric not null default 0,
  has_subjective boolean not null default false,
  manual_score numeric default 0,
  graded boolean default false,
  subjective_scores jsonb default '{}',
  submitted_at timestamptz default now(),
  time_taken_sec int
);

-- Row Level Security: enabled but wide-open for this prototype so the
-- deployed link works without a separate login system. Anyone with the
-- link can read/write. Fine for a classroom pilot; tighten before wider use.
alter table questions enable row level security;
alter table papers enable row level security;
alter table students enable row level security;
alter table attempts enable row level security;

create policy "public read/write questions" on questions for all using (true) with check (true);
create policy "public read/write papers" on papers for all using (true) with check (true);
create policy "public read/write students" on students for all using (true) with check (true);
create policy "public read/write attempts" on attempts for all using (true) with check (true);
