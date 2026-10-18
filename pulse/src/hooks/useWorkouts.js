import { useState, useEffect, useCallback } from 'react';
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
        if (!merged.some((m) => m.weekStart === snap.weekStart)) {
          merged.push(snap);
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

  return {
    workouts,
    goal,
    history,
    ready,
    add,
    remove,
    setWeeklyGoal,
    clearAll,
  };
}
