import { useState, useEffect, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';

const WORKOUTS_KEY = 'pulse.workouts';
const GOAL_KEY = 'pulse.workoutGoal';
const HISTORY_KEY = 'pulse.workoutHistory';

const DEFAULT_GOAL = 3;
export const MIN_GOAL = 1;
export const MAX_GOAL = 7;

/**
 * Monday-Sunday week helpers. A "week" is keyed by the ISO date of its Monday.
 * Workouts are counted per distinct calendar day so two logs on the same day
 * only advance the streak once (guardrail #5).
 */
export function mondayOf(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const diff = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - diff);
  return d;
}

export function weekKey(date) {
  return mondayOf(date).toLocaleDateString('en-CA'); // YYYY-MM-DD
}

function dayKey(iso) {
  return new Date(iso).toLocaleDateString('en-CA');
}

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Custom hook for the Flexible Streaks feature.
 * Owns: logged workouts, the weekly goal, and archived weekly snapshots.
 * Weekly counts reset automatically when a new Monday-Sunday period begins,
 * while previous weeks are preserved in the history archive.
 */
export default function useWorkouts() {
  const [workouts, setWorkouts] = useState([]);
  const [goal, setGoal] = useState(DEFAULT_GOAL);
  const [history, setHistory] = useState([]);
  const [ready, setReady] = useState(false);

  // Load persisted state on mount, and archive any workouts from a
  // previous week into the history archive before rendering.
  useEffect(() => {
    const loadedWorkouts = load(WORKOUTS_KEY, []);
    const loadedGoal = load(GOAL_KEY, DEFAULT_GOAL);
    const loadedHistory = load(HISTORY_KEY, []);
    setGoal(loadedGoal);
    setHistory(loadedHistory);

    const thisWeek = weekKey(new Date());
    const current = loadedWorkouts.filter((w) => weekKey(w.timestamp) === thisWeek);
    const past = loadedWorkouts.filter((w) => weekKey(w.timestamp) !== thisWeek);

    if (past.length > 0) {
      // Group past workouts into weekly snapshots keyed by their Monday.
      const grouped = {};
      past.forEach((w) => {
        const k = weekKey(w.timestamp);
        if (!grouped[k]) grouped[k] = [];
        grouped[k].push(w);
      });
      const newSnapshots = Object.entries(grouped).map(([k, list]) => ({
        weekStart: k,
        goal: loadedGoal,
        completed: list.length,
        distinctDays: new Set(list.map((w) => dayKey(w.timestamp))).size,
      }));
      const merged = [...loadedHistory];
      newSnapshots.forEach((snap) => {
        const idx = merged.findIndex((m) => m.weekStart === snap.weekStart);
        if (idx === -1) {
          merged.push(snap);
        } else {
          // Replace with the freshly recomputed snapshot so past-dated logs
          // update that week's counts and goal status.
          merged[idx] = snap;
        }
      });
      merged.sort((a, b) => a.weekStart.localeCompare(b.weekStart));
      setHistory(merged);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(merged));
      // Keep only the current week's workouts in the active list.
      setWorkouts(current);
      localStorage.setItem(WORKOUTS_KEY, JSON.stringify(current));
    } else {
      setWorkouts(loadedWorkouts);
    }
    setReady(true);
  }, []);

  const persistWorkouts = useCallback((next) => {
    setWorkouts(next);
    localStorage.setItem(WORKOUTS_KEY, JSON.stringify(next));
  }, []);

  const add = useCallback((entry) => {
    const newEntry = {
      id: entry.id || uuidv4(),
      type: entry.type || 'workout',
      duration: entry.duration || null,
      note: entry.note || '',
      timestamp: entry.timestamp || new Date().toISOString(),
    };
    persistWorkouts((prev) => [...prev, newEntry]);
    return newEntry;
  }, [persistWorkouts]);

  const remove = useCallback((id) => {
    persistWorkouts((prev) => prev.filter((w) => w.id !== id));
  }, [persistWorkouts]);

  const setWeeklyGoal = useCallback((next) => {
    const clamped = Math.max(MIN_GOAL, Math.min(MAX_GOAL, Math.round(next)));
    setGoal(clamped);
    localStorage.setItem(GOAL_KEY, JSON.stringify(clamped));
  }, []);

  const clearAll = useCallback(() => {
    persistWorkouts([]);
    setHistory([]);
    localStorage.removeItem(WORKOUTS_KEY);
    localStorage.removeItem(HISTORY_KEY);
    setWeeklyGoal(DEFAULT_GOAL);
  }, [persistWorkouts, setWeeklyGoal]);

  // Streak derivation — a week counts toward a streak ONLY when the user met
  // or exceeded that week's goal (distinct workout days >= goal). This uses
  // the stored per-week goal for archived weeks and the live goal for the
  // current week, so changing the goal doesn't retroactively rewrite history.
  //
  // The current week is only added to the streak once its goal is met. Until
  // then, the streak shows the run of consecutive goal-met weeks ending at the
  // most recent *completed* week — the user still has time to finish this
  // week, so we never reset a streak mid-week.
  const streaks = useMemo(() => {
    const thisWeekStart = weekKey(new Date());

    // Goal-met weeks from archived history (each carries its own stored goal).
    const goalMetWeeks = new Set(
      history.filter((h) => h.distinctDays >= h.goal).map((h) => h.weekStart)
    );

    // Fold in weeks derived from the live workouts array. This covers the
    // current week AND any past-dated workouts logged this session that haven't
    // been archived yet. Group by week and count distinct days.
    const byWeek = {};
    workouts.forEach((w) => {
      const k = weekKey(w.timestamp);
      if (!byWeek[k]) byWeek[k] = new Set();
      byWeek[k].add(dayKey(w.timestamp));
    });
    Object.entries(byWeek).forEach(([k, days]) => {
      if (days.size >= goal) goalMetWeeks.add(k);
      else goalMetWeeks.delete(k); // ensure consistency if a workout was removed
    });

    const sortedWeeks = [...goalMetWeeks].sort((a, b) => a.localeCompare(b));
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    function weeksConsecutive(newerKey, olderKey) {
      const diff = new Date(newerKey + 'T00:00:00').getTime() - new Date(olderKey + 'T00:00:00').getTime();
      return diff === ONE_WEEK_MS;
    }
    function priorMondayKey(weekK) {
      const d = new Date(weekK + 'T00:00:00');
      d.setDate(d.getDate() - 7);
      return d.toLocaleDateString('en-CA');
    }

    // Current streak: if this week met its goal, count the consecutive run
    // ending here (inclusive). Otherwise, count the run ending at last week —
    // but only if last week is goal-met; if not, the streak is 0 (it broke).
    let currentStreak = 0;
    if (goalMetWeeks.has(thisWeekStart)) {
      currentStreak = 1;
      let cursor = thisWeekStart;
      for (let i = sortedWeeks.length - 2; i >= 0; i--) {
        if (weeksConsecutive(cursor, sortedWeeks[i])) {
          currentStreak += 1;
          cursor = sortedWeeks[i];
        } else {
          break;
        }
      }
    } else {
      const lastWeek = priorMondayKey(thisWeekStart);
      if (goalMetWeeks.has(lastWeek)) {
        currentStreak = 1;
        let cursor = lastWeek;
        // Walk down the sorted list from the lastWeek entry.
        const startIdx = sortedWeeks.indexOf(lastWeek);
        for (let i = startIdx - 1; i >= 0; i--) {
          if (weeksConsecutive(cursor, sortedWeeks[i])) {
            currentStreak += 1;
            cursor = sortedWeeks[i];
          } else {
            break;
          }
        }
      }
    }

    // Longest streak: longest run of consecutive Mondays among goal-met weeks.
    let longestStreak = 0;
    let run = 0;
    let prevKey = null;
    sortedWeeks.forEach((k) => {
      if (prevKey && weeksConsecutive(prevKey, k)) {
        run += 1;
      } else {
        run = 1;
      }
      if (run > longestStreak) longestStreak = run;
      prevKey = k;
    });

    return { currentStreak, longestStreak };
  }, [workouts, history, goal]);

  return {
    workouts,
    goal,
    history,
    ready,
    currentStreak: streaks.currentStreak,
    longestStreak: streaks.longestStreak,
    add,
    remove,
    setWeeklyGoal,
    clearAll,
  };
}
