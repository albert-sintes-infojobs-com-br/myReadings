import { useState } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  Link,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
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

/** Encabezado único de la app: misma barra flotante "glass" en landing y páginas autenticadas. */
export default function Header() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);

  const nav = user ? (user.role === 'PARENT' ? PARENT_NAV : CHILD_NAV) : null;
  const RoleIcon = user?.role === 'PARENT' ? WorkspacePremiumIcon : AutoStoriesIcon;

  const logo = (
    <Box
      display="flex"
      alignItems="center"
      gap={1.5}
      component={RouterLink}
      to="/"
      sx={{ textDecoration: 'none', color: 'inherit' }}
    >
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        sx={{
          width: 40,
          height: 40,
          borderRadius: 3,
          background: 'linear-gradient(135deg, #4f46e5 0%, #8b5cf6 100%)',
          color: '#fff',
          boxShadow: '0 4px 10px rgba(79,70,229,0.35)',
        }}
      >
        <MenuBookIcon fontSize="small" />
      </Box>
      <Box display="flex" flexDirection="column" lineHeight={1.2}>
        <Typography variant="body1" fontWeight={600} sx={{ color: '#0f172a' }}>
          MyReadings
        </Typography>
        {user && (
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              {user.name}
            </Typography>
            <Box
              display="inline-flex"
              alignItems="center"
              gap={0.5}
              sx={{
                borderRadius: 5,
                border: '1px solid rgba(252,211,77,0.7)',
                background: 'linear-gradient(90deg, #fffbeb 0%, #fff7ed 100%)',
                color: '#b45309',
                px: 1,
                py: 0.1,
              }}
            >
              <RoleIcon sx={{ fontSize: 12 }} />
              <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5 }}>
                {personLabel(user.role, user.gender).toUpperCase()}
              </Typography>
            </Box>
          </Stack>
        )}
      </Box>
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
            underline="none"
            onClick={() => setDrawerOpen(false)}
            sx={{
              borderRadius: 2,
              px: 1.5,
              py: 1,
              fontSize: '0.875rem',
              fontWeight: 500,
              color: active ? '#4338ca' : '#475569',
              bgcolor: active ? '#eef2ff' : 'transparent',
              '&:hover': { bgcolor: active ? '#eef2ff' : '#f1f5f9', color: active ? '#4338ca' : '#0f172a' },
            }}
          >
            {item.label}
          </Link>
        );
      })
    : LANDING_SECTIONS.map((section) => (
        <Link
          key={section.href}
          href={section.href}
          underline="none"
          onClick={() => setDrawerOpen(false)}
          sx={{
            borderRadius: 2,
            px: 1.5,
            py: 1,
            fontSize: '0.875rem',
            fontWeight: 500,
            color: '#475569',
            '&:hover': { bgcolor: '#f1f5f9', color: '#0f172a' },
          }}
        >
          {section.label}
        </Link>
      ));

  const bar = (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        mx: 'auto',
        maxWidth: 'lg',
        borderRadius: 4,
        border: '1px solid rgba(255,255,255,0.6)',
        bgcolor: 'rgba(255,255,255,0.75)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 10px 15px -3px rgba(49,46,129,0.05), 0 4px 6px -4px rgba(49,46,129,0.05)',
        px: 2,
        py: 1.25,
      }}
    >
      {logo}
      {!isMobile && (
        <Stack direction="row" spacing={0.5} flexGrow={1} flexWrap="wrap" justifyContent="center">
          {navLinks}
        </Stack>
      )}
      {isMobile ? (
        <IconButton
          aria-label="Abrir menú"
          onClick={() => setDrawerOpen(true)}
          sx={{ borderRadius: 3, color: '#475569', '&:hover': { bgcolor: '#f1f5f9' } }}
        >
          <MenuIcon />
        </IconButton>
      ) : user ? (
        <Stack direction="row" spacing={0.5} alignItems="center">
          <NotificationBell />
          <Button
            onClick={logout}
            startIcon={<LogoutIcon fontSize="small" />}
            sx={{
              borderRadius: 3,
              color: '#64748b',
              textTransform: 'none',
              fontWeight: 500,
              '&:hover': { bgcolor: '#fff1f2', color: '#e11d48' },
            }}
          >
            Salir
          </Button>
        </Stack>
      ) : (
        <AuthButtons />
      )}
    </Box>
  );

  return (
    <Box position="sticky" top={0} zIndex={50} sx={{ px: 2, pt: 2 }}>
      {bar}
      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Stack spacing={2} sx={{ width: 260, p: 2 }}>
          {user && (
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2">{user.name}</Typography>
              <Box
                display="inline-flex"
                alignItems="center"
                gap={0.5}
                sx={{
                  borderRadius: 5,
                  border: '1px solid rgba(252,211,77,0.7)',
                  background: 'linear-gradient(90deg, #fffbeb 0%, #fff7ed 100%)',
                  color: '#b45309',
                  px: 1,
                  py: 0.1,
                }}
              >
                <RoleIcon sx={{ fontSize: 12 }} />
                <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5 }}>
                  {personLabel(user.role, user.gender).toUpperCase()}
                </Typography>
              </Box>
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
    </Box>
  );
}
