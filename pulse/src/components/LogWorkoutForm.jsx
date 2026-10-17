import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { tokens } from '../theme';
import { localDateStr } from '../lib/weeks';

const ACTIVITIES = [
  { value: 'Run', emoji: '🏃' },
  { value: 'Walk', emoji: '🚶' },
  { value: 'Strength', emoji: '🏋️' },
  { value: 'Cycle', emoji: '🚴' },
  { value: 'Yoga', emoji: '🧘' },
  { value: 'Swim', emoji: '🏊' },
  { value: 'Team sport', emoji: '⚽' },
  { value: 'Other', emoji: '💪' },
];

/**
 * Inline form (rendered inside a Dialog) for logging a single workout.
 * The date defaults to today and the student picks an activity + optional
 * duration and note. The database enforces one workout per calendar day.
 */
export default function LogWorkoutForm({ onSubmit, onCancel, busy, defaultDate }) {
  const [date, setDate] = useState(defaultDate || localDateStr());
  const [activity, setActivity] = useState('Run');
  const [duration, setDuration] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (defaultDate) setDate(defaultDate);
  }, [defaultDate]);

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({
      date,
      activity,
      durationMin: duration ? parseInt(duration, 10) : null,
      note: note.trim(),
    });
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
      {/* Activity picker */}
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Activity
        </Typography>
        <ToggleButtonGroup
          value={activity}
          exclusive
          onChange={(_, v) => v && setActivity(v)}
          fullWidth
          size="small"
          aria-label="Workout activity"
          sx={{ flexWrap: 'wrap', gap: 0.5 }}
        >
          {ACTIVITIES.map((a) => (
            <ToggleButton
              key={a.value}
              value={a.value}
              id={`activity-${a.value.toLowerCase().replace(/\s+/g, '-')}`}
              sx={{
                gap: 0.5,
                fontSize: '0.72rem',
                textTransform: 'none',
                fontFamily: '"Inter", sans-serif',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '10px !important',
                px: 1.25,
                '&.Mui-selected': {
                  backgroundColor: tokens.accentDim15,
                  color: tokens.violetBright,
                  borderColor: tokens.accentBorder40,
                },
              }}
            >
              <span style={{ fontSize: '0.95rem' }}>{a.emoji}</span>
              {a.value}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      <TextField
        label="Date"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        fullWidth
        required
        slotProps={{ inputLabel: { shrink: true } }}
        id="log-workout-date"
      />

      <TextField
        label="Duration (minutes, optional)"
        type="number"
        value={duration}
        onChange={(e) => setDuration(e.target.value)}
        fullWidth
        inputProps={{ min: 1, max: 600 }}
        id="log-workout-duration"
      />

      <TextField
        label="Note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        fullWidth
        id="log-workout-note"
      />

      <Box sx={{ display: 'flex', gap: 1.5, mt: 0.5 }}>
        <Button
          type="submit"
          variant="contained"
          size="large"
          fullWidth
          disabled={busy}
          id="log-workout-submit"
        >
          {busy ? 'Logging…' : 'Log workout'}
        </Button>
        <Button
          variant="outlined"
          size="large"
          onClick={onCancel}
          id="log-workout-cancel"
        >
          Cancel
        </Button>
      </Box>
    </Box>
  );
}
