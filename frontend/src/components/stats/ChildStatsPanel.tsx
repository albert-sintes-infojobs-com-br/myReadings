import { useQuery } from '@tanstack/react-query';
import { Badge, Box, Card, CardContent, Grid, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import PaidIcon from '@mui/icons-material/Paid';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ChildStats } from '../../types/stats';
import type { BookStatus } from '../../types/book';
import { listBooks, listChildBooks } from '../../api/books.api';
import { listRewards } from '../../api/rewards.api';

const BOOK_STATUS_COLOR: Record<BookStatus, string> = {
  NOT_STARTED: '#94a3b8',
  READING: '#2563eb',
  FINISHED: '#0d9488',
};
const BOOK_STATUS_LABEL: Record<BookStatus, string> = {
  NOT_STARTED: 'Sin empezar',
  READING: 'Leyendo',
  FINISHED: 'Terminado',
};

function BookStatusLegend() {
  return (
    <Stack direction="row" spacing={2}>
      {(Object.keys(BOOK_STATUS_LABEL) as BookStatus[]).map((status) => (
        <Stack key={status} direction="row" spacing={0.5} alignItems="center">
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: BOOK_STATUS_COLOR[status] }} />
          <Typography variant="caption" color="text.secondary">
            {BOOK_STATUS_LABEL[status]}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}

/** Misma paleta pastel usada en las tarjetas de funcionalidades de la landing. */
function Kpi({
  label,
  value,
  Icon,
  color,
  bg,
}: {
  label: string;
  value: string;
  Icon: SvgIconComponent;
  color: string;
  bg: string;
}) {
  return (
    <Card variant="outlined" sx={{ bgcolor: bg, borderColor: 'transparent', position: 'relative' }}>
      <CardContent>
        <Icon sx={{ position: 'absolute', top: 12, right: 12, color, fontSize: 26 }} />
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
  const bookById = new Map((booksQuery.data ?? []).map((b) => [b.id, { title: b.title, status: b.status }]));
  const booksByGoalId = new Map<number, { bookId: number; title: string; value: number; status: BookStatus }[]>();
  for (const reward of rewardsQuery.data ?? []) {
    if (reward.goalId == null) continue;
    const book = bookById.get(reward.bookId);
    if (!book) continue;
    const list = booksByGoalId.get(reward.goalId) ?? [];
    list.push({ bookId: reward.bookId, title: book.title, value: reward.value, status: book.status });
    booksByGoalId.set(reward.goalId, list);
  }

  return (
    <Stack spacing={2}>
      <Grid container spacing={2}>
        <Grid item xs={6} sm={3}>
          <Kpi label="Puntos" value={String(stats.balance.points)} Icon={EmojiEventsIcon} color="#d97706" bg="#fef3c7" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <Kpi label="Euros" value={`${stats.balance.money.toFixed(2)} €`} Icon={PaidIcon} color="#0d9488" bg="#ccfbf1" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <Kpi
            label="Tiempo medio de lectura"
            value={stats.avgReadingDays !== null ? `${stats.avgReadingDays.toFixed(1)} días` : '—'}
            Icon={AccessTimeIcon}
            color="#2563eb"
            bg="#dbeafe"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <Kpi
            label="Libros terminados"
            value={String(stats.booksByStatus.FINISHED)}
            Icon={AutoStoriesIcon}
            color="#7c3aed"
            bg="#ede9fe"
          />
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
                <Bar dataKey="cantidad" fill="#7c3aed" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      <Box sx={{ pl: '33px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', rowGap: 1 }}>
        <Typography variant="subtitle1">Progreso de metas</Typography>
        <BookStatusLegend />
      </Box>
      {stats.goalsProgress.length === 0 && (
        <Typography color="text.secondary" sx={{ pl: '33px' }}>
          Sin metas activas.
        </Typography>
      )}
      {stats.goalsProgress.length > 0 && (
        <Grid container spacing={2}>
          {stats.goalsProgress.map((goal, index) => (
            <Grid item xs={12} sm={6} md={4} key={goal.goalId}>
              <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Badge
                      badgeContent={index + 1}
                      color="warning"
                      sx={{ '& .MuiBadge-badge': { right: 2, top: 2 } }}
                    >
                      <EmojiEventsIcon sx={{ color: '#d97706' }} />
                    </Badge>
                    <Typography variant="body2" fontWeight="bold">
                      {goal.name}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {Math.round(goal.progressPct)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={goal.progressPct}
                  sx={{ height: 8, borderRadius: 4, my: 1 }}
                />
                <Typography variant="caption" color="text.secondary">
                  {goal.pointsAccumulated} / {goal.targetPoints} pts
                </Typography>
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 1 }}>
                  <AutoStoriesIcon sx={{ fontSize: 18, color: '#7c3aed' }} />
                  <Typography variant="caption" color="text.secondary">
                    {(booksByGoalId.get(goal.goalId) ?? []).length}{' '}
                    {(booksByGoalId.get(goal.goalId) ?? []).length === 1 ? 'libro' : 'libros'}
                  </Typography>
                </Stack>
                <Stack direction="column" spacing={1} sx={{ mt: 0.5 }}>
                  {(booksByGoalId.get(goal.goalId) ?? []).map((book) => {
                    const pct = goal.targetPoints > 0 ? Math.min(100, (book.value / goal.targetPoints) * 100) : 0;
                    return (
                      <Box key={book.bookId}>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="caption" color="text.secondary">
                            {book.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {Math.round(pct)}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          sx={{
                            height: 6,
                            borderRadius: 3,
                            mt: 0.5,
                            bgcolor: '#e2e8f0',
                            '& .MuiLinearProgress-bar': { bgcolor: BOOK_STATUS_COLOR[book.status] },
                          }}
                        />
                      </Box>
                    );
                  })}
                  {(booksByGoalId.get(goal.goalId) ?? []).length === 0 && (
                    <Typography variant="caption" color="text.secondary">
                      Sin libros asociados todavía.
                    </Typography>
                  )}
                </Stack>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
    </Stack>
  );
}
