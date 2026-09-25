import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Paper,
  Rating,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../auth/AuthContext';
import { deleteBook, getBook, listChildBooks, requestReward, updateBook, type BookInput } from '../api/books.api';
import { listCategories } from '../api/categories.api';
import { listMyRewardRequests } from '../api/reward-requests.api';
import type { BookStatus } from '../types/book';

const STATUS_OPTIONS: Record<BookStatus, BookStatus[]> = {
  NOT_STARTED: ['NOT_STARTED', 'READING', 'FINISHED'],
  READING: ['READING', 'FINISHED'],
  FINISHED: ['FINISHED'],
};

const STATUS_LABEL: Record<BookStatus, string> = {
  NOT_STARTED: 'Sin empezar',
  READING: 'Leyendo',
  FINISHED: 'Terminado',
};

export default function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const bookId = Number(id);
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const viewChildId = searchParams.get('childId') ? Number(searchParams.get('childId')) : null;
  const readOnly = viewChildId != null;
  const [form, setForm] = useState<BookInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const ownBookQuery = useQuery({
    queryKey: ['books', bookId],
    queryFn: () => getBook(bookId),
    enabled: !readOnly,
  });
  const childBookQuery = useQuery({
    queryKey: ['books', 'child', viewChildId, bookId],
    queryFn: async () => {
      const books = await listChildBooks(viewChildId!);
      const found = books.find((b) => b.id === bookId);
      if (!found) throw new Error('Libro no encontrado');
      return found;
    },
    enabled: readOnly,
  });
  const bookQuery = readOnly ? childBookQuery : ownBookQuery;
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: listCategories, enabled: !readOnly });
  const rewardRequestsQuery = useQuery({
    queryKey: ['reward-requests', 'mine'],
    queryFn: listMyRewardRequests,
    enabled: user?.role === 'CHILD',
  });

  useEffect(() => {
    if (bookQuery.data) {
      const b = bookQuery.data;
      setForm({
        title: b.title,
        author: b.author,
        status: b.status,
        startDate: b.startDate ?? '',
        endDate: b.endDate ?? '',
        notes: b.notes ?? '',
        rating: b.rating ?? undefined,
        categoryId: b.categoryId ?? undefined,
      });
    }
  }, [bookQuery.data]);

  const updateMutation = useMutation({
    mutationFn: (input: Partial<BookInput>) => updateBook(bookId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      setError(null);
      setInfo('Cambios guardados');
    },
    onError: (err) => {
      const message = axios.isAxiosError(err) ? err.response?.data?.message : undefined;
      setError(typeof message === 'string' ? message : 'No se pudo guardar el libro');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteBook(bookId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      navigate('/books', { replace: true });
    },
  });

  const requestRewardMutation = useMutation({
    mutationFn: () => requestReward(bookId),
    onSuccess: () => {
      setInfo('Solicitud enviada a tu padre/madre');
      queryClient.invalidateQueries({ queryKey: ['reward-requests', 'mine'] });
    },
    onError: (err) => {
      const message = axios.isAxiosError(err) ? err.response?.data?.message : undefined;
      setError(typeof message === 'string' ? message : 'No se pudo enviar la solicitud');
    },
  });

  if (bookQuery.isLoading || !form) {
    return (
      <AppLayout>
        <Typography>Cargando…</Typography>
      </AppLayout>
    );
  }
  if (bookQuery.isError) {
    return (
      <AppLayout>
        <Alert severity="error">No se encontró el libro.</Alert>
      </AppLayout>
    );
  }

  const book = bookQuery.data!;
  const categories = categoriesQuery.data ?? [];
  const canRequestReward = !readOnly && user?.role === 'CHILD' && book.status === 'NOT_STARTED';
  const rewardRequest = (rewardRequestsQuery.data ?? [])
    .filter((r) => r.bookId === bookId)
    .sort((a, b) => b.id - a.id)[0];
  const rewardRequestPending = rewardRequest?.status === 'PENDING';
  const rewardRequestApproved = rewardRequest?.status === 'RESOLVED';

  function handleSave() {
    setError(null);
    setInfo(null);
    updateMutation.mutate({
      title: form!.title,
      author: form!.author,
      status: form!.status,
      startDate: form!.startDate || undefined,
      endDate: form!.endDate || undefined,
      notes: form!.notes || undefined,
      rating: form!.rating,
      categoryId: form!.categoryId,
    });
  }

  function handleDelete() {
    if (!window.confirm(`¿Eliminar el libro "${book.title}"?`)) return;
    deleteMutation.mutate();
  }

  return (
    <AppLayout>
      <Stack spacing={2}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h5">{book.title}</Typography>
          {!readOnly && (
            <Button color="error" onClick={handleDelete}>
              Eliminar
            </Button>
          )}
        </Box>
        {error && <Alert severity="error">{error}</Alert>}
        {info && <Alert severity="success">{info}</Alert>}
        {readOnly && (
          <Alert severity="info">Solo lectura: estás viendo el libro de un hijo.</Alert>
        )}
        {book.status === 'NOT_STARTED' && user?.role === 'CHILD' && (
          <Alert severity="info">
            Si empiezas a leer este libro perderás la opción de solicitar una recompensa asociada.
          </Alert>
        )}
        <Paper sx={{ p: 3 }}>
          <Stack spacing={2} maxWidth={480}>
            <TextField
              label="Título"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              disabled={readOnly}
            />
            <TextField
              label="Autor"
              value={form.author}
              onChange={(e) => setForm({ ...form, author: e.target.value })}
              disabled={readOnly}
            />
            <TextField
              select
              label="Estado"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as BookStatus })}
              disabled={readOnly}
            >
              {STATUS_OPTIONS[book.status].map((status) => (
                <MenuItem key={status} value={status}>
                  {STATUS_LABEL[status]}
                </MenuItem>
              ))}
            </TextField>
            {!readOnly && (
              <TextField
                select
                label="Categoría"
                value={form.categoryId ?? ''}
                onChange={(e) =>
                  setForm({ ...form, categoryId: e.target.value ? Number(e.target.value) : undefined })
                }
              >
                <MenuItem value="">Sin categoría</MenuItem>
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.title}
                  </MenuItem>
                ))}
              </TextField>
            )}
            <TextField
              label="Fecha de inicio"
              type="date"
              value={form.startDate ?? ''}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              disabled={readOnly}
            />
            <TextField
              label="Fecha de fin"
              type="date"
              value={form.endDate ?? ''}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              disabled={readOnly}
            />
            <TextField
              label="Notas"
              value={form.notes ?? ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              multiline
              minRows={2}
              disabled={readOnly}
            />
            <Box>
              <Typography variant="body2" color="text.secondary">
                Valoración
              </Typography>
              <Rating
                value={form.rating ?? 0}
                onChange={(_, value) => setForm({ ...form, rating: value ?? undefined })}
                readOnly={readOnly}
              />
            </Box>
            {!readOnly && (
              <Stack direction="row" spacing={2}>
                <Button variant="contained" onClick={handleSave} disabled={updateMutation.isPending}>
                  Guardar cambios
                </Button>
                {canRequestReward && (rewardRequestPending || rewardRequestApproved) && (
                  <Typography variant="body2" color={rewardRequestPending ? 'text.secondary' : 'success.main'} alignSelf="center">
                    {rewardRequestPending ? 'Solicitud pendiente' : 'Solicitud aprobada'}
                  </Typography>
                )}
                {canRequestReward && !rewardRequestPending && !rewardRequestApproved && (
                  <Button
                    variant="outlined"
                    onClick={() => requestRewardMutation.mutate()}
                    disabled={requestRewardMutation.isPending}
                  >
                    Solicitar recompensa
                  </Button>
                )}
              </Stack>
            )}
          </Stack>
        </Paper>
      </Stack>
    </AppLayout>
  );
}
