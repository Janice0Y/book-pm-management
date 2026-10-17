import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import { tokens } from '../theme';
import brand from '../brand';
import { useAuth } from '../hooks/useAuth';

/**
 * Sign-in / sign-up screen for the Streaks feature. A student must have an
 * account before they can set a weekly goal or log a workout — that is what
 * guarantees they only ever see their own data (privacy test state #6).
 */
export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password);
      } else {
        const { data } = await signUp(email.trim(), password);
        // Email confirmation is OFF, so a session is returned immediately.
        // If for some reason it isn't, flip to sign-in so they can log in.
        if (!data?.session) {
          setMode('signin');
          setError('Account created — sign in to continue.');
        }
      }
    } catch (err) {
      setError(friendlyError(err, mode));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 64px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        py: 4,
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 420 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <FitnessCenterIcon sx={{ fontSize: 40, color: 'primary.light', mb: 1 }} />
          <Typography variant="h5" sx={{ fontSize: '1.3rem', mb: 0.5 }}>
            {brand.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track your workouts, build a streak, and keep your momentum going.
          </Typography>
        </Box>

        <Card id="auth-card">
          <CardContent sx={{ p: 3 }}>
            <ToggleButtonGroup
              value={mode}
              exclusive
              onChange={(_, v) => { if (v) { setMode(v); setError(''); } }}
              fullWidth
              size="small"
              aria-label="Auth mode"
              sx={{ mb: 2.5 }}
            >
              <ToggleButton
                value="signin"
                id="auth-mode-signin"
                sx={{
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
                Sign in
              </ToggleButton>
              <ToggleButton
                value="signup"
                id="auth-mode-signup"
                sx={{
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
                Create account
              </ToggleButton>
            </ToggleButtonGroup>

            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                fullWidth
                autoComplete="email"
                id="auth-email"
              />
              <TextField
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                fullWidth
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                inputProps={{ minLength: 6 }}
                id="auth-password"
                slotProps={{
                  inputLabel: { shrink: true },
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          onClick={() => setShowPassword((s) => !s)}
                          edge="end"
                          size="small"
                          sx={{ color: 'text.secondary' }}
                        >
                          {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />

              {error && (
                <Alert severity={error.includes('sign in') ? 'info' : 'error'} id="auth-error" sx={{ fontSize: '0.85rem' }}>
                  {error}
                </Alert>
              )}

              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={busy}
                id="auth-submit"
              >
                {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
              </Button>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center', fontSize: '0.78rem' }}>
              {mode === 'signin'
                ? "Don't have an account? Switch to Create account above."
                : 'Already have an account? Switch to Sign in above.'}
            </Typography>
          </CardContent>
        </Card>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center', fontSize: '0.75rem' }}>
          Your workout history is private to your account.
        </Typography>
      </Box>
    </Box>
  );
}

function friendlyError(err, mode) {
  const msg = err?.message ?? 'Something went wrong. Please try again.';
  if (mode === 'signup') {
    if (/already registered|user already/i.test(msg)) return 'That email is already registered. Try signing in instead.';
  }
  if (mode === 'signin') {
    if (/invalid login credentials|invalid credentials/i.test(msg)) return 'That email and password do not match. Please try again.';
  }
  return msg;
}
