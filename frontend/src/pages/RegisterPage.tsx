import { useState, type FormEvent } from 'react';
import axios from 'axios';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, Link, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { registerRequest } from '../api/auth.api';
import { useAuth } from '../auth/AuthContext';
import type { Gender } from '../types/auth';

export default function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gender, setGender] = useState<Gender>('FEMALE');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await registerRequest({ name, email, password, gender });
      await login(email, password);
      navigate('/parent', { replace: true });
    } catch (err) {
      const message = axios.isAxiosError(err) ? err.response?.data?.message : undefined;
      setError(typeof message === 'string' ? message : 'No se pudo completar el registro');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box display="flex" minHeight="100vh" alignItems="center" justifyContent="center" bgcolor="background.default">
      <Paper sx={{ p: 4, width: 380 }} component="form" onSubmit={handleSubmit}>
        <Stack spacing={2}>
          <Typography variant="h5" align="center">
            Crear cuenta (padre/madre)
          </Typography>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Nombre" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <TextField
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            helperText="Mínimo 8 caracteres"
          />
          <TextField select label="Eres" value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
            <MenuItem value="FEMALE">Madre</MenuItem>
            <MenuItem value="MALE">Padre</MenuItem>
          </TextField>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? 'Creando…' : 'Crear cuenta'}
          </Button>
          <Typography variant="body2" align="center">
            ¿Ya tienes cuenta? <Link component={RouterLink} to="/login">Inicia sesión</Link>
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
