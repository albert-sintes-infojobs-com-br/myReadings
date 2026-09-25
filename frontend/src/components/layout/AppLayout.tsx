import type { ReactNode } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { AppBar, Box, Button, Chip, Container, Tab, Tabs, Toolbar, Typography } from '@mui/material';
import { useAuth } from '../../auth/AuthContext';
import { personLabel } from '../../utils/personLabel';
import NotificationBell from './NotificationBell';

const PARENT_NAV = [
  { to: '/parent', label: 'Dashboard' },
  { to: '/books', label: 'Libros' },
  { to: '/categories', label: 'Categorías' },
  { to: '/children', label: 'Hijos' },
  { to: '/goals', label: 'Metas' },
  { to: '/rewards', label: 'Recompensas' },
];

const CHILD_NAV = [
  { to: '/child', label: 'Dashboard' },
  { to: '/books', label: 'Libros' },
  { to: '/categories', label: 'Categorías' },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const nav = user?.role === 'PARENT' ? PARENT_NAV : CHILD_NAV;
  const activeTab = nav.find((item) => location.pathname.startsWith(item.to))?.to ?? false;

  return (
    <Box minHeight="100vh" bgcolor="background.default">
      <AppBar position="static">
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            MyReadings
          </Typography>
          {user && (
            <>
              <Chip
                label={personLabel(user.role, user.gender)}
                size="small"
                color="secondary"
              />
              <NotificationBell />
              <Typography variant="body2">{user.name}</Typography>
              <Button color="inherit" onClick={logout}>
                Salir
              </Button>
            </>
          )}
        </Toolbar>
        {user && (
          <Tabs
            value={activeTab}
            textColor="inherit"
            indicatorColor="secondary"
            variant="scrollable"
            scrollButtons="auto"
            sx={{ bgcolor: 'primary.dark' }}
          >
            {nav.map((item) => (
              <Tab key={item.to} value={item.to} label={item.label} component={RouterLink} to={item.to} />
            ))}
          </Tabs>
        )}
      </AppBar>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {children}
      </Container>
    </Box>
  );
}
