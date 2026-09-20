import { Box, Card, CardContent, Grid, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ChildStats } from '../../types/stats';

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h5">{value}</Typography>
      </CardContent>
    </Card>
  );
}

/** Panel de estadísticas de un hijo: reusado por el dashboard de hijo y el del padre (por cada hijo). */
export default function ChildStatsPanel({ stats }: { stats: ChildStats }) {
  const booksData = [
    { name: 'Sin empezar', cantidad: stats.booksByStatus.NOT_STARTED },
    { name: 'Leyendo', cantidad: stats.booksByStatus.READING },
    { name: 'Terminados', cantidad: stats.booksByStatus.FINISHED },
  ];
  const rewardsData = [
    { name: 'Pendientes', cantidad: stats.rewardsByStatus.PENDING },
    { name: 'Cumplidas', cantidad: stats.rewardsByStatus.FULFILLED },
    { name: 'Penalizadas', cantidad: stats.rewardsByStatus.PENALIZED },
  ];

  return (
    <Stack spacing={2}>
      <Grid container spacing={2}>
        <Grid item xs={6} sm={3}>
          <Kpi label="Puntos" value={String(stats.balance.points)} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <Kpi label="Euros" value={`${stats.balance.money.toFixed(2)} €`} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <Kpi
            label="Tiempo medio de lectura"
            value={stats.avgReadingDays !== null ? `${stats.avgReadingDays.toFixed(1)} días` : '—'}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <Kpi label="Libros terminados" value={String(stats.booksByStatus.FINISHED)} />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: 260 }}>
            <Typography variant="subtitle1" gutterBottom>
              Libros por estado
            </Typography>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={booksData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="cantidad" fill="#3f51b5" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: 260 }}>
            <Typography variant="subtitle1" gutterBottom>
              Recompensas por estado
            </Typography>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={rewardsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="cantidad" fill="#f50057" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Progreso de metas
        </Typography>
        {stats.goalsProgress.length === 0 && (
          <Typography color="text.secondary">Sin metas activas.</Typography>
        )}
        <Stack spacing={2}>
          {stats.goalsProgress.map((goal) => (
            <Box key={goal.goalId}>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2">{goal.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {goal.pointsAccumulated} / {goal.targetPoints} pts
                </Typography>
              </Box>
              <LinearProgress variant="determinate" value={goal.progressPct} sx={{ height: 8, borderRadius: 4 }} />
            </Box>
          ))}
        </Stack>
      </Paper>
    </Stack>
  );
}
