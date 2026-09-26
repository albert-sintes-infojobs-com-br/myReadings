import { useState, type FormEvent } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Link,
  Popover,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import { useAuth } from '../../auth/AuthContext';

const SECTIONS = [
  { href: '#objetivo', label: 'Objetivo' },
  { href: '#funcionalidades', label: 'Funcionalidades' },
  { href: '#como-funciona', label: 'Cómo funciona' },
];

export default function LandingHeader() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const loggedInUser = await login(email, password);
      setAnchorEl(null);
      navigate(loggedInUser.role === 'PARENT' ? '/parent' : '/child', { replace: true });
    } catch {
      setError('Credenciales inválidas');
    } finally {
      setSubmitting(false);
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
            <Link component="button" underline="hover" onClick={(e) => setAnchorEl(e.currentTarget)}>
              Iniciar sesión
            </Link>
            <Button variant="contained" component={RouterLink} to="/register">
              Registrarse
            </Button>
          </Stack>
        )}
        <Popover
          open={Boolean(anchorEl)}
          anchorEl={anchorEl}
          onClose={() => setAnchorEl(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Stack component="form" onSubmit={handleLogin} spacing={2} sx={{ p: 3, width: 300 }}>
            <Typography variant="subtitle1">Iniciar sesión</Typography>
            {error && <Alert severity="error">{error}</Alert>}
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
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? 'Entrando…' : 'Entrar'}
            </Button>
          </Stack>
        </Popover>
      </Toolbar>
    </AppBar>
  );
}
