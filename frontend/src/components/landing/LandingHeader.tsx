import { useState, type FormEvent } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  AppBar,
  Box,
  Button,
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
import type { Gender } from '../../types/auth';

const SECTIONS = [
  { href: '#objetivo', label: 'Objetivo' },
  { href: '#funcionalidades', label: 'Funcionalidades' },
  { href: '#como-funciona', label: 'Cómo funciona' },
];

export default function LandingHeader() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
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

  return (
    <AppBar position="sticky" color="default" elevation={1}>
      <Toolbar sx={{ gap: 3 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <LibraryBooksIcon color="primary" />
          <Typography variant="h6" component="span">
            MyReadings
          </Typography>
        </Box>
        <Stack direction="row" spacing={3} flexGrow={1} justifyContent="center">
          {SECTIONS.map((section) => (
            <Link key={section.href} href={section.href} underline="hover" color="inherit">
              {section.label}
            </Link>
          ))}
        </Stack>
        {user ? (
          <Button
            variant="contained"
            onClick={() => navigate(user.role === 'PARENT' ? '/parent' : '/child')}
          >
            Ir a mi panel
          </Button>
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
