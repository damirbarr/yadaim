-- promotions
-- Plain Postgres. Runs once, in a transaction. New tables get RLS automatically.



-- Sale prices (מחירי מבצע). An agency takes pct off the final hourly price of its workers in one trade, for
-- bookings whose every day falls inside [date_from, date_to]. A booking that only partly overlaps pays the regular
-- price: the sale exists to fill these specific idle days, and one rule is easier to explain than a split invoice.
-- Created together with the campaign that announces it (the send button is the agency's approval).
-- ended_at: the agency stopped the sale early; the row stays as a record of what contractors were offered.
create table if not exists promotions (
  id serial primary key,
  agency_id int not null references agencies(id),
  trade text not null,
  date_from text not null,
  date_to text not null,
  pct int not null check (pct between 5 and 50),
  campaign_id int references campaigns(id) on delete set null,
  created_at text not null default now_txt(),
  ended_at text,
  check (date_from <= date_to)
);
create index if not exists idx_promotions_lookup on promotions(agency_id, trade, date_to);
create index if not exists idx_promotions_campaign on promotions(campaign_id);
