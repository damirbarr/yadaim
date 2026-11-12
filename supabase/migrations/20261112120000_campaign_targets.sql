-- campaign targets
-- Plain Postgres. Runs once, in a transaction. New tables get RLS automatically.

-- What an offer is about. 'trade': every free worker of one trade (the original offer). 'crew': one agency crew.
-- 'workers': workers the agency picked. For crew and workers, worker_ids keeps who was offered when it was sent
-- (comma-separated ids), so the contractor's link shows exactly those people even if the crew changes later.
-- trade stays filled (the group's main trade) so older screens and reports keep working.
alter table campaigns add column if not exists target text not null default 'trade';
alter table campaigns add column if not exists crew_id int references agency_crews(id) on delete set null;
alter table campaigns add column if not exists worker_ids text;
alter table campaigns drop constraint if exists campaigns_target_check;
alter table campaigns add constraint campaigns_target_check check (target in ('trade', 'crew', 'workers'));
