import React, { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Slider from '@mui/material/Slider';
import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import DeleteIcon from '@mui/icons-material/Delete';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import StarIcon from '@mui/icons-material/Star';
import { tokens } from '../theme';
import { weekKey, mondayOf, MIN_GOAL, MAX_GOAL } from '../hooks/useWorkouts';

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'];
function word(n) { return WORDS[n] ?? String(n); }
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function dayWord(n) { return n === 1 ? 'day' : 'days'; }
function pick(lines) { return lines[Math.floor(Math.random() * lines.length)]; }

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/**
 * Encouraging, never-guilt message based on this week's progress vs goal.
 * Follows the brand voice: progress, consistency, wellbeing — no shaming.
 */
function buildMessage({ completed, goal, pct, metGoal }) {
  if (completed === 0) {
    return pick([
      "A new week is a fresh start — your first workout is all it takes to begin.",
      "Nothing logged yet, and that's okay. The week is wide open and yours to shape.",
    ]);
  }
  if (metGoal) {
    return pick([
      `${cap(word(completed))} ${dayWord(completed)} down and your goal of ${goal} is met — you're making progress.`,
      `Goal hit at ${word(completed)} ${dayWord(completed)}. That consistency is exactly what carries you forward.`,
    ]);
  }
  if (pct >= 0.5) {
    return pick([
      `${cap(word(completed))} ${dayWord(completed)} so far — you're well on your way to ${goal} this week.`,
      `Over halfway to your weekly goal. Every log this week is real momentum.`,
    ]);
  }
  return pick([
    `${cap(word(completed))} ${dayWord(completed)} logged — a real beginning to build on.`,
    `You showed up ${word(completed)} ${dayWord(completed)} this week. That still counts, and there's time for more.`,
  ]);
}

/**
 * Progress ring — circular SVG indicator showing completed/goal.
 */
function ProgressRing({ completed, goal, size = 120 }) {
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = goal > 0 ? Math.min(1, completed / goal) : 0;
  const offset = circ * (1 - pct);
  const metGoal = completed >= goal && goal > 0;

  return (
    <Box sx={{ position: 'relative', width: size, height: size, mx: 'auto' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={tokens.accentDim12}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={metGoal ? '#4ADE80' : tokens.violetBright}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s ease' }}
        />
      </svg>
      <Box sx={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
          <Typography sx={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, fontSize: '2rem', lineHeight: 1 }}>
            {completed}
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: '1rem' }}>/ {goal}</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.7rem', mt: 0.5 }}>
          workouts
        </Typography>
      </Box>
    </Box>
  );
}

export default function Progress({ workouts, goal, history, currentStreak, longestStreak, onAddWorkout, onRemoveWorkout, onSetGoal }) {
  const [showHistory, setShowHistory] = useState(false);

  const thisWeekKey = weekKey(new Date());
  const weekStart = mondayOf(new Date());

  const currentWeek = useMemo(() => workouts.filter((w) => weekKey(w.timestamp) === thisWeekKey), [workouts, thisWeekKey]);
  const distinctDays = useMemo(() => new Set(currentWeek.map((w) => new Date(w.timestamp).toLocaleDateString('en-CA'))).size, [currentWeek]);
  const completed = distinctDays;
  const pct = goal > 0 ? completed / goal : 0;
  const metGoal = completed >= goal && goal > 0;

  const message = useMemo(() => buildMessage({ completed, goal, pct, metGoal }), [completed, goal, pct, metGoal]);

  const sortedHistory = useMemo(() => [...history].sort((a, b) => b.weekStart.localeCompare(a.weekStart)), [history]);

  const sortedCurrent = useMemo(() => [...currentWeek].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)), [currentWeek]);

  // Build the 7-day weekly activity strip — Mon..Sun of the current week.
  const weekDays = useMemo(() => {
    const days = [];
    const workoutDayKeys = new Set(currentWeek.map((w) => new Date(w.timestamp).toLocaleDateString('en-CA')));
    const todayKey = new Date().toLocaleDateString('en-CA');
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const key = d.toLocaleDateString('en-CA');
      days.push({
        key,
        label: d.toLocaleDateString('en-US', { weekday: 'narrow' }).toUpperCase(),
        dateNum: d.getDate(),
        done: workoutDayKeys.has(key),
        isToday: key === todayKey,
        isFuture: d > new Date() && key !== todayKey,
      });
    }
    return days;
  }, [currentWeek, weekStart]);

  const streakLabel = 'Week Streak';
  const remaining = Math.max(0, goal - completed);
  const streakSubtitle = metGoal
    ? (currentStreak === 1
        ? "Weekly goal achieved! You're on a 1-week streak — keep it going next week."
        : `Weekly goal achieved! ${currentStreak} weeks in a row of meeting your goal.`)
    : (completed === 0
        ? `Log ${goal} ${goal === 1 ? 'workout' : 'workouts'} this week to earn your streak.`
        : `${completed} of ${goal} workouts completed — ${remaining} more to earn this week's streak.`);
  const streakActive = currentStreak > 0 && metGoal;

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', px: 2, py: 3 }}>
      <Typography variant="h5" sx={{ fontSize: '1.2rem', mb: 0.5 }}>
        Weekly Progress
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Set a goal, log workouts, and keep your streak going — at your pace.
      </Typography>

      {/* Streak hero — the primary visual focus of the page */}
      <Card
        id="progress-streak-hero"
        sx={{
          mb: 2,
          position: 'relative',
          overflow: 'hidden',
          borderColor: streakActive ? `rgba(${tokens.accentRGB},0.40)` : 'divider',
          boxShadow: streakActive
            ? `0 0 32px rgba(${tokens.accentBrightRGB},0.22)`
            : `0 0 24px rgba(${tokens.accentBrightRGB},0.10)`,
          '&::before': streakActive ? {
            content: '""',
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(ellipse at 20% 0%, ${tokens.glowViolet} 0%, transparent 60%)`,
            pointerEvents: 'none',
          } : undefined,
        }}
      >
        <CardContent sx={{ py: 4, px: { xs: 3, sm: 4 }, position: 'relative' }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { sm: 'center' }, gap: 3, justifyContent: 'space-between' }}>
            {/* Big streak number */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <LocalFireDepartmentIcon
                sx={{
                  fontSize: { xs: 48, sm: 56 },
                  color: streakActive ? '#FF8A3D' : metGoal ? tokens.violetBright : 'text.secondary',
                  filter: streakActive ? 'drop-shadow(0 0 12px rgba(255,138,61,0.5))' : 'none',
                }}
              />
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                  <Typography
                    component="span"
                    id="progress-current-streak"
                    sx={{
                      fontFamily: '"Space Grotesk", sans-serif',
                      fontWeight: 700,
                      fontSize: { xs: '2.75rem', sm: '3.25rem' },
                      lineHeight: 1,
                      color: 'text.primary',
                      letterSpacing: '0.01em',
                    }}
                  >
                    {currentStreak}
                  </Typography>
                  <Typography
                    component="span"
                    sx={{
                      fontFamily: '"Space Grotesk", sans-serif',
                      fontWeight: 600,
                      fontSize: { xs: '1.1rem', sm: '1.3rem' },
                      color: 'text.secondary',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}
                  >
                    {streakLabel}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {streakSubtitle}
                </Typography>
                <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {metGoal ? (
                    <Chip
                      id="progress-streak-status-chip"
                      icon={<EmojiEventsIcon sx={{ fontSize: 16 }} />}
                      label="Weekly goal achieved!"
                      size="small"
                      sx={{
                        fontFamily: '"Space Grotesk", sans-serif',
                        letterSpacing: '0.06em',
                        color: '#4ADE80',
                        border: '1px solid rgba(74,222,128,0.5)',
                        backgroundColor: 'rgba(74,222,128,0.10)',
                      }}
                      variant="outlined"
                    />
                  ) : (
                    <Chip
                      id="progress-streak-status-chip"
                      icon={<LocalFireDepartmentIcon sx={{ fontSize: 16 }} />}
                      label="In progress"
                      size="small"
                      sx={{
                        fontFamily: '"Space Grotesk", sans-serif',
                        letterSpacing: '0.06em',
                        color: tokens.violetBright,
                        border: '1px solid',
                        borderColor: 'divider',
                        backgroundColor: tokens.accentDim08,
                      }}
                      variant="outlined"
                    />
                  )}
                </Box>
              </Box>
            </Box>

            {/* Longest streak + goal chip — secondary stats, visually quieter */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography
                  sx={{
                    fontFamily: '"Space Grotesk", sans-serif',
                    fontWeight: 700,
                    fontSize: '1.5rem',
                    lineHeight: 1,
                    color: tokens.violetBright,
                  }}
                >
                  {longestStreak}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.7rem', mt: 0.5, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Best
                </Typography>
              </Box>
              <Box sx={{ width: 1, height: 40, backgroundColor: 'divider', mx: 0.5 }} />
              <Box sx={{ textAlign: 'center' }}>
                <Typography
                  sx={{
                    fontFamily: '"Space Grotesk", sans-serif',
                    fontWeight: 700,
                    fontSize: '1.5rem',
                    lineHeight: 1,
                    color: metGoal ? '#4ADE80' : 'text.primary',
                  }}
                >
                  {completed}/{goal}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.7rem', mt: 0.5, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  This week
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Weekly activity strip — Mon..Sun, at-a-glance consistency */}
          <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                This week
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                {metGoal ? `Goal met — ${completed} of ${goal}` : `${completed} of ${goal} goal`}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between' }}>
              {weekDays.map((d) => (
                <Box
                  key={d.key}
                  sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 0.5,
                  }}
                >
                  <Typography variant="body2" sx={{ fontSize: '0.65rem', color: 'text.secondary', fontWeight: 600, letterSpacing: '0.08em' }}>
                    {d.label}
                  </Typography>
                  <Box
                    sx={{
                      width: { xs: 34, sm: 42 },
                      height: { xs: 34, sm: 42 },
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: d.done
                        ? '1px solid rgba(74,222,128,0.5)'
                        : d.isToday
                          ? `1px solid ${tokens.accentBorder40}`
                          : '1px solid',
                      borderColor: d.done ? 'rgba(74,222,128,0.5)' : d.isToday ? tokens.accentBorder40 : 'divider',
                      backgroundColor: d.done
                        ? 'rgba(74,222,128,0.16)'
                        : d.isFuture
                          ? 'transparent'
                          : d.isToday
                            ? tokens.accentDim08
                            : 'transparent',
                      color: d.done ? '#4ADE80' : 'text.secondary',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    {d.done ? (
                      <FitnessCenterIcon sx={{ fontSize: { xs: 16, sm: 18 } }} />
                    ) : (
                      <Typography sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                        {d.dateNum}
                      </Typography>
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        {/* Progress ring + message */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card id="progress-current-card" sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                This week's workouts
              </Typography>
              <ProgressRing completed={completed} goal={goal} />
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  id="progress-streak-chip"
                  icon={<LocalFireDepartmentIcon sx={{ fontSize: 18 }} />}
                  label={`${completed} ${dayWord(completed)} logged`}
                  sx={{ fontFamily: '"Space Grotesk", sans-serif', letterSpacing: '0.06em', color: tokens.violetBright, border: '1px solid', borderColor: 'divider', backgroundColor: tokens.accentDim08 }}
                  variant="outlined"
                />
                {metGoal && (
                  <Chip
                    id="progress-goal-met-chip"
                    icon={<EmojiEventsIcon sx={{ fontSize: 18 }} />}
                    label="Goal met!"
                    sx={{ fontFamily: '"Space Grotesk", sans-serif', letterSpacing: '0.06em', color: '#4ADE80', border: '1px solid', borderColor: 'divider', backgroundColor: 'rgba(74,222,128,0.10)' }}
                    variant="outlined"
                  />
                )}
              </Box>
              <Box id="progress-message" sx={{ mt: 3, pt: 3, borderTop: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'flex-start', gap: 1.5, textAlign: 'left', minHeight: 64 }}>
                <AutoAwesomeIcon sx={{ color: 'primary.light', fontSize: 20, mt: 0.25, flexShrink: 0 }} />
                <Typography variant="body1" sx={{ color: 'text.primary', lineHeight: 1.6 }}>
                  {message}
                </Typography>
              </Box>
              <Button
                variant="contained"
                size="large"
                fullWidth
                startIcon={<FitnessCenterIcon />}
                onClick={onAddWorkout}
                id="progress-log-workout-button"
                sx={{ mt: 3 }}
              >
                Log a workout
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Goal setter + weekly trend */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card id="progress-goal-card" sx={{ height: '100%' }}>
            <CardContent sx={{ py: 3 }}>
              <Typography variant="h6" sx={{ fontSize: '0.85rem', mb: 1 }}>
                Weekly Goal
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Pick a target that fits your schedule. You can change it any time — your history stays intact.
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, mb: 1 }}>
                <Typography sx={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, fontSize: '2.5rem', lineHeight: 1, color: 'text.primary' }}>
                  {goal}
                </Typography>
                <Typography color="text.secondary">workouts / week</Typography>
              </Box>
              <Slider
                value={goal}
                min={MIN_GOAL}
                max={MAX_GOAL}
                step={1}
                onChange={(_, v) => onSetGoal(v)}
                valueLabelDisplay="auto"
                id="progress-goal-slider"
                marks={Array.from({ length: MAX_GOAL }, (_, i) => ({ value: i + 1, label: String(i + 1) }))}
                sx={{
                  color: 'primary.main',
                  '& .MuiSlider-markLabel': { fontSize: '0.7rem', color: 'text.secondary' },
                }}
              />
              <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Recent weeks
                </Typography>
                {sortedHistory.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                    No previous weeks yet. Finish this week and it'll appear here.
                  </Typography>
                ) : (
                  <List disablePadding dense>
                    {sortedHistory.slice(0, 4).map((h, idx) => {
                      const startLabel = new Date(h.weekStart + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      const prev = sortedHistory[idx + 1];
                      let TrendIcon = TrendingFlatIcon;
                      let trendColor = tokens.violetBright;
                      let trendLabel = 'Same as prior';
                      if (prev) {
                        if (h.distinctDays > prev.distinctDays) { TrendIcon = TrendingUpIcon; trendColor = '#4ADE80'; trendLabel = 'Up'; }
                        else if (h.distinctDays < prev.distinctDays) { TrendIcon = TrendingDownIcon; trendColor = '#FBBF24'; trendLabel = 'Down'; }
                      }
                      return (
                        <React.Fragment key={h.weekStart}>
                          {idx > 0 && <Divider sx={{ borderColor: tokens.accentDim12 }} />}
                          <ListItem sx={{ py: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 1, color: trendColor }}>
                              <TrendIcon sx={{ fontSize: 18 }} />
                            </Box>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{startLabel}</Typography>
                                  <Chip size="small" label={`${h.distinctDays}/${h.goal}`} sx={{ height: 20, fontSize: '0.7rem', fontFamily: '"Space Grotesk", sans-serif' }} />
                                  {h.distinctDays >= h.goal && (
                                    <StarIcon sx={{ fontSize: 16, color: '#4ADE80' }} />
                                  )}
                                </Box>
                              }
                              secondary={trendLabel}
                              secondaryTypographyProps={{ color: 'text.secondary', fontSize: '0.7rem' }}
                            />
                          </ListItem>
                        </React.Fragment>
                      );
                    })}
                  </List>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* This week's logged workouts */}
        <Grid size={{ xs: 12 }}>
          <Card id="progress-this-week-card">
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="h6" sx={{ fontSize: '0.85rem' }}>
                  This week's logs
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                  {currentWeek.length} {currentWeek.length === 1 ? 'entry' : 'entries'} · {distinctDays} {dayWord(distinctDays)}
                </Typography>
              </Box>
              {currentWeek.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                  No workouts logged yet this week. Tap "Log a workout" to get started.
                </Typography>
              ) : (
                <List disablePadding dense>
                  {sortedCurrent.map((w, idx) => (
                    <React.Fragment key={w.id}>
                      {idx > 0 && <Divider sx={{ borderColor: tokens.accentDim12 }} />}
                      <ListItem
                        id={`progress-workout-${w.id}`}
                        secondaryAction={
                          <IconButton
                            edge="end"
                            size="small"
                            onClick={() => onRemoveWorkout(w.id)}
                            aria-label="Delete workout"
                            sx={{ color: 'text.secondary', '&:hover': { color: '#ef4444' } }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        }
                        sx={{ py: 1 }}
                      >
                        <FitnessCenterIcon sx={{ color: 'primary.light', fontSize: 20, mr: 1.5 }} />
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {w.duration ? `${w.duration} min` : 'Workout'}
                              </Typography>
                              {w.note && (
                                <Chip label={w.note} size="small" variant="outlined" sx={{ height: 22, fontSize: '0.7rem', borderColor: tokens.borderViolet, color: 'text.secondary' }} />
                              )}
                            </Box>
                          }
                          secondary={formatDate(w.timestamp)}
                          secondaryTypographyProps={{ color: 'text.secondary', fontSize: '0.75rem' }}
                        />
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Full multi-week history (progressive disclosure) */}
        <Grid size={{ xs: 12 }}>
          <Card id="progress-history-card">
            <CardContent>
              <Box
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                onClick={() => setShowHistory((v) => !v)}
                role="button"
                aria-expanded={showHistory}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowHistory((v) => !v); } }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h6" sx={{ fontSize: '0.85rem' }}>
                    All weeks
                  </Typography>
                  <Chip size="small" label={history.length} sx={{ height: 20, fontSize: '0.7rem', fontFamily: '"Space Grotesk", sans-serif' }} />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                  {showHistory ? 'Hide' : 'Show'}
                </Typography>
              </Box>
              {showHistory && (
                <Box sx={{ mt: 2 }}>
                  {sortedHistory.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                      No archived weeks yet. Previous weeks will appear here once a new week begins.
                    </Typography>
                  ) : (
                    <List disablePadding dense>
                      {sortedHistory.map((h, idx) => {
                        const startLabel = new Date(h.weekStart + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        return (
                          <React.Fragment key={h.weekStart}>
                            {idx > 0 && <Divider sx={{ borderColor: tokens.accentDim12 }} />}
                            <ListItem sx={{ py: 1 }}>
                              <ListItemText
                                primary={
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{startLabel}</Typography>
                                    <Chip size="small" label={`${h.distinctDays}/${h.goal} days`} sx={{ height: 20, fontSize: '0.7rem', fontFamily: '"Space Grotesk", sans-serif' }} />
                                    {h.distinctDays >= h.goal && <StarIcon sx={{ fontSize: 16, color: '#4ADE80' }} />}
                                  </Box>
                                }
                                secondary={`${h.completed} ${h.completed === 1 ? 'workout' : 'workouts'} logged`}
                                secondaryTypographyProps={{ color: 'text.secondary', fontSize: '0.7rem' }}
                              />
                            </ListItem>
                          </React.Fragment>
                        );
                      })}
                    </List>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
