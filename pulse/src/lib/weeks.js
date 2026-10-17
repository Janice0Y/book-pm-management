/**
 * Week-boundary helpers for the Streaks feature.
 * Weeks run Monday → Sunday (ISO weeks). All date math is local, not UTC — the
 * student's "today" determines which week they are in.
 */

/** Return the local YYYY-MM-DD for a Date (or default to today). */
export function localDateStr(d = new Date()) {
  return d.toLocaleDateString('en-CA'); // YYYY-MM-DD, local time
}

/** Return a new Date set to the Monday that starts the week containing `d`. */
export function startOfWeek(d = new Date()) {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = date.getDay(); // 0=Sun ... 6=Sat
  const diff = (day === 0 ? -6 : 1 - day); // shift back to Monday
  date.setDate(date.getDate() + diff);
  return date;
}

/** YYYY-MM-DD string for the Monday that starts the week containing `d`. */
export function weekStartStr(d = new Date()) {
  return localDateStr(startOfWeek(d));
}

/**
 * Build the seven day strings (YYYY-MM-DD) for the week whose Monday is
 * `mondayStr`. Index 0 is Monday, 6 is Sunday.
 */
export function weekDays(mondayStr) {
  const monday = new Date(mondayStr + 'T12:00:00');
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(localDateStr(d));
  }
  return days;
}

const SHORT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Short weekday label (Mon, Tue, …) for a 0-indexed offset from Monday. */
export function weekdayLabel(offset) {
  return SHORT_DAYS[offset] ?? '';
}

/** Human-friendly range label, e.g. "Oct 6 – Oct 12". */
export function weekRangeLabel(mondayStr) {
  const monday = new Date(mondayStr + 'T12:00:00');
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(monday)} – ${fmt(sunday)}`;
}

/** True when the week starting `mondayStr` contains today. */
export function isCurrentWeek(mondayStr) {
  return mondayStr === weekStartStr();
}

/**
 * Return the last `count` week-start strings (Mondays) ending with the current
 * week, oldest first. Useful for building a multi-week history list.
 */
export function recentWeekStarts(count) {
  const current = startOfWeek();
  const out = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(current);
    d.setDate(current.getDate() - i * 7);
    out.push(localDateStr(d));
  }
  return out;
}
