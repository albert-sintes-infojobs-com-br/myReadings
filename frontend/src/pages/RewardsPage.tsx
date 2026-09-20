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
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AppLayout from '../components/layout/AppLayout';
import { listGoalsByChild } from '../api/goals.api';
import {
  listPendingRewardRequests,
  resolveRewardRequest,
} from '../api/reward-requests.api';
import {
  createReward,
  deleteReward,
  listRewards,
  updateReward,
  type RewardInput,
} from '../api/rewards.api';
import type { Reward, RewardType } from '../types/reward';
import type { RewardRequest } from '../types/reward-request';

const EMPTY_FORM: RewardInput = { type: 'MONEY', value: 5, deadline: '' };

function extractMessage(err: unknown, fallback: string): string {
  const message = axios.isAxiosError(err) ? err.response?.data?.message : undefined;
  return typeof message === 'string' ? message : fallback;
}

export default function RewardsPage() {
  const queryClient = useQueryClient();
  const [activeRequest, setActiveRequest] = useState<RewardRequest | null>(null);
  const [editing, setEditing] = useState<Reward | null>(null);
  const [form, setForm] = useState<RewardInput>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  const requestsQuery = useQuery({
    queryKey: ['reward-requests'],
    queryFn: listPendingRewardRequests,
  });
  const rewardsQuery = useQuery({ queryKey: ['rewards'], queryFn: listRewards });
  const goalsQuery = useQuery({
    queryKey: ['goals', activeRequest?.childId],
    queryFn: () => listGoalsByChild(activeRequest!.childId),
    enabled: !!activeRequest,
  });

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ['reward-requests'] });
    queryClient.invalidateQueries({ queryKey: ['rewards'] });
  }

  const createFromRequestMutation = useMutation({
    mutationFn: async (input: RewardInput) => {
      const request = activeRequest!;
      await createReward(request.bookId, input);
      await resolveRewardRequest(request.id, 'RESOLVED');
    },
    onSuccess: () => {
      invalidateAll();
      setActiveRequest(null);
    },
    onError: (err) => setError(extractMessage(err, 'No se pudo crear la recompensa')),
  });

  const dismissMutation = useMutation({
    mutationFn: (id: number) => resolveRewardRequest(id, 'DISMISSED'),
    onSuccess: invalidateAll,
    onError: (err) => setError(extractMessage(err, 'No se pudo descartar la solicitud')),
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: number; input: Partial<RewardInput> }) =>
      updateReward(vars.id, vars.input),
    onSuccess: () => {
      invalidateAll();
      setEditing(null);
    },
    onError: (err) => setError(extractMessage(err, 'No se pudo guardar la recompensa')),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteReward,
    onSuccess: invalidateAll,
    onError: (err) => setError(extractMessage(err, 'No se pudo eliminar la recompensa')),
  });

  function openCreateFromRequest(request: RewardRequest) {
    setActiveRequest(request);
    setForm(EMPTY_FORM);
    setError(null);
  }

  function openEdit(reward: Reward) {
    setEditing(reward);
    setForm({
      type: reward.type,
      value: reward.value,
      deadline: reward.deadline,
      penaltyValue: reward.penaltyValue ?? undefined,
      goalId: reward.goalId ?? undefined,
    });
    setError(null);
  }

  function handleDelete(reward: Reward) {
    if (!window.confirm(`¿Eliminar la recompensa del libro #${reward.bookId}?`)) return;
    setError(null);
    deleteMutation.mutate(reward.id);
  }

  const requests = requestsQuery.data ?? [];
  const rewards = rewardsQuery.data ?? [];
  const goals = goalsQuery.data ?? [];

  return (
    <AppLayout>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h5" sx={{ mb: 2 }}>
            Solicitudes pendientes
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Paper>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Libro</TableCell>
                  <TableCell>Solicitado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>Libro #{request.bookId}</TableCell>
                    <TableCell>{new Date(request.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell align="right">
                      <Button size="small" onClick={() => openCreateFromRequest(request)}>
                        Crear recompensa
                      </Button>
                      <Button size="small" color="inherit" onClick={() => dismissMutation.mutate(request.id)}>
                        Descartar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {requests.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      Sin solicitudes pendientes.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
        </Box>

        <Box>
          <Typography variant="h5" sx={{ mb: 2 }}>
            Recompensas
          </Typography>
          <Paper>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Libro</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Valor</TableCell>
                  <TableCell>Plazo</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rewards.map((reward) => (
                  <TableRow key={reward.id}>
                    <TableCell>Libro #{reward.bookId}</TableCell>
                    <TableCell>{reward.type === 'POINTS' ? 'Puntos' : 'Euros'}</TableCell>
                    <TableCell>{reward.value}</TableCell>
                    <TableCell>{reward.deadline}</TableCell>
                    <TableCell>
                      <Chip size="small" label={reward.status} />
                    </TableCell>
                    <TableCell align="right">
                      {reward.status === 'PENDING' && (
                        <>
                          <IconButton size="small" onClick={() => openEdit(reward)} aria-label="Editar">
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleDelete(reward)} aria-label="Eliminar">
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {rewards.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      Sin recompensas todavía.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
        </Box>
      </Stack>

      <Dialog open={!!activeRequest} onClose={() => setActiveRequest(null)} fullWidth maxWidth="xs">
        <DialogTitle>Crear recompensa — Libro #{activeRequest?.bookId}</DialogTitle>
        <DialogContent>
          <RewardForm
            form={form}
            setForm={setForm}
            goals={goals}
            error={error}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActiveRequest(null)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={() => createFromRequestMutation.mutate(form)}
            disabled={
              !form.deadline ||
              form.value <= 0 ||
              (form.type === 'POINTS' && !form.goalId) ||
              createFromRequestMutation.isPending
            }
          >
            Crear
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!editing} onClose={() => setEditing(null)} fullWidth maxWidth="xs">
        <DialogTitle>Editar recompensa</DialogTitle>
        <DialogContent>
          <RewardForm form={form} setForm={setForm} goals={goals} error={error} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={() => editing && updateMutation.mutate({ id: editing.id, input: form })}
            disabled={!form.deadline || form.value <= 0 || updateMutation.isPending}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </AppLayout>
  );
}

function RewardForm({
  form,
  setForm,
  goals,
  error,
}: {
  form: RewardInput;
  setForm: (form: RewardInput) => void;
  goals: Array<{ id: number; name: string }>;
  error: string | null;
}) {
  return (
    <Stack spacing={2} sx={{ mt: 1 }}>
      {error && <Alert severity="error">{error}</Alert>}
      <TextField
        select
        label="Tipo"
        value={form.type}
        onChange={(e) => setForm({ ...form, type: e.target.value as RewardType })}
      >
        <MenuItem value="MONEY">Euros</MenuItem>
        <MenuItem value="POINTS">Puntos</MenuItem>
      </TextField>
      <TextField
        label="Valor"
        type="number"
        value={form.value}
        onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
        required
      />
      {form.type === 'POINTS' && (
        <TextField
          select
          label="Meta"
          value={form.goalId ?? ''}
          onChange={(e) => setForm({ ...form, goalId: e.target.value ? Number(e.target.value) : undefined })}
          required
        >
          {goals.map((goal) => (
            <MenuItem key={goal.id} value={goal.id}>
              {goal.name}
            </MenuItem>
          ))}
        </TextField>
      )}
      <TextField
        label="Plazo (fecha límite)"
        type="date"
        value={form.deadline}
        onChange={(e) => setForm({ ...form, deadline: e.target.value })}
        InputLabelProps={{ shrink: true }}
        required
      />
      <TextField
        label="Penalización (opcional)"
        type="number"
        value={form.penaltyValue ?? ''}
        onChange={(e) =>
          setForm({ ...form, penaltyValue: e.target.value ? Number(e.target.value) : undefined })
        }
      />
    </Stack>
  );
}
