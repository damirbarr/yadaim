-- attendance
-- Plain Postgres. Runs once, in a transaction. New tables get RLS automatically.

-- Daily attendance on site: one row per booked worker per work day, written by the contractor on the "work day"
-- screen. Billing reads it (lib/attendance.ts): a day marked "did not arrive" is never billed, and the hours
-- suggested at the end of the booking are the sum of the recorded days. Bookings without rows keep the old
-- behaviour (planned hours per day), so history from before this table stays as it was.
create table if not exists attendance (
  id serial primary key,
  booking_worker_id int not null references booking_workers(id) on delete cascade,
  date text not null,                             -- YYYY-MM-DD, one of the booking's work days
  arrived int,                                    -- 1 arrived, 0 did not arrive
  start_time text,                                -- HH:MM entry on site
  end_time text,                                  -- HH:MM exit
  hours double precision,                         -- end minus start, minus the break (lib/attendance.ts workedHours)
  note text,
  recorded_by int references users(id),
  created_at text not null default now_txt(),
  updated_at text not null default now_txt(),
  unique (booking_worker_id, date)
);
create index if not exists idx_attendance_date on attendance(date);
