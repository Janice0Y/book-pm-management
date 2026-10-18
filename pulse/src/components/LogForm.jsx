import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Chip from '@mui/material/Chip';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import BedtimeIcon from '@mui/icons-material/Bedtime';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import CheckIcon from '@mui/icons-material/Check';
import { tokens } from '../theme';

const TYPES = [
  { value: 'food', label: 'Food', icon: <RestaurantIcon />, unit: 'kcal', placeholder: 'e.g. 450' },
  { value: 'steps', label: 'Steps', icon: <DirectionsWalkIcon />, unit: 'steps', placeholder: 'e.g. 8000' },
  { value: 'water', label: 'Water', icon: <WaterDropIcon />, unit: 'ml', placeholder: 'e.g. 250' },
  { value: 'sleep', label: 'Sleep', icon: <BedtimeIcon />, unit: 'hours', placeholder: 'e.g. 7.5' },
];

const WATER_PRESETS = [250, 350, 500, 750];

/**
 * Form to add or edit a health entry.
 * Props:
 *   onSubmit    – called with the entry data ({ type, value, unit, note, timestamp })
 *   editEntry   – if provided, the form pre-fills for editing
 *   onCancel    – called when editing is cancelled
 */
export default function LogForm({ onSubmit, editEntry = null, onCancel, isWorkout = false }) {
  const [type, setType] = useState(isWorkout ? 'workout' : 'food');
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  const [datetime, setDatetime] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Pre-fill for editing
  useEffect(() => {
    if (editEntry) {
      setType(editEntry.type);
      setValue(editEntry.value != null ? String(editEntry.value) : (editEntry.duration != null ? String(editEntry.duration) : ''));
      setNote(editEntry.note || '');
      // Convert ISO to datetime-local format
      const d = new Date(editEntry.timestamp);
      const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setDatetime(local);
    } else {
      resetForm();
    }
  }, [editEntry]);

  function resetForm() {
    setValue('');
    setNote('');
    setSubmitted(false);
    if (isWorkout) setType('workout');
    // Default datetime to now in local timezone
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setDatetime(local);
  }

  // Reset datetime on mount
  useEffect(() => {
    if (!editEntry) resetForm();
  }, []);

  const currentType = TYPES.find((t) => t.value === type);

  function handleSubmit(e) {
    e.preventDefault();
    if (isWorkout) {
      const numDuration = value ? parseFloat(value) : null;
      const entry = {
        type: 'workout',
        duration: numDuration,
        note: note.trim(),
        timestamp: new Date(datetime).toISOString(),
      };
      if (editEntry) entry.id = editEntry.id;
      onSubmit(entry);
      setSubmitted(true);
      setTimeout(() => { resetForm(); }, 1200);
      return;
    }
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) return;

    const entry = {
      type,
      value: numValue,
      unit: currentType.unit,
      note: note.trim(),
      timestamp: new Date(datetime).toISOString(),
    };

    if (editEntry) {
      entry.id = editEntry.id;
    }

    onSubmit(entry);
    setSubmitted(true);

    // Show success briefly, then reset
    setTimeout(() => {
      resetForm();
      setType('food');
    }, 1200);
  }

  function handleWaterPreset(amount) {
    setType('water');
    setValue(String(amount));
  }

  return (
    <Box sx={{ maxWidth: 520, mx: 'auto', px: 2, py: 3 }}>
      <Typography variant="h5" sx={{ mb: 3, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: 1 }}>
        {isWorkout ? <FitnessCenterIcon sx={{ color: 'primary.light' }} /> : null}
        {editEntry ? 'Edit Entry' : isWorkout ? 'Log Workout' : 'Log Entry'}
      </Typography>

      <Card>
        <CardContent component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {!isWorkout && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Type
            </Typography>
            <ToggleButtonGroup
              value={type}
              exclusive
              onChange={(_, v) => v && setType(v)}
              fullWidth
              size="small"
              aria-label="Entry type"
            >
              {TYPES.map((t) => (
                <ToggleButton
                  key={t.value}
                  value={t.value}
                  id={`log-type-${t.value}`}
                  sx={{
                    gap: 0.5,
                    textTransform: 'uppercase',
                    fontSize: '0.75rem',
                    letterSpacing: '0.08em',
                    fontFamily: '"Space Grotesk", sans-serif',
                    '&.Mui-selected': {
                      backgroundColor: tokens.accentDim15,
                      color: tokens.violetBright,
                      borderColor: tokens.accentBorder40,
                    },
                  }}
                >
                  {t.icon}
                  {t.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
          )}

          {/* Water quick presets */}
          {!isWorkout && type === 'water' && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Quick presets
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {WATER_PRESETS.map((amount) => (
                  <Chip
                    key={amount}
                    label={`${amount} ml`}
                    onClick={() => handleWaterPreset(amount)}
                    variant={value === String(amount) ? 'filled' : 'outlined'}
                    color="primary"
                    sx={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600 }}
                    id={`water-preset-${amount}`}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Value input */}
          <TextField
            label={isWorkout ? 'Duration in minutes (optional)' : `Value (${currentType.unit})`}
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={isWorkout ? 'e.g. 30' : currentType.placeholder}
            required={!isWorkout}
            fullWidth
            inputProps={{ min: 0, step: isWorkout ? 5 : (type === 'sleep' ? 0.1 : 1) }}
            id="log-value-input"
          />

          {/* Note input (most useful for food) */}
          <TextField
            label={isWorkout ? 'What did you do? (optional)' : 'Note (optional)'}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={isWorkout ? 'e.g. Run, weights, yoga' : (type === 'food' ? 'e.g. Grilled chicken salad' : 'Optional note')}
            fullWidth
            id="log-note-input"
          />

          {/* Date/time picker */}
          <TextField
            label="Date & time"
            type="datetime-local"
            value={datetime}
            onChange={(e) => setDatetime(e.target.value)}
            fullWidth
            id="log-datetime-input"
            slotProps={{
              inputLabel: { shrink: true },
            }}
          />

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 1.5, mt: 1 }}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={submitted}
              startIcon={submitted ? <CheckIcon /> : null}
              id="log-submit-button"
            >
              {submitted ? 'Logged!' : editEntry ? 'Save changes' : isWorkout ? 'Log workout' : 'Log entry'}
            </Button>
            {(editEntry || isWorkout) && onCancel && (
              <Button
                variant="outlined"
                size="large"
                onClick={onCancel}
                id="log-cancel-button"
              >
                Cancel
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
