/**
 * Encouragement message generator for the Streaks feature.
 *
 * Follows the brand guardrails: progress, consistency, and wellbeing — never
 * shame, guilt, or "failure" language. Every message references only numbers
 * the app has already computed; this module never invents a count or target.
 *
 * The signature is the same shape a real LLM prompt would receive, so swapping
 * in a live model later means replacing the body of `generateEncouragement()`.
 */

function pick(lines) {
  return lines[Math.floor(Math.random() * lines.length)];
}

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'];
function word(n) {
  return WORDS[n] ?? String(n);
}

/**
 * @param {object} ctx
 * @param {number|null} ctx.target      weekly goal (1–7), null if not yet set
 * @param {number}      ctx.completed   workouts logged this week
 * @param {number}      ctx.streak      consecutive-day streak (>= 0)
 * @param {boolean}     ctx.justLogged  true right after a successful log
 * @returns {string} one encouraging sentence
 */
export function generateEncouragement({ target, completed, streak, justLogged }) {
  // Goal not yet set — invite, don't pressure.
  if (target === null || target === undefined) {
    if (justLogged) {
      return pick([
        "Nice work logging that workout — set a weekly goal to track your momentum.",
        "First workout in the books. Pick a weekly target and keep it going.",
      ]);
    }
    return pick([
      "Set a weekly goal that fits your schedule — every workout counts toward it.",
      "A realistic weekly goal makes consistency easier. Start whenever you're ready.",
    ]);
  }

  // Goal reached or exceeded.
  if (completed >= target) {
    if (completed === target) {
      return pick([
        `You hit your goal of ${word(target)} workouts this week — that's consistency worth celebrating.`,
        `Goal reached: ${word(target)} workouts. You're making real progress.`,
      ]);
    }
    return pick([
      `You've gone past your goal — ${word(completed)} workouts and counting. Outstanding week.`,
      `Past your target and still going. That's how routines stick.`,
    ]);
  }

  // Just logged a workout but goal not yet met.
  if (justLogged) {
    return pick([
      "You're making progress — one more workout closer to your goal.",
      "Great log. Each workout builds on the last.",
      "That's another step forward. Keep showing up.",
    ]);
  }

  // Has a streak going (>= 2 days).
  if (streak >= 2) {
    return pick([
      `${word(streak)} days in a row — your streak is building real momentum.`,
      `A ${word(streak)}-day streak. Consistency is the whole game, and you're playing it.`,
    ]);
  }

  // Some progress, no streak yet.
  if (completed > 0) {
    return pick([
      `${word(completed)} of ${word(target)} workouts this week. You're on your way.`,
      "Every workout adds up. You're making progress.",
    ]);
  }

  // No workouts yet this week — warm and forward-looking, never guilt.
  return pick([
    "A new week is a fresh start — log a workout when you're ready.",
    "This week is wide open. One workout is all it takes to begin.",
  ]);
}

export default generateEncouragement;
