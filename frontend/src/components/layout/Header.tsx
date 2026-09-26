import { useState, type FormEvent } from 'react';
import axios from 'axios';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Chip,
  Link,
  MenuItem,
  Popover,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import { useAuth } from '../../auth/AuthContext';
import { registerRequest } from '../../api/auth.api';
import { personLabel } from '../../utils/personLabel';
import type { Gender } from '../../types/auth';
import NotificationBell from './NotificationBell';

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
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [loginAnchorEl, setLoginAnchorEl] = useState<HTMLElement | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  const [registerAnchorEl, setRegisterAnchorEl] = useState<HTMLElement | null>(null);
  const [name, setName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [gender, setGender] = useState<Gender>('FEMALE');
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerSubmitting, setRegisterSubmitting] = useState(false);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoginError(null);
    setLoginSubmitting(true);
    try {
      const loggedInUser = await login(email, password);
      setLoginAnchorEl(null);
      navigate(loggedInUser.role === 'PARENT' ? '/parent' : '/child', { replace: true });
    } catch {
      setLoginError('Credenciales inválidas');
    } finally {
      setLoginSubmitting(false);
    }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setRegisterError(null);
    setRegisterSubmitting(true);
    try {
      await registerRequest({ name, email: registerEmail, password: registerPassword, gender });
      await login(registerEmail, registerPassword);
      setRegisterAnchorEl(null);
      navigate('/parent', { replace: true });
    } catch (err) {
      const message = axios.isAxiosError(err) ? err.response?.data?.message : undefined;
      setRegisterError(typeof message === 'string' ? message : 'No se pudo completar el registro');
    } finally {
      setRegisterSubmitting(false);
    }
  }

  const nav = user ? (user.role === 'PARENT' ? PARENT_NAV : CHILD_NAV) : null;

  return (
    <AppBar position="sticky" color="default" elevation={1} sx={{ width: '100%' }}>
      <Toolbar sx={{ maxWidth: 'lg', width: '100%', mx: 'auto', gap: 3, flexWrap: 'wrap', py: 1 }}>
        <Box>
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
          {nav
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
                  >
                    {item.label}
                  </Link>
                );
              })
            : LANDING_SECTIONS.map((section) => (
                <Link key={section.href} href={section.href} underline="hover" color="inherit">
                  {section.label}
                </Link>
              ))}
        </Stack>
        {user ? (
          <Stack direction="row" spacing={1} alignItems="center">
            <NotificationBell />
            <Button variant="contained" onClick={logout}>
              Salir
            </Button>
          </Stack>
        ) : (
          <Stack direction="row" spacing={1} alignItems="center">
            <Link component="button" underline="hover" onClick={(e) => setLoginAnchorEl(e.currentTarget)}>
              Iniciar sesión
            </Link>
            <Button variant="contained" onClick={(e) => setRegisterAnchorEl(e.currentTarget)}>
              Registrarse
            </Button>
          </Stack>
        )}
        <Popover
          open={Boolean(loginAnchorEl)}
          anchorEl={loginAnchorEl}
          onClose={() => setLoginAnchorEl(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Stack component="form" onSubmit={handleLogin} spacing={2} sx={{ p: 3, width: 300 }}>
            <Typography variant="subtitle1">Iniciar sesión</Typography>
            {loginError && <Alert severity="error">{loginError}</Alert>}
            <TextField
              label="Email"
              type="email"
              size="small"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
            <TextField
              label="Contraseña"
              type="password"
              size="small"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" variant="contained" disabled={loginSubmitting}>
              {loginSubmitting ? 'Entrando…' : 'Entrar'}
            </Button>
          </Stack>
        </Popover>
        <Popover
          open={Boolean(registerAnchorEl)}
          anchorEl={registerAnchorEl}
          onClose={() => setRegisterAnchorEl(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Stack component="form" onSubmit={handleRegister} spacing={2} sx={{ p: 3, width: 320 }}>
            <Typography variant="subtitle1">Crear cuenta (padre/madre)</Typography>
            {registerError && <Alert severity="error">{registerError}</Alert>}
            <TextField
              label="Nombre"
              size="small"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
            <TextField
              label="Email"
              type="email"
              size="small"
              value={registerEmail}
              onChange={(e) => setRegisterEmail(e.target.value)}
              required
            />
            <TextField
              label="Contraseña"
              type="password"
              size="small"
              value={registerPassword}
              onChange={(e) => setRegisterPassword(e.target.value)}
              required
              helperText="Mínimo 8 caracteres"
            />
            <TextField
              select
              size="small"
              label="Eres"
              value={gender}
              onChange={(e) => setGender(e.target.value as Gender)}
            >
              <MenuItem value="FEMALE">Madre</MenuItem>
              <MenuItem value="MALE">Padre</MenuItem>
            </TextField>
            <Button type="submit" variant="contained" disabled={registerSubmitting}>
              {registerSubmitting ? 'Creando…' : 'Crear cuenta'}
            </Button>
          </Stack>
        </Popover>
      </Toolbar>
    </AppBar>
  );
}
