import React, { useState, useEffect, useMemo } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Fade from '@mui/material/Fade';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { tokens } from '../theme';

const ACTIVITIES = [
  'Run', 'Walk', 'Weights', 'Yoga', 'Cycling', 'Swim', 'HIIT', 'Stretch', 'Sport', 'Other',
];

function todayLocalDate() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function nowLocalTime() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(11, 16);
}

/**
 * Compact modal for logging a workout directly from the Progress tab.
 * Reuses the parent's addWorkout handler so persistence and streak
 * recalculation stay centralized in useWorkouts.
 */
export default function LogWorkoutModal({ open, goal, currentCompleted, onAddWorkout, onClose }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const [date, setDate] = useState(todayLocalDate());
  const [time, setTime] = useState(nowLocalTime());
  const [activity, setActivity] = useState('Run');
  const [duration, setDuration] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [phase, setPhase] = useState('form'); // 'form' | 'success'
  const [goalJustMet, setGoalJustMet] = useState(false);

  useEffect(() => {
    if (open) {
      setDate(todayLocalDate());
      setTime(nowLocalTime());
      setActivity('Run');
      setDuration('');
      setNote('');
      setError('');
      setPhase('form');
      setGoalJustMet(false);
    }
  }, [open]);

  const todayStr = todayLocalDate();

  const successMessage = useMemo(() => {
    if (goalJustMet) return `Weekly goal achieved! Your streak has been updated.`;
    const remaining = Math.max(0, goal - currentCompleted);
    if (remaining > 0) {
      return `Workout logged successfully! ${remaining} more to earn this week's streak.`;
    }
    return 'Workout logged successfully!';
  }, [goalJustMet, goal, currentCompleted]);

  function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!date) {
      setError('Please choose a date.');
      return;
    }
    if (date > todayStr) {
      setError('You can\u2019t log a workout for a future date.');
      return;
    }
    const iso = new Date(`${date}T${time || '12:00'}`).toISOString();
    if (isNaN(new Date(iso).getTime())) {
      setError('That date and time don\u2019t look right.');
      return;
    }
    const numDuration = duration ? parseFloat(duration) : null;
    if (duration && (isNaN(numDuration) || numDuration <= 0)) {
      setError('Duration must be a positive number of minutes.');
      return;
    }
    if (numDuration != null && numDuration > 600) {
      setError('Duration seems too high — please check the value.');
      return;
    }

    const finalNote = note.trim() || activity;
    onAddWorkout({
      type: 'workout',
      duration: numDuration,
      note: finalNote,
      timestamp: iso,
    });

    // Determine whether this workout just completed the weekly goal. We
    // approximate "new day" by comparing the chosen date against today's
    // distinct-day set; the parent recomputes authoritatively afterwards.
    const isNewDay = date !== todayLocalDate() || currentCompleted === 0;
    // currentCompleted counts distinct days in the current week before this
    // save. If the backdated workout falls in the current week and lands on a
    // day not yet counted, it adds one.
    const projected = currentCompleted + (isNewDay ? 1 : 0);
    setGoalJustMet(projected >= goal && currentCompleted < goal);
    setPhase('success');
  }

  function handleClose() {
    if (phase === 'success') {
      // Auto-close after showing confirmation is handled by timer; allow manual close too
    }
    onClose();
  }

  // Auto-close shortly after success
  useEffect(() => {
    if (phase === 'success') {
      const t = setTimeout(() => onClose(), 1600);
      return () => clearTimeout(t);
    }
  }, [phase, onClose]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      fullScreen={fullScreen}
      id="log-workout-modal"
      PaperProps={{ sx: { borderRadius: fullScreen ? 0 : 2 } }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          fontFamily: '"Space Grotesk", sans-serif',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          fontSize: '0.95rem',
          pb: 1,
        }}
      >
        <FitnessCenterIcon sx={{ color: 'primary.light', fontSize: 20 }} />
        Log Workout
      </DialogTitle>

      <DialogContent sx={{ pb: 3 }}>
        {phase === 'success' ? (
          <Fade in timeout={250}>
            <Box sx={{ textAlign: 'center', py: 4, px: 1 }}>
              {goalJustMet ? (
                <EmojiEventsIcon sx={{ fontSize: 56, color: '#4ADE80', mb: 1.5 }} />
              ) : (
                <CheckCircleIcon sx={{ fontSize: 56, color: 'primary.light', mb: 1.5 }} />
              )}
              <Typography
                variant="h6"
                sx={{
                  fontFamily: '"Space Grotesk", sans-serif',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  mb: 0.5,
                  color: goalJustMet ? '#4ADE80' : 'text.primary',
                }}
              >
                {goalJustMet ? 'Weekly goal achieved!' : 'Workout logged successfully!'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {goalJustMet ? 'Your streak has been updated.' : successMessage.replace('Workout logged successfully! ', '')}
              </Typography>
            </Box>
          </Fade>
        ) : (
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              {ACTIVITIES.slice(0, 8).map((a) => (
                <Chip
                  key={a}
                  label={a}
                  size="small"
                  onClick={() => setActivity(a)}
                  variant={activity === a ? 'filled' : 'outlined'}
                  color="primary"
                  sx={{
                    fontFamily: '"Space Grotesk", sans-serif',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                  }}
                  id={`log-activity-${a.toLowerCase()}`}
                />
              ))}
            </Box>

            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <TextField
                label="Date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                fullWidth
                inputProps={{ max: todayStr }}
                slotProps={{ inputLabel: { shrink: true } }}
                id="log-date-input"
                error={!!error && error.toLowerCase().includes('date')}
              />
              <TextField
                label="Time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                sx={{ width: 130, flexShrink: 0 }}
                slotProps={{ inputLabel: { shrink: true } }}
                id="log-time-input"
              />
            </Box>

            <TextField
              label="Duration in minutes (optional)"
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g. 30"
              fullWidth
              inputProps={{ min: 1, max: 600, step: 5 }}
              id="log-duration-input"
            />

            <TextField
              label="Notes (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={`Defaults to "${activity}"`}
              fullWidth
              id="log-note-input-modal"
            />

            {error && (
              <Typography color="error" variant="body2" id="log-error" sx={{ fontSize: '0.8rem' }}>
                {error}
              </Typography>
            )}

            <Box sx={{ display: 'flex', gap: 1.5, mt: 0.5 }}>
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                startIcon={<FitnessCenterIcon />}
                id="log-save-button"
              >
                Save Workout
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={handleClose}
                id="log-cancel-modal"
              >
                Cancel
              </Button>
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
