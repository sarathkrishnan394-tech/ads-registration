create table if not exists callers (
  id text primary key,
  name text not null,
  email text not null,
  phone text not null,
  emirate text not null,
  daily_capacity integer not null default 80,
  active boolean not null default true
);

create table if not exists campaigns (
  id text primary key,
  name text not null,
  type text not null,
  status text not null,
  start_date date not null,
  end_date date not null,
  goal_registrations integer not null default 0,
  goal_conversions integer not null default 0,
  summary text not null,
  plan_markdown text not null
);

create table if not exists events (
  id text primary key,
  campaign_id text not null references campaigns (id),
  name text not null,
  type text not null,
  event_date timestamptz not null,
  venue text not null,
  capacity integer not null,
  agenda text not null
);

create table if not exists customers (
  id integer primary key,
  company_name text not null,
  contact_name text not null,
  designation text not null,
  email text not null,
  mobile text not null,
  emirate text not null,
  sector text not null,
  turnover text not null,
  erp text not null,
  source text not null,
  status text not null,
  score integer not null default 0,
  campaign_id text references campaigns (id),
  assigned_caller_id text references callers (id),
  last_contacted_at timestamptz,
  notes text,
  duplicate_of integer,
  created_at timestamptz not null default now()
);

create index if not exists customers_status_idx on customers (status);
create index if not exists customers_email_idx on customers (email);
create index if not exists customers_mobile_idx on customers (mobile);
create index if not exists customers_emirate_idx on customers (emirate);
create index if not exists customers_caller_idx on customers (assigned_caller_id);
create index if not exists customers_company_idx on customers (lower(company_name));

create table if not exists event_registrations (
  id serial primary key,
  event_id text not null references events (id),
  customer_id integer not null references customers (id),
  attendees integer not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists event_registrations_event_idx on event_registrations (event_id);

create table if not exists allocations (
  id serial primary key,
  allocation_date date not null,
  caller_id text not null references callers (id),
  customer_id integer not null references customers (id),
  priority text not null,
  status text not null default 'pending',
  unique (allocation_date, customer_id)
);

create index if not exists allocations_day_caller_idx on allocations (allocation_date, caller_id);

create table if not exists call_logs (
  id serial primary key,
  customer_id integer not null references customers (id),
  caller_id text not null references callers (id),
  called_at timestamptz not null default now(),
  outcome text not null,
  duration_seconds integer,
  notes text,
  next_follow_up date
);

create index if not exists call_logs_called_at_idx on call_logs (called_at);
create index if not exists call_logs_caller_idx on call_logs (caller_id);

create table if not exists proposals (
  id serial primary key,
  customer_id integer not null references customers (id),
  title text not null,
  service_line text not null,
  body_markdown text not null,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

create table if not exists conversions (
  id serial primary key,
  customer_id integer not null references customers (id),
  service_line text not null,
  value_aed numeric not null,
  converted_at timestamptz not null default now(),
  notes text
);

create table if not exists duplicate_groups (
  id serial primary key,
  match_type text not null,
  match_key text not null,
  confidence text not null,
  status text not null default 'open',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists duplicate_members (
  group_id integer not null references duplicate_groups (id) on delete cascade,
  customer_id integer not null references customers (id),
  primary key (group_id, customer_id)
);

create table if not exists agent_runs (
  id serial primary key,
  agent_id text not null,
  title text not null,
  output_markdown text not null,
  created_at timestamptz not null default now()
);

create table if not exists daily_reports (
  id serial primary key,
  report_date date not null,
  slot text not null,
  title text not null,
  body_markdown text not null,
  created_at timestamptz not null default now(),
  unique (report_date, slot)
);
