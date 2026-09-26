import { useQuery } from '@tanstack/react-query';
import { Box, Card, CardContent, Chip, Grid, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ChildStats } from '../../types/stats';
import { listBooks, listChildBooks } from '../../api/books.api';
import { listRewards } from '../../api/rewards.api';

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

/** Panel de estadísticas de un hijo: reusado por el dashboard de hijo y el del padre (por cada hijo).
 * `childId` solo se indica cuando lo renderiza el PADRE (para resolver los libros de ESE hijo); el
 * hijo viendo su propio panel no lo necesita (sus libros ya están acotados por el token).
 */
export default function ChildStatsPanel({ stats, childId }: { stats: ChildStats; childId?: number }) {
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

  const rewardsQuery = useQuery({ queryKey: ['rewards', 'stats-panel'], queryFn: listRewards });
  const booksQuery = useQuery({
    queryKey: childId ? ['books', 'child', childId] : ['books'],
    queryFn: () => (childId ? listChildBooks(childId) : listBooks()),
  });
  const bookTitleById = new Map((booksQuery.data ?? []).map((b) => [b.id, b.title]));
  const booksByGoalId = new Map<number, string[]>();
  for (const reward of rewardsQuery.data ?? []) {
    if (reward.goalId == null) continue;
    const title = bookTitleById.get(reward.bookId);
    if (!title) continue;
    const list = booksByGoalId.get(reward.goalId) ?? [];
    list.push(title);
    booksByGoalId.set(reward.goalId, list);
  }

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
            <Paper key={goal.goalId} variant="outlined" sx={{ p: 2 }}>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" fontWeight="bold">
                  {goal.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {goal.pointsAccumulated} / {goal.targetPoints} pts
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={goal.progressPct}
                sx={{ height: 8, borderRadius: 4, my: 1 }}
              />
              <Stack direction="row" spacing={1} flexWrap="wrap" rowGap={1}>
                {(booksByGoalId.get(goal.goalId) ?? []).map((title) => (
                  <Chip key={title} size="small" label={title} />
                ))}
                {(booksByGoalId.get(goal.goalId) ?? []).length === 0 && (
                  <Typography variant="caption" color="text.secondary">
                    Sin libros asociados todavía.
                  </Typography>
                )}
              </Stack>
            </Paper>
          ))}
        </Stack>
      </Paper>
    </Stack>
  );
}
