import React from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import Chip from '@mui/material/Chip';
import { tokens } from '../theme';

/**
 * Read-only list of past weeks (oldest first). Each row shows the week range,
 * the goal the student set that week (if any), and completed-vs-target
 * progress. Previous weeks are never modified when a new week starts or a goal
 * changes — they are preserved exactly as they were logged (test state #4).
 */
export default function WeekHistory({ history }) {
  if (!history || history.length === 0) {
    return (
      <Card id="week-history-empty">
        <CardContent sx={{ py: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Your past weeks will appear here once you've tracked more than one week.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box id="week-history" sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {history.map((week) => {
        const pct = week.target ? Math.min(100, Math.round((week.completed / week.target) * 100)) : 0;
        const met = week.target !== null && week.completed >= week.target;
        return (
          <Card key={week.weekStart} id={`week-row-${week.weekStart}`}>
            <CardContent sx={{ py: 2, px: { xs: 2.5, sm: 3 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                  {week.range}
                </Typography>
                {met && (
                  <Chip
                    label="Goal met"
                    size="small"
                    sx={{
                      fontSize: '0.68rem',
                      height: 20,
                      backgroundColor: 'rgba(74,222,128,0.12)',
                      color: '#4ADE80',
                      border: '1px solid rgba(74,222,128,0.30)',
                    }}
                  />
                )}
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, mb: 1 }}>
                <Typography component="span" sx={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: '1.5rem', fontWeight: 700 }}>
                  {week.completed}
                </Typography>
                <Typography component="span" variant="body2" color="text.secondary">
                  / {week.target ?? '—'} workouts
                </Typography>
              </Box>

              {week.target && (
                <LinearProgress
                  variant="determinate"
                  value={pct}
                  sx={{
                    height: 7,
                    borderRadius: 4,
                    backgroundColor: tokens.accentDim12,
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 4,
                      background: met
                        ? 'linear-gradient(90deg, #22C55E 0%, #4ADE80 100%)'
                        : `linear-gradient(90deg, ${tokens.violet} 0%, ${tokens.violetBright} 100%)`,
                    },
                  }}
                />
              )}
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
}
