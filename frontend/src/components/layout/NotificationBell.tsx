import { useState } from 'react';
import { Badge, Box, Button, Divider, IconButton, Menu, MenuItem, Typography } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationDto,
} from '../../api/notifications.api';

/** Campana de notificaciones: badge con no-leídas + desplegable con la bandeja. */
export default function NotificationBell() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const open = Boolean(anchorEl);

  const unreadQuery = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: getUnreadCount,
    refetchInterval: 30_000,
  });

  const listQuery = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => listNotifications(),
    enabled: open,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: invalidate,
  });
  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: invalidate,
  });

  const notifications = (listQuery.data ?? []).slice(0, 3);

  function handleNotificationClick(n: NotificationDto) {
    if (!n.read) markReadMutation.mutate(n.id);
    setAnchorEl(null);
    if (n.type === 'REWARD_REQUEST' && n.refBookId != null) {
      navigate(`/rewards?bookId=${n.refBookId}`);
    }
  }

  return (
    <>
      <IconButton color="inherit" onClick={(e) => setAnchorEl(e.currentTarget)} aria-label="Notificaciones">
        <Badge badgeContent={unreadQuery.data ?? 0} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        PaperProps={{ sx: { width: 340, maxHeight: 420 } }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center" px={2} py={1}>
          <Typography variant="subtitle1">Notificaciones</Typography>
          <Button size="small" onClick={() => markAllReadMutation.mutate()} disabled={markAllReadMutation.isPending}>
            Marcar todas
          </Button>
        </Box>
        <Divider />
        {notifications.length === 0 && <MenuItem disabled>Sin notificaciones</MenuItem>}
        {notifications.map((n) => (
          <MenuItem
            key={n.id}
            onClick={() => handleNotificationClick(n)}
            sx={{ whiteSpace: 'normal', alignItems: 'flex-start', opacity: n.read ? 0.6 : 1 }}
          >
            <Box>
              <Typography variant="body2">{n.message}</Typography>
              <Typography variant="caption" color="text.secondary">
                {new Date(n.createdAt).toLocaleString()}
              </Typography>
            </Box>
          </MenuItem>
        ))}
        <Divider />
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            navigate('/notifications');
          }}
        >
          Ver todas
        </MenuItem>
      </Menu>
    </>
  );
}
