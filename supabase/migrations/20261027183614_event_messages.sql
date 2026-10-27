-- event messages
-- Plain Postgres. Runs once, in a transaction. New tables get RLS automatically.

-- Activity feed entries are rendered in the reader's language: store a message key + parameters, not a sentence.
alter table events add column if not exists msg text;
alter table events add column if not exists params text;
alter table events alter column text drop not null;
