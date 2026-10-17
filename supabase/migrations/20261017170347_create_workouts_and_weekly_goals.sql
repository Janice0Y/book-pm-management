/*
# Create workouts and weekly_goals tables for Streaks & Progress Tracking

## Purpose
Adds the data layer for the "Flexible Streaks and Progress Tracking" feature in
York U Fitness (the `yorku` brand variant of the Pulse app). Students set a
realistic weekly workout goal, log completed workouts, and track progress across
multiple weeks. Historical records are preserved when a new week begins or a
goal changes. Each student can view only their own data.

## New Tables

1. `workouts`
   - `id` (uuid, primary key)
   - `user_id` (uuid, not null, defaults to auth.uid(), references auth.users with ON DELETE CASCADE)
   - `workout_date` (date, not null) — the calendar day the workout was performed,
     supplied by the client in the student's local timezone. Used for the
     one-workout-per-day uniqueness rule and for weekly grouping.
   - `logged_at` (timestamptz, not null, default now()) — server timestamp of when the row was created
   - `activity` (text, not null) — short label the student picks, e.g. "Run", "Strength"
   - `duration_min` (integer, nullable) — optional duration in minutes
   - `note` (text, not null, default '') — optional free-text note
   - `created_at` (timestamptz, default now())

   A unique index on (user_id, workout_date) enforces one workout-per-day streak
   credit: two logs on the same day do not increase the streak or weekly count
   twice (test state #5). The weekly "completed count" is derived as the count of
   DISTINCT workout_date values inside the current week — never inflated by
   multiple same-day logs.

2. `weekly_goals`
   - `id` (uuid, primary key)
   - `user_id` (uuid, not null, defaults to auth.uid(), references auth.users with ON DELETE CASCADE)
   - `week_start` (date, not null) — the Monday that starts the tracking week
   - `target` (integer, not null, check 1..7) — desired number of workouts that week
   - `created_at` (timestamptz, default now())

   A unique constraint on (user_id, week_start) means each student has at most
   one goal per week. Inserting a goal for a new week never overwrites or
   deletes prior weeks' rows, preserving history (test state #4).

## Security
- Row Level Security ENABLED on both tables.
- Both tables are owner-scoped to the authenticated user via auth.uid() = user_id.
- Four policies per table (SELECT / INSERT / UPDATE / DELETE), all TO authenticated.
- user_id columns DEFAULT auth.uid() so client inserts that omit user_id still
  satisfy the WITH CHECK ownership predicate.

## Important notes
1. No destructive operations — this migration only creates new tables, indexes,
   constraints, and policies. It does not alter existing tables.
2. Week boundaries use ISO weeks (Monday–Sunday). week_start is always a Monday.
3. workout_date is a plain date (no timezone), so the unique index is immutable.
*/

CREATE TABLE IF NOT EXISTS workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_date date NOT NULL,
  logged_at timestamptz NOT NULL DEFAULT now(),
  activity text NOT NULL,
  duration_min integer,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

-- One workout credit per user per calendar day (test state #5).
CREATE UNIQUE INDEX IF NOT EXISTS workouts_user_day_uniq
  ON workouts (user_id, workout_date);

CREATE INDEX IF NOT EXISTS workouts_user_date_idx
  ON workouts (user_id, workout_date DESC);

DROP POLICY IF EXISTS "select_own_workouts" ON workouts;
CREATE POLICY "select_own_workouts" ON workouts FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_workouts" ON workouts;
CREATE POLICY "insert_own_workouts" ON workouts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_workouts" ON workouts;
CREATE POLICY "update_own_workouts" ON workouts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_workouts" ON workouts;
CREATE POLICY "delete_own_workouts" ON workouts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS weekly_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  target integer NOT NULL CHECK (target >= 1 AND target <= 7),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE weekly_goals ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS weekly_goals_user_week_uniq
  ON weekly_goals (user_id, week_start);

DROP POLICY IF EXISTS "select_own_weekly_goals" ON weekly_goals;
CREATE POLICY "select_own_weekly_goals" ON weekly_goals FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_weekly_goals" ON weekly_goals;
CREATE POLICY "insert_own_weekly_goals" ON weekly_goals FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_weekly_goals" ON weekly_goals;
CREATE POLICY "update_own_weekly_goals" ON weekly_goals FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_weekly_goals" ON weekly_goals;
CREATE POLICY "delete_own_weekly_goals" ON weekly_goals FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
