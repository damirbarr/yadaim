-- agency crews
-- Plain Postgres. Runs once, in a transaction. New tables get RLS automatically.


-- A crew is a group of an agency's workers placed together (trades may mix). A worker is in at most one crew,
-- so membership is a column on workers rather than a join table. The crew's main trade is computed from members.
create table if not exists agency_crews (
  id serial primary key,
  agency_id int not null references agencies(id),
  name text not null,
  leader_worker_id int references workers(id) on delete set null,
  created_at text not null default now_txt()
);
create index if not exists idx_crews_agency on agency_crews(agency_id);

alter table workers add column if not exists crew_id int references agency_crews(id) on delete set null;
create index if not exists idx_workers_crew on workers(crew_id);
