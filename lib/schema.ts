// Single source of truth for the database schema (Postgres — PGlite locally, Supabase in production).
// `npm run db:export-schema` writes this to supabase/migrations/0001_init.sql.
// Every statement is idempotent so it can run on every boot in development.

export const SCHEMA = /* sql */ `
create or replace function now_txt(delta interval default interval '0') returns text
  language sql stable as $$ select to_char((now() + delta) at time zone 'utc', 'YYYY-MM-DD HH24:MI:SS') $$;

create table if not exists agencies (
  id serial primary key,
  name text not null,
  slug text unique not null,
  license_no text not null,
  verified int not null default 0,
  city text not null,
  regions text not null,                          -- comma separated region keys
  phone text,
  about text,
  lodging_discount double precision not null default 8,  -- ₪/hour off when the contractor provides lodging
  transport_rate double precision not null default 6,    -- ₪/hour when the agency provides transport
  suspended int not null default 0,
  auto_campaign int not null default 1,
  min_days int not null default 1,                -- minimum placement length the agency accepts (legal/commercial)
  created_at text not null default now_txt()
);

create table if not exists contractors (
  id serial primary key,
  company text not null,
  registry_no text not null,                      -- מספר רישום ברשם הקבלנים
  verified int not null default 0,
  contact_name text not null,
  phone text,
  city text,
  classification text,                            -- סיווג, e.g. 100 ג-1
  created_at text not null default now_txt()
);

-- role = what kind of account; org_role = permission level inside the agency/contractor (see lib/rbac.ts)
create table if not exists users (
  id serial primary key,
  email text unique not null,
  name text not null,
  role text not null default 'pending' check (role in ('admin','agency','contractor','pending')),
  org_role text not null default 'owner' check (org_role in ('owner','manager','viewer')),
  agency_id int references agencies(id),
  contractor_id int references contractors(id),
  disabled int not null default 0,
  auth_subject text,                              -- Supabase auth user id
  avatar_url text,
  last_login_at text,
  created_at text not null default now_txt()
);

create table if not exists invites (
  id serial primary key,
  email text not null,
  role text not null check (role in ('admin','agency','contractor')),
  org_role text not null default 'manager' check (org_role in ('owner','manager','viewer')),
  agency_id int references agencies(id),
  contractor_id int references contractors(id),
  invited_by int references users(id),
  accepted_at text,
  created_at text not null default now_txt()
);

create table if not exists sessions (
  token text primary key,
  user_id int not null references users(id) on delete cascade,
  impersonator_id int references users(id),
  expires_at text not null
);

create table if not exists workers (
  id serial primary key,
  agency_id int not null references agencies(id),
  first_name text not null,
  last_name text not null,
  trade text not null,
  years int not null default 0,
  country text not null,
  lang text not null default 'en',
  phone text,
  passport_no text,
  hourly_rate double precision not null,
  active int not null default 1,
  photo text,
  token text unique not null,
  skills text,
  created_at text not null default now_txt()
);

create table if not exists documents (
  id serial primary key,
  worker_id int not null references workers(id) on delete cascade,
  type text not null,
  number text,
  expires text,                                   -- YYYY-MM-DD
  status text not null default 'verified' check (status in ('verified','pending','rejected')),
  file text,
  verified_at text,
  renewal_requested_at text,
  created_at text not null default now_txt()
);

create table if not exists bookings (
  id serial primary key,
  contractor_id int not null references contractors(id),
  agency_id int not null references agencies(id),
  trade text not null,
  date text not null,                             -- first work day
  end_date text not null,                         -- last work day
  days int not null default 1,                    -- work days (Sun–Thu) in the range
  source text not null default 'marketplace' check (source in ('marketplace','direct')),
  start_time text not null default '07:00',
  hours double precision not null default 9,
  city text not null,
  address text not null,
  lodging text not null default 'agency' check (lodging in ('agency','contractor')),
  transport text not null default 'agency' check (transport in ('agency','contractor')),
  status text not null default 'requested' check (status in ('requested','approved','rejected','cancelled','completed')),
  notes text,
  pickup_time text,
  driver_name text,
  vehicle_no text,
  campaign_id int,
  agency_note text,
  created_at text not null default now_txt(),
  approved_at text,
  completed_at text
);

create table if not exists booking_workers (
  id serial primary key,
  booking_id int not null references bookings(id) on delete cascade,
  worker_id int not null references workers(id),
  hourly_rate double precision not null,          -- final ₪/hour incl. lodging/transport adjustments
  state text not null default 'assigned' check (state in ('assigned','removed')),
  arrived int,                                    -- 1 arrived, 0 no-show, null unknown
  identity_ok text,                               -- yes / partial / no
  trade_ok text,                                  -- yes / partial / no
  checkin_at text,
  hours_approved double precision,
  rating int,
  tags text,
  review text
);

create table if not exists crews (
  id serial primary key,
  contractor_id int not null references contractors(id),
  name text not null,
  worker_ids text not null,
  created_at text not null default now_txt()
);

create table if not exists crm_contacts (
  id serial primary key,
  agency_id int not null references agencies(id),
  name text not null,
  company text,
  phone text not null,
  city text,
  region text,
  trades text,
  source text not null default 'manual',
  opted_out int not null default 0,
  last_sent_at text,
  created_at text not null default now_txt(),
  unique (agency_id, phone)
);

create table if not exists campaigns (
  id serial primary key,
  agency_id int not null references agencies(id),
  trade text not null,
  date_from text not null,
  date_to text not null,
  idle_days int not null,
  message text not null,
  status text not null default 'draft' check (status in ('draft','sent')),
  created_at text not null default now_txt(),
  sent_at text
);

create table if not exists campaign_recipients (
  id serial primary key,
  campaign_id int not null references campaigns(id) on delete cascade,
  contact_id int not null references crm_contacts(id),
  ref text unique not null,
  sent_at text,
  opened_at text,
  booked_at text
);

-- Business activity feed shown to agencies
create table if not exists events (
  id serial primary key,
  agency_id int,
  contractor_id int,
  booking_id int,
  kind text not null,
  text text not null,
  created_at text not null default now_txt()
);

-- Security/audit trail shown to admins
create table if not exists audit_log (
  id serial primary key,
  actor_id int,
  impersonator_id int,
  action text not null,
  target text,
  details text,
  created_at text not null default now_txt()
);

create index if not exists idx_bw_worker on booking_workers(worker_id);
create index if not exists idx_bw_booking on booking_workers(booking_id);
create index if not exists idx_bookings_date on bookings(date, end_date);
create index if not exists idx_docs_worker on documents(worker_id);
create index if not exists idx_workers_agency on workers(agency_id);
create index if not exists idx_events_agency on events(agency_id, id);

-- Supabase exposes the public schema over its REST API. The app talks to Postgres directly as the
-- owner role, so we lock every table for the anon/authenticated API roles (RLS on, no policies).
alter table agencies enable row level security;
alter table contractors enable row level security;
alter table users enable row level security;
alter table invites enable row level security;
alter table sessions enable row level security;
alter table workers enable row level security;
alter table documents enable row level security;
alter table bookings enable row level security;
alter table booking_workers enable row level security;
alter table crews enable row level security;
alter table crm_contacts enable row level security;
alter table campaigns enable row level security;
alter table campaign_recipients enable row level security;
alter table events enable row level security;
alter table audit_log enable row level security;
`;
