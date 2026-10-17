import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Alert from '@mui/material/Alert';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import LinearProgress from '@mui/material/LinearProgress';
import CircularProgress from '@mui/material/CircularProgress';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import AddIcon from '@mui/icons-material/Add';
import FlagIcon from '@mui/icons-material/Flag';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WeekHistory from './WeekHistory';
import LogWorkoutForm from './LogWorkoutForm';
import { tokens } from '../theme';
import { generateEncouragement } from '../lib/encouragement';
import { weekRangeLabel } from '../lib/weeks';

const GOAL_OPTIONS = [1, 2, 3, 4, 5, 6, 7];

/**
 * Streaks & Progress Tracking dashboard.
 *
 * A student can:
 *   - set a realistic weekly workout goal,
 *   - see completed workouts and progress toward the target,
 *   - log a workout (one per day, enforced by the database),
 *   - track progress across multiple weeks (history preserved),
 *   - and receive supportive feedback that never shames a missed day.
 */
export default function Streaks({ streaks, onLogWorkout }) {
  const { loading, error, currentWeek, history, streak, logWorkout, setWeeklyGoal } = streaks;
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [pendingGoal, setPendingGoal] = useState(currentWeek.target ?? 3);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [alreadyLogged, setAlreadyLogged] = useState(false);
  const [encouragement, setEncouragement] = useState('');
  const [justLogged, setJustLogged] = useState(false);

  const { target, completed, days, weekStart } = currentWeek;

  // Progress as a 0–100 percentage of the weekly target.
  const progressPct = useMemo(() => {
    if (!target) return 0;
    return Math.min(100, Math.round((completed / target) * 100));
  }, [completed, target]);

  const goalMet = target !== null && completed >= target;

  // Generate an encouraging message whenever the inputs change.
  useEffect(() => {
    setEncouragement(
      generateEncouragement({ target, completed, streak, justLogged })
    );
    if (justLogged) {
      const t = setTimeout(() => setJustLogged(false), 1500);
      return () => clearTimeout(t);
    }
  }, [target, completed, streak, justLogged]);

  const openGoalDialog = useCallback(() => {
    setPendingGoal(target ?? 3);
    setActionError('');
    setGoalDialogOpen(true);
  }, [target]);

  const handleSaveGoal = useCallback(async () => {
    setBusy(true);
    setActionError('');
    try {
      await setWeeklyGoal(pendingGoal);
      setGoalDialogOpen(false);
    } catch (err) {
      setActionError(err.message ?? 'Could not save your goal. Please try again.');
    } finally {
      setBusy(false);
    }
  }, [pendingGoal, setWeeklyGoal]);

  const handleLogSubmit = useCallback(async (entry) => {
    setBusy(true);
    setActionError('');
    setAlreadyLogged(false);
    try {
      const result = await logWorkout(entry);
      if (result.alreadyLogged) {
        setAlreadyLogged(true);
      } else {
        setJustLogged(true);
        setLogDialogOpen(false);
        onLogWorkout?.(result.workout);
      }
    } catch (err) {
      setActionError(err.message ?? 'Could not log your workout. Please try again.');
    } finally {
      setBusy(false);
    }
  }, [logWorkout, onLogWorkout]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ maxWidth: 640, mx: 'auto', px: 2, py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', px: 2, py: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h5" sx={{ fontSize: '1.2rem' }}>
          Streaks
        </Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => { setActionError(''); setAlreadyLogged(false); setLogDialogOpen(true); }}
          id="log-workout-button"
        >
          Log workout
        </Button>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Week of {weekRangeLabel(weekStart)}
      </Typography>

      {/* Goal + progress card */}
      <Card id="streaks-progress-card" sx={{ mb: 2 }}>
        <CardContent sx={{ py: 3, px: { xs: 2.5, sm: 3 } }}>
          {/* Target row */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FlagIcon sx={{ color: 'primary.light', fontSize: 20 }} />
              <Typography variant="body2" color="text.secondary">
                Weekly goal
              </Typography>
              {target ? (
                <Chip
                  label={`${target} workout${target === 1 ? '' : 's'}`}
                  size="small"
                  id="weekly-goal-chip"
                  sx={{
                    fontFamily: '"Space Grotesk", sans-serif',
                    fontWeight: 600,
                    backgroundColor: tokens.accentDim12,
                    color: tokens.violetBright,
                    border: `1px solid ${tokens.accentBorder40}`,
                  }}
                />
              ) : (
                <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                  Not set yet
                </Typography>
              )}
            </Box>
            <Button
              variant="outlined"
              size="small"
              onClick={openGoalDialog}
              id="set-goal-button"
              sx={{ fontSize: '0.72rem' }}
            >
              {target ? 'Change goal' : 'Set goal'}
            </Button>
          </Box>

          {/* Big completed / target readout */}
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1.5 }}>
            <Typography
              component="span"
              id="completed-count"
              sx={{
                fontFamily: '"Space Grotesk", sans-serif',
                fontSize: '3rem',
                fontWeight: 700,
                lineHeight: 1,
                color: goalMet ? tokens.violetBright : 'text.primary',
              }}
            >
              {completed}
            </Typography>
            <Typography component="span" variant="h6" sx={{ color: 'text.secondary', fontSize: '1.2rem' }}>
              / {target ?? '—'}
            </Typography>
            <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              workouts this week
            </Typography>
          </Box>

          {/* Progress bar */}
          <LinearProgress
            variant="determinate"
            value={progressPct}
            id="weekly-progress-bar"
            sx={{
              height: 10,
              borderRadius: 5,
              backgroundColor: tokens.accentDim12,
              '& .MuiLinearProgress-bar': {
                borderRadius: 5,
                background: `linear-gradient(90deg, ${tokens.violet} 0%, ${tokens.violetBright} 100%)`,
              },
            }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, fontSize: '0.78rem' }} id="progress-percent">
            {target ? `${progressPct}% of your weekly goal` : 'Set a goal to see your progress'}
          </Typography>

          {/* Goal-met badge */}
          {goalMet && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 1.5 }}>
              <CheckCircleIcon sx={{ color: '#4ADE80', fontSize: 18 }} />
              <Typography variant="body2" sx={{ color: '#4ADE80', fontWeight: 600 }}>
                Goal reached this week — great work!
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Streak + weekdays card */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ py: 3, px: { xs: 2.5, sm: 3 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <LocalFireDepartmentIcon sx={{ color: '#FB923C', fontSize: 22 }} />
            <Typography variant="h6" sx={{ fontSize: '0.85rem' }}>
              Day streak
            </Typography>
            <Typography
              variant="h6"
              id="streak-count"
              sx={{ ml: 'auto', fontFamily: '"Space Grotesk", sans-serif', fontSize: '1.4rem', color: streak > 0 ? '#FB923C' : 'text.secondary' }}
            >
              {streak}
            </Typography>
          </Box>

          {/* Weekday dots */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 0.5 }} id="weekday-track">
            {days.map((d) => (
              <Tooltip key={d.date} title={d.done ? `Workout logged — ${d.label}` : `${d.label} — no workout yet`} arrow>
                <Box
                  sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 0.5,
                  }}
                >
                  <Box
                    sx={{
                      width: { xs: 34, sm: 40 },
                      height: { xs: 34, sm: 40 },
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: `1.5px solid ${d.done ? tokens.violetBright : tokens.borderViolet}`,
                      backgroundColor: d.done ? tokens.accentDim15 : 'transparent',
                      transition: 'all 0.25s ease',
                    }}
                  >
                    {d.done && <CheckCircleIcon sx={{ color: tokens.violetBright, fontSize: 20 }} />}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>
                    {d.label}
                  </Typography>
                </Box>
              </Tooltip>
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* Encouragement message */}
      <Card id="encouragement-card" sx={{ mb: 3 }}>
        <CardContent sx={{ py: 2.5, px: { xs: 2.5, sm: 3 }, display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
          <AutoAwesomeIcon sx={{ color: 'primary.light', fontSize: 20, mt: 0.25, flexShrink: 0 }} />
          <Typography variant="body1" id="encouragement-message" sx={{ color: 'text.primary', lineHeight: 1.6 }}>
            {encouragement}
          </Typography>
        </CardContent>
      </Card>

      {/* Multi-week history (previous weeks preserved) */}
      <Typography variant="h6" sx={{ fontSize: '0.85rem', mb: 1.5 }}>
        Previous weeks
      </Typography>
      <WeekHistory history={history} />
      <input type="hidden" id="hidden-completed-count" value={completed} />
      <input type="hidden" id="hidden-weekly-target" value={target ?? ''} />

      {/* Goal dialog */}
      <Dialog
        open={goalDialogOpen}
        onClose={() => { setGoalDialogOpen(false); setActionError(''); }}
        maxWidth="xs"
        fullWidth
        id="goal-dialog"
      >
        <DialogTitle sx={{ fontFamily: '"Space Grotesk", sans-serif', textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: '1rem' }}>
          Set weekly goal
        </DialogTitle>
        <DialogContent sx={{ pb: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, mt: 0.5 }}>
            Pick a target that fits your schedule. You can change it any time — your past weeks stay as they were.
          </Typography>
          <ToggleButtonGroup
            value={pendingGoal}
            exclusive
            onChange={(_, v) => v && setPendingGoal(v)}
            fullWidth
            aria-label="Weekly goal"
            sx={{ flexWrap: 'wrap', gap: 0.5, mb: 2 }}
          >
            {GOAL_OPTIONS.map((n) => (
              <ToggleButton
                key={n}
                value={n}
                id={`goal-option-${n}`}
                sx={{
                  fontSize: '0.85rem',
                  fontFamily: '"Space Grotesk", sans-serif',
                  fontWeight: 600,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: '10px !important',
                  px: 1.5,
                  '&.Mui-selected': {
                    backgroundColor: tokens.accentDim15,
                    color: tokens.violetBright,
                    borderColor: tokens.accentBorder40,
                  },
                }}
              >
                {n}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          {actionError && <Alert severity="error" sx={{ mb: 2, fontSize: '0.85rem' }}>{actionError}</Alert>}
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              variant="contained"
              size="large"
              fullWidth
              disabled={busy}
              onClick={handleSaveGoal}
              id="save-goal-button"
            >
              {busy ? 'Saving…' : 'Save goal'}
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => { setGoalDialogOpen(false); setActionError(''); }}
              id="cancel-goal-button"
            >
              Cancel
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Log workout dialog */}
      <Dialog
        open={logDialogOpen}
        onClose={() => { setLogDialogOpen(false); setActionError(''); setAlreadyLogged(false); }}
        maxWidth="xs"
        fullWidth
        id="log-workout-dialog"
      >
        <DialogTitle sx={{ fontFamily: '"Space Grotesk", sans-serif', textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: '1rem' }}>
          Log a workout
        </DialogTitle>
        <DialogContent sx={{ pb: 3 }}>
          {alreadyLogged && (
            <Alert severity="info" sx={{ mb: 2, fontSize: '0.85rem' }} id="already-logged-alert">
              You've already logged a workout for that day — and that's okay! One per day keeps your streak honest.
            </Alert>
          )}
          {actionError && <Alert severity="error" sx={{ mb: 2, fontSize: '0.85rem' }}>{actionError}</Alert>}
          <LogWorkoutForm
            onSubmit={handleLogSubmit}
            onCancel={() => { setLogDialogOpen(false); setActionError(''); setAlreadyLogged(false); }}
            busy={busy}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
}
