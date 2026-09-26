import { useState } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Drawer,
  IconButton,
  Link,
  Stack,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import MenuIcon from '@mui/icons-material/Menu';
import { useAuth } from '../../auth/AuthContext';
import { personLabel } from '../../utils/personLabel';
import NotificationBell from './NotificationBell';
import AuthButtons from './AuthButtons';

const LANDING_SECTIONS = [
  { href: '#objetivo', label: 'Objetivo' },
  { href: '#funcionalidades', label: 'Funcionalidades' },
  { href: '#como-funciona', label: 'Cómo funciona' },
];

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

/** Encabezado único de la app: misma barra en landing y páginas autenticadas, cambiando el submenú central. */
export default function Header() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);

  const nav = user ? (user.role === 'PARENT' ? PARENT_NAV : CHILD_NAV) : null;

  const logo = (
    <Box
      display="flex"
      alignItems="center"
      gap={1}
      component={RouterLink}
      to="/"
      sx={{ textDecoration: 'none', color: 'inherit' }}
    >
      <LibraryBooksIcon color="primary" />
      <Typography variant="h6" component="span">
        MyReadings
      </Typography>
    </Box>
  );

  const navLinks = nav
    ? nav.map((item) => {
        const active = location.pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            component={RouterLink}
            to={item.to}
            underline="hover"
            color={active ? 'primary' : 'inherit'}
            fontWeight={active ? 'bold' : 'normal'}
            onClick={() => setDrawerOpen(false)}
          >
            {item.label}
          </Link>
        );
      })
    : LANDING_SECTIONS.map((section) => (
        <Link
          key={section.href}
          href={section.href}
          underline="hover"
          color="inherit"
          onClick={() => setDrawerOpen(false)}
        >
          {section.label}
        </Link>
      ));

  if (isMobile) {
    return (
      <AppBar position="sticky" color="default" elevation={1}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          {logo}
          <IconButton aria-label="Abrir menú" onClick={() => setDrawerOpen(true)}>
            <MenuIcon />
          </IconButton>
        </Toolbar>
        <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
          <Stack spacing={2} sx={{ width: 260, p: 2 }}>
            {user && (
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body2">{user.name}</Typography>
                <Chip label={personLabel(user.role, user.gender)} size="small" color="secondary" />
              </Stack>
            )}
            <Stack spacing={1.5}>{navLinks}</Stack>
            <Divider />
            {user ? (
              <Stack spacing={1.5} alignItems="flex-start">
                <NotificationBell />
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => {
                    setDrawerOpen(false);
                    logout();
                  }}
                >
                  Salir
                </Button>
              </Stack>
            ) : (
              <Stack spacing={1.5} alignItems="stretch">
                <AuthButtons mode="page" />
              </Stack>
            )}
          </Stack>
        </Drawer>
      </AppBar>
    );
  }

  return (
    <AppBar position="sticky" color="default" elevation={1}>
      <Toolbar component={Container} maxWidth="lg" sx={{ gap: 3, flexWrap: 'wrap', py: 1 }}>
        <Box>
          {logo}
          {user && (
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="caption" color="text.secondary">
                {user.name}
              </Typography>
              <Chip label={personLabel(user.role, user.gender)} size="small" color="secondary" />
            </Stack>
          )}
        </Box>
        <Stack direction="row" spacing={3} flexGrow={1} flexWrap="wrap" justifyContent="center" rowGap={1}>
          {navLinks}
        </Stack>
        {user ? (
          <Stack direction="row" spacing={1} alignItems="center">
            <NotificationBell />
            <Button variant="contained" onClick={logout}>
              Salir
            </Button>
          </Stack>
        ) : (
          <AuthButtons />
        )}
      </Toolbar>
    </AppBar>
  );
}
