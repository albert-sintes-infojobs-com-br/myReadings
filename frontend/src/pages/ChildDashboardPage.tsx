import { useQuery } from '@tanstack/react-query';
import { Alert, Stack, Typography } from '@mui/material';
import AppLayout from '../components/layout/AppLayout';
import ChildStatsPanel from '../components/stats/ChildStatsPanel';
import { useAuth } from '../auth/AuthContext';
import { getMyStats } from '../api/stats.api';

export default function ChildDashboardPage() {
  const { user } = useAuth();
  const statsQuery = useQuery({ queryKey: ['stats', 'me'], queryFn: getMyStats });

  return (
    <AppLayout>
      <Stack spacing={2}>
        <Typography variant="h5">¡Hola, {user?.name}!</Typography>
        {statsQuery.isLoading && <Typography>Cargando estadísticas…</Typography>}
        {statsQuery.isError && <Alert severity="error">No se pudieron cargar las estadísticas.</Alert>}
        {statsQuery.data && <ChildStatsPanel stats={statsQuery.data} />}
      </Stack>
    </AppLayout>
  );
}
