import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AppLayout from '../components/layout/AppLayout';
import { listChildren } from '../api/children.api';
import {
  createGoal,
  deleteGoal,
  listGoalsByChild,
  redeemGoal,
  updateGoal,
  type GoalInput,
} from '../api/goals.api';
import type { Goal, GoalStatus } from '../types/goal';

const EMPTY_FORM: GoalInput = { name: '', targetPoints: 100 };

const STATUS_LABEL: Record<GoalStatus, string> = {
  ACTIVE: 'Activa',
  ACHIEVED: 'Conseguida',
  REDEEMED: 'Canjeada',
};

export default function GoalsPage() {
  const queryClient = useQueryClient();
  const [childId, setChildId] = useState<number | ''>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [form, setForm] = useState<GoalInput>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  const childrenQuery = useQuery({ queryKey: ['children'], queryFn: listChildren });
  const goalsQuery = useQuery({
    queryKey: ['goals', childId],
    queryFn: () => listGoalsByChild(childId as number),
    enabled: childId !== '',
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['goals', childId] });
  }

  const createMutation = useMutation({
    mutationFn: (input: GoalInput) => createGoal(childId as number, input),
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
    },
    onError: (err) => setError(extractMessage(err, 'No se pudo crear la meta')),
  });
  const updateMutation = useMutation({
    mutationFn: (vars: { id: number; input: Partial<GoalInput> }) => updateGoal(vars.id, vars.input),
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
    },
    onError: (err) => setError(extractMessage(err, 'No se pudo guardar la meta')),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteGoal,
    onSuccess: invalidate,
    onError: (err) => setError(extractMessage(err, 'No se pudo eliminar la meta')),
  });
  const redeemMutation = useMutation({
    mutationFn: redeemGoal,
    onSuccess: invalidate,
    onError: (err) => setError(extractMessage(err, 'No se pudo canjear la meta')),
  });

  function extractMessage(err: unknown, fallback: string): string {
    const message = axios.isAxiosError(err) ? err.response?.data?.message : undefined;
    return typeof message === 'string' ? message : fallback;
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(goal: Goal) {
    setEditing(goal);
    setForm({ name: goal.name, description: goal.description ?? '', targetPoints: goal.targetPoints });
    setError(null);
    setDialogOpen(true);
  }

  function handleSave() {
    setError(null);
    const input = { ...form, description: form.description || undefined };
    if (editing) {
      updateMutation.mutate({ id: editing.id, input });
    } else {
      createMutation.mutate(input);
    }
  }

  function handleDelete(goal: Goal) {
    if (!window.confirm(`¿Eliminar la meta "${goal.name}"?`)) return;
    setError(null);
    deleteMutation.mutate(goal.id);
  }

  const children = childrenQuery.data ?? [];
  const goals = goalsQuery.data ?? [];

  return (
    <AppLayout>
      <Stack spacing={2}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h5">Metas</Typography>
          <Button variant="contained" onClick={openCreate} disabled={childId === ''}>
            Nueva meta
          </Button>
        </Box>
        <TextField
          select
          label="Hijo/a"
          value={childId}
          onChange={(e) => setChildId(e.target.value ? Number(e.target.value) : '')}
          sx={{ width: 260 }}
          size="small"
        >
          <MenuItem value="">Selecciona un hijo/a</MenuItem>
          {children.map((child) => (
            <MenuItem key={child.id} value={child.id}>
              {child.name}
            </MenuItem>
          ))}
        </TextField>
        {error && <Alert severity="error">{error}</Alert>}
        {childId !== '' && (
          <Paper>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Objetivo (puntos)</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {goals.map((goal) => (
                  <TableRow key={goal.id}>
                    <TableCell>{goal.name}</TableCell>
                    <TableCell>{goal.targetPoints}</TableCell>
                    <TableCell>
                      <Chip size="small" label={STATUS_LABEL[goal.status]} />
                    </TableCell>
                    <TableCell align="right">
                      {goal.status === 'ACTIVE' && (
                        <>
                          <IconButton size="small" onClick={() => openEdit(goal)} aria-label="Editar">
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleDelete(goal)} aria-label="Eliminar">
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </>
                      )}
                      {goal.status === 'ACHIEVED' && (
                        <Button size="small" onClick={() => redeemMutation.mutate(goal.id)}>
                          Canjear
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {goals.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      Sin metas todavía.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
        )}
      </Stack>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{editing ? 'Editar meta' : 'Nueva meta'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Nombre"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              autoFocus
            />
            <TextField
              label="Descripción"
              value={form.description ?? ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              multiline
              minRows={2}
            />
            <TextField
              label="Puntos objetivo"
              type="number"
              value={form.targetPoints}
              onChange={(e) => setForm({ ...form, targetPoints: Number(e.target.value) })}
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!form.name || form.targetPoints <= 0 || createMutation.isPending || updateMutation.isPending}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </AppLayout>
  );
}
