-- site briefings
-- Plain Postgres. Runs once, in a transaction. New tables get RLS automatically.

-- A safety briefing belongs to a site, not to the worker: it's a form the worker signs at one contractor's site
-- and it is usually valid for a year. "Same site" = same contractor + same address after trim / collapsed
-- spaces / lowercase (see siteKey() in lib/queries.ts and the index below).
create table if not exists site_briefings (
  id serial primary key,
  worker_id int not null references workers(id) on delete cascade,
  contractor_id int not null references contractors(id),
  site text not null,                             -- the booking address as entered
  signed_at text not null,                        -- YYYY-MM-DD
  expires text not null,                          -- signed_at + 1 year
  booking_id int references bookings(id) on delete set null,
  file text,
  created_at text not null default now_txt()
);
create index if not exists idx_briefings_worker on site_briefings(worker_id);
create index if not exists idx_briefings_site on site_briefings(contractor_id, (lower(regexp_replace(btrim(site), '\s+', ' ', 'g'))));

-- The old generic "safety training" worker document is replaced by per-site briefings.
delete from documents where type = 'safety';
