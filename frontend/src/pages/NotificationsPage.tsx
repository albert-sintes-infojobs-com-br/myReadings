import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import AppLayout from '../components/layout/AppLayout';
import { DeleteButton } from '../components/common/RowActionButtons';
import {
  hideNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationDto,
} from '../api/notifications.api';

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const listQuery = useQuery({ queryKey: ['notifications', 'list'], queryFn: () => listNotifications() });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }

  const markReadMutation = useMutation({ mutationFn: markNotificationRead, onSuccess: invalidate });
  const markAllReadMutation = useMutation({ mutationFn: markAllNotificationsRead, onSuccess: invalidate });
  const hideMutation = useMutation({ mutationFn: hideNotification, onSuccess: invalidate });

  const notifications = listQuery.data ?? [];

  function handleClick(n: NotificationDto) {
    if (!n.read) markReadMutation.mutate(n.id);
  }

  return (
    <AppLayout>
      <Stack spacing={2}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h5">Notificaciones</Typography>
          <Button onClick={() => markAllReadMutation.mutate()} disabled={markAllReadMutation.isPending}>
            Marcar todas como leídas
          </Button>
        </Box>
        <Stack spacing={1}>
          {notifications.map((n) => (
            <Paper
              key={n.id}
              variant="outlined"
              sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', opacity: n.read ? 0.6 : 1 }}
            >
              <Box onClick={() => handleClick(n)} sx={{ cursor: 'pointer', flexGrow: 1 }}>
                <Typography variant="body1">{n.message}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(n.createdAt).toLocaleString()}
                </Typography>
              </Box>
              <DeleteButton onClick={() => hideMutation.mutate(n.id)} disabled={hideMutation.isPending} />
            </Paper>
          ))}
          {notifications.length === 0 && (
            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
              Sin notificaciones.
            </Typography>
          )}
        </Stack>
      </Stack>
    </AppLayout>
  );
}
