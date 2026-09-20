import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AppLayout from '../components/layout/AppLayout';
import ChildStatsPanel from '../components/stats/ChildStatsPanel';
import { useAuth } from '../auth/AuthContext';
import { listChildren } from '../api/children.api';
import { getOverviewStats } from '../api/stats.api';

export default function ParentDashboardPage() {
  const { user } = useAuth();
  const [childId, setChildId] = useState<number | ''>('');

  const childrenQuery = useQuery({ queryKey: ['children'], queryFn: listChildren });
  const overviewQuery = useQuery({
    queryKey: ['stats', 'overview', childId],
    queryFn: () => getOverviewStats(childId === '' ? undefined : childId),
  });

  const children = childrenQuery.data ?? [];
  const overview = overviewQuery.data;

  return (
    <AppLayout>
      <Stack spacing={2}>
        <Typography variant="h5">Hola, {user?.name}</Typography>
        <TextField
          select
          label="Hijo/a"
          value={childId}
          onChange={(e) => setChildId(e.target.value ? Number(e.target.value) : '')}
          sx={{ width: 260 }}
          size="small"
        >
          <MenuItem value="">Todos</MenuItem>
          {children.map((child) => (
            <MenuItem key={child.id} value={child.id}>
              {child.name}
            </MenuItem>
          ))}
        </TextField>

        {overviewQuery.isLoading && <Typography>Cargando estadísticas…</Typography>}
        {overviewQuery.isError && <Alert severity="error">No se pudieron cargar las estadísticas.</Alert>}

        {overview?.ranking && (
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Ranking entre hijos
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Hijo/a</TableCell>
                  <TableCell align="right">Libros terminados</TableCell>
                  <TableCell align="right">Puntos</TableCell>
                  <TableCell align="right">Euros</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {overview.ranking.map((entry) => (
                  <TableRow key={entry.childId}>
                    <TableCell>{entry.name}</TableCell>
                    <TableCell align="right">{entry.finishedBooks}</TableCell>
                    <TableCell align="right">{entry.balance.points}</TableCell>
                    <TableCell align="right">{entry.balance.money.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        )}

        {overview?.perChild.map((childStats) => (
          <Stack key={childStats.childId} spacing={1}>
            {childId === '' && <Typography variant="h6">{childStats.name}</Typography>}
            <ChildStatsPanel stats={childStats} />
          </Stack>
        ))}
        {overview && overview.perChild.length === 0 && (
          <Alert severity="info">Todavía no tienes hijos vinculados.</Alert>
        )}
      </Stack>
    </AppLayout>
  );
}
