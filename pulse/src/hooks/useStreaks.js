import { useState, useEffect, useCallback, useMemo } from 'react';
import supabase from '../lib/supabaseClient';
import {
  weekStartStr,
  weekDays,
  weekdayLabel,
  localDateStr,
  recentWeekStarts,
  isCurrentWeek,
  weekRangeLabel,
} from '../lib/weeks';

const HISTORY_WEEKS = 8;

/**
 * Loads and mutates a student's workout history and weekly goals from Supabase.
 * All data is owner-scoped by RLS, so every read returns only the signed-in
 * student's own rows (privacy test state #6).
 *
 * Shape:
 *   currentWeek  — { weekStart, target, completed, days: [{date,label,done}] }
 *   history      — array of past-week summaries, oldest first (excludes current)
 *   streak       — count of consecutive days (ending today) with a logged workout
 *   logWorkout   — insert a workout for a given date (one-per-day enforced by DB)
 *   deleteWorkout — remove a workout by id
 *   setWeeklyGoal — upsert the goal for the current week
 */
export default function useStreaks(user) {
  const [workouts, setWorkouts] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load all of the student's workouts and goals once they are signed in.
  useEffect(() => {
    if (!user) {
      setWorkouts([]);
      setGoals([]);
      setLoading(false);
      return;
    }
    let active = true;
    (async () => {
      setLoading(true);
      setError('');
      const [w, g] = await Promise.all([
        supabase.from('workouts').select('*').order('workout_date', { ascending: false }),
        supabase.from('weekly_goals').select('*').order('week_start', { ascending: false }),
      ]);
      if (!active) return;
      if (w.error) setError(w.error.message);
      else setWorkouts(w.data ?? []);
      if (g.error) setError(g.error.message);
      else setGoals(g.data ?? []);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [user]);

  // Index workouts by date for quick lookup.
  const workoutsByDate = useMemo(() => {
    const map = new Map();
    for (const w of workouts) {
      const day = typeof w.workout_date === 'string' ? w.workout_date : w.workout_date;
      map.set(day, w);
    }
    return map;
  }, [workouts]);

  const goalsByWeek = useMemo(() => {
    const map = new Map();
    for (const g of goals) map.set(g.week_start, g);
    return map;
  }, [goals]);

  const currentWeekStart = weekStartStr();

  // Current week summary with per-day breakdown.
  const currentWeek = useMemo(() => {
    const days = weekDays(currentWeekStart).map((date, i) => ({
      date,
      label: weekdayLabel(i),
      done: workoutsByDate.has(date),
      workout: workoutsByDate.get(date) ?? null,
    }));
    const completed = days.filter((d) => d.done).length;
    const goal = goalsByWeek.get(currentWeekStart);
    const target = goal?.target ?? null;
    return { weekStart: currentWeekStart, target, completed, days };
  }, [currentWeekStart, workoutsByDate, goalsByWeek]);

  // Past weeks (oldest first), excluding the current week.
  const history = useMemo(() => {
    const starts = recentWeekStarts(HISTORY_WEEKS).filter((s) => s !== currentWeekStart);
    return starts.map((weekStart) => {
      const days = weekDays(weekStart);
      const completed = days.filter((d) => workoutsByDate.has(d)).length;
      const goal = goalsByWeek.get(weekStart);
      return {
        weekStart,
        range: weekRangeLabel(weekStart),
        target: goal?.target ?? null,
        completed,
        isCurrent: false,
      };
    });
  }, [currentWeekStart, workoutsByDate, goalsByWeek]);

  // Streak: consecutive days ending today (or the most recent workout day) with
  // a logged workout. Missed days break the streak without erasing history.
  const streak = useMemo(() => {
    if (workouts.length === 0) return 0;
    const today = localDateStr();
    let cursor = new Date(today + 'T12:00:00');
    // If today has no workout, start the count from the most recent workout day
    // so the streak reflects the run that just ended rather than reporting 0.
    if (!workoutsByDate.has(today)) {
      const recent = workouts
        .map((w) => w.workout_date)
        .filter((d) => d <= today)
        .sort()
        .pop();
      if (!recent) return 0;
      cursor = new Date(recent + 'T12:00:00');
    }
    let count = 0;
    // Walk backwards day-by-day while a workout exists for that day.
    for (let i = 0; i < 400; i++) {
      const ds = localDateStr(cursor);
      if (workoutsByDate.has(ds)) {
        count += 1;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
    return count;
  }, [workouts, workoutsByDate]);

  /** Insert a workout for a given date. The DB unique constraint blocks a second
   *  log on the same day, so the weekly count never counts a day twice. */
  const logWorkout = useCallback(async ({ date, activity, durationMin, note }) => {
    const workoutDate = date || localDateStr();
    const payload = {
      workout_date: workoutDate,
      activity,
      duration_min: durationMin ? Number(durationMin) : null,
      note: note ?? '',
    };
    const { data, error: err } = await supabase.from('workouts').insert(payload).select().single();
    if (err) {
      // 23505 = unique_violation — already logged today. Treat as a friendly
      // no-op rather than an error so the UI stays supportive.
      if (err.code === '23505') return { alreadyLogged: true };
      throw err;
    }
    setWorkouts((prev) => [data, ...prev]);
    return { alreadyLogged: false, workout: data };
  }, []);

  const deleteWorkout = useCallback(async (id) => {
    const { error: err } = await supabase.from('workouts').delete().eq('id', id);
    if (err) throw err;
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
  }, []);

  /** Upsert the weekly goal for the current week. Never touches past weeks. */
  const setWeeklyGoal = useCallback(async (target) => {
    const weekStart = weekStartStr();
    const existing = goalsByWeek.get(weekStart);
    if (existing) {
      const { data, error: err } = await supabase
        .from('weekly_goals')
        .update({ target })
        .eq('id', existing.id)
        .select()
        .single();
      if (err) throw err;
      setGoals((prev) => prev.map((g) => (g.id === existing.id ? data : g)));
      return data;
    }
    const { data, error: err } = await supabase
      .from('weekly_goals')
      .insert({ week_start: weekStart, target })
      .select()
      .single();
    if (err) throw err;
    setGoals((prev) => [data, ...prev]);
    return data;
  }, [goalsByWeek]);

  return {
    loading,
    error,
    currentWeek,
    history,
    streak,
    logWorkout,
    deleteWorkout,
    setWeeklyGoal,
  };
}
