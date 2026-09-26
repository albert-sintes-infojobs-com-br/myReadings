import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Rating,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../auth/AuthContext';
import { createBook, listBooks, listChildBooks, requestReward, updateBook, type BookInput } from '../api/books.api';
import { listCategories } from '../api/categories.api';
import { listChildren } from '../api/children.api';
import { listMyRewardRequests } from '../api/reward-requests.api';
import type { Book, BookStatus } from '../types/book';
import type { RewardRequest } from '../types/reward-request';

const STATUS_LABEL: Record<BookStatus, string> = {
  NOT_STARTED: 'Sin empezar',
  READING: 'Leyendo',
  FINISHED: 'Terminado',
};

const COLUMNS: BookStatus[] = ['NOT_STARTED', 'READING', 'FINISHED'];

// Mirrors backend's allowed forward transitions; used to restrict valid drop targets.
const ALLOWED_TRANSITIONS: Record<BookStatus, BookStatus[]> = {
  NOT_STARTED: ['READING', 'FINISHED'],
  READING: ['FINISHED'],
  FINISHED: [],
};

const EMPTY_FORM: BookInput = { title: '', author: '' };

export default function BooksPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isParent = user?.role === 'PARENT';
  const isChild = user?.role === 'CHILD';
  const [viewMode, setViewMode] = useState<'mine' | 'children'>(
    searchParams.get('viewMode') === 'children' ? 'children' : 'mine',
  );
  const [selectedChildId, setSelectedChildId] = useState<number | ''>(
    searchParams.get('childId') ? Number(searchParams.get('childId')) : '',
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<BookInput>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<BookStatus | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  const readOnly = isParent && viewMode === 'children';

  const childrenQuery = useQuery({ queryKey: ['children'], queryFn: listChildren, enabled: isParent });

  // Al entrar en modo "Hijos", preselecciona el primer hijo si no hay ninguno elegido todavía.
  useEffect(() => {
    if (readOnly && selectedChildId === '' && childrenQuery.data && childrenQuery.data.length > 0) {
      setSelectedChildId(childrenQuery.data[0].id);
    }
  }, [readOnly, selectedChildId, childrenQuery.data]);

  const booksQuery = useQuery({
    queryKey: readOnly ? ['books', 'child', selectedChildId] : ['books'],
    queryFn: () => (readOnly ? listChildBooks(selectedChildId as number) : listBooks()),
    enabled: !readOnly || selectedChildId !== '',
  });
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: listCategories });
  const rewardRequestsQuery = useQuery({
    queryKey: ['reward-requests', 'mine'],
    queryFn: listMyRewardRequests,
    enabled: isChild,
  });

  const requestRewardMutation = useMutation({
    mutationFn: requestReward,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reward-requests', 'mine'] });
    },
    onError: (err) => {
      const message = axios.isAxiosError(err) ? err.response?.data?.message : undefined;
      setRequestError(typeof message === 'string' ? message : 'No se pudo enviar la solicitud');
    },
  });

  const createMutation = useMutation({
    mutationFn: createBook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      setDialogOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (err) => {
      const message = axios.isAxiosError(err) ? err.response?.data?.message : undefined;
      setError(typeof message === 'string' ? message : 'No se pudo crear el libro');
    },
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Partial<BookInput> }) => updateBook(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
    onError: (err) => {
      const message = axios.isAxiosError(err) ? err.response?.data?.message : undefined;
      setMoveError(typeof message === 'string' ? message : 'No se pudo actualizar el estado del libro');
    },
  });

  function openCreate() {
    setForm(EMPTY_FORM);
    setError(null);
    setDialogOpen(true);
  }

  function handleSave() {
    setError(null);
    const input: BookInput = {
      ...form,
      categoryId: form.categoryId ? Number(form.categoryId) : undefined,
    };
    createMutation.mutate(input);
  }

  const books = booksQuery.data ?? [];
  // Solo las categorías propias son asignables a libros (las del padre son de solo lectura para el hijo).
  const categories = (categoriesQuery.data ?? []).filter((c) => c.ownerUserId === user?.id);
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  // Última solicitud de recompensa por libro (puede haber varias si una fue descartada y se reintentó).
  const latestRequestByBook = new Map<number, RewardRequest>();
  for (const request of rewardRequestsQuery.data ?? []) {
    const previous = latestRequestByBook.get(request.bookId);
    if (!previous || request.id > previous.id) latestRequestByBook.set(request.bookId, request);
  }

  function handleDragStart(e: React.DragEvent<HTMLDivElement>, book: Book) {
    e.dataTransfer.setData('text/plain', String(book.id));
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>, column: BookStatus, sourceStatus?: BookStatus) {
    if (readOnly) return;
    if (sourceStatus && !ALLOWED_TRANSITIONS[sourceStatus].includes(column)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(column);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>, column: BookStatus) {
    e.preventDefault();
    setDragOverColumn(null);
    if (readOnly) return;
    const id = Number(e.dataTransfer.getData('text/plain'));
    const book = books.find((b) => b.id === id);
    if (!book || book.status === column) return;
    if (!ALLOWED_TRANSITIONS[book.status].includes(column)) return;
    setMoveError(null);

    const today = new Date().toISOString().slice(0, 10);
    const patch: Partial<BookInput> = { status: column };
    if (column === 'READING' && !book.startDate) patch.startDate = today;
    if (column === 'FINISHED') {
      if (!book.startDate) patch.startDate = today;
      patch.endDate = today;
    }
    moveMutation.mutate({ id, patch });
  }

  return (
    <AppLayout>
      <Stack spacing={2}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h5">Libros</Typography>
          {!readOnly && (
            <Button variant="contained" onClick={openCreate}>
              Nuevo libro
            </Button>
          )}
        </Box>
        {isParent && (
          <Stack direction="row" spacing={2} alignItems="center">
            <ToggleButtonGroup
              size="small"
              exclusive
              value={viewMode}
              onChange={(_, value) => value && setViewMode(value)}
            >
              <ToggleButton value="mine">Míos</ToggleButton>
              <ToggleButton value="children">Hijos</ToggleButton>
            </ToggleButtonGroup>
            {viewMode === 'children' && (
              <TextField
                select
                label="Hijo"
                size="small"
                value={selectedChildId}
                onChange={(e) => setSelectedChildId(e.target.value ? Number(e.target.value) : '')}
                sx={{ minWidth: 220 }}
              >
                <MenuItem value="" disabled>
                  Selecciona un hijo
                </MenuItem>
                {(childrenQuery.data ?? []).map((child) => (
                  <MenuItem key={child.id} value={child.id}>
                    {child.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
          </Stack>
        )}
        {moveError && (
          <Alert severity="error" onClose={() => setMoveError(null)}>
            {moveError}
          </Alert>
        )}
        {requestError && (
          <Alert severity="error" onClose={() => setRequestError(null)}>
            {requestError}
          </Alert>
        )}
        <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2} alignItems={{ xs: 'stretch', sm: 'flex-start' }}>
          {COLUMNS.map((column) => {
            const columnBooks = books.filter((b) => b.status === column);
            return (
              <Paper
                key={column}
                sx={{
                  flex: 1,
                  minWidth: 0,
                  p: 1.5,
                  bgcolor: dragOverColumn === column ? 'action.hover' : 'background.paper',
                  minHeight: { xs: 'auto', sm: 400 },
                }}
                onDragOver={(e) => {
                  const sourceId = Number(e.dataTransfer.getData('text/plain'));
                  const sourceBook = books.find((b) => b.id === sourceId);
                  handleDragOver(e, column, sourceBook?.status);
                }}
                onDragLeave={() => setDragOverColumn((prev) => (prev === column ? null : prev))}
                onDrop={(e) => handleDrop(e, column)}
              >
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  {STATUS_LABEL[column]} ({columnBooks.length})
                </Typography>
                <Stack spacing={1.5}>
                  {columnBooks.map((book) => {
                    const category = book.categoryId ? categoryById.get(book.categoryId) : undefined;
                    const canRequestReward = isChild && !readOnly && column === 'NOT_STARTED';
                    const request = latestRequestByBook.get(book.id);
                    const cardBody = (
                      <CardContent sx={canRequestReward ? { pr: 5 } : undefined}>
                        <Typography variant="subtitle2" noWrap>
                          {book.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {book.author}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                          {category && (
                            <Chip
                              size="small"
                              label={category.title}
                              sx={{ bgcolor: category.colorHex, color: '#fff' }}
                            />
                          )}
                          <Rating value={book.rating ?? 0} readOnly size="small" />
                        </Stack>
                      </CardContent>
                    );
                    return (
                      <Card
                        key={book.id}
                        draggable={!readOnly}
                        onDragStart={(e) => !readOnly && handleDragStart(e, book)}
                        variant="outlined"
                        sx={{ position: 'relative' }}
                      >
                        {canRequestReward && (
                          <Box position="absolute" top={4} right={4} zIndex={1}>
                            {!request || request.status === 'DISMISSED' ? (
                              <Tooltip title="Solicitar recompensa">
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRequestError(null);
                                    requestRewardMutation.mutate(book.id);
                                  }}
                                >
                                  <CardGiftcardIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            ) : (
                              <Chip
                                size="small"
                                label={request.status === 'PENDING' ? 'Solicitud pendiente' : 'Solicitud aprobada'}
                                color={request.status === 'PENDING' ? 'default' : 'success'}
                              />
                            )}
                          </Box>
                        )}
                        {readOnly ? (
                          <CardActionArea onClick={() => navigate(`/books/${book.id}?childId=${selectedChildId}`)}>
                            {cardBody}
                          </CardActionArea>
                        ) : (
                          <CardActionArea onClick={() => navigate(`/books/${book.id}`)}>{cardBody}</CardActionArea>
                        )}
                      </Card>
                    );
                  })}
                  {columnBooks.length === 0 && (
                    <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                      Sin libros.
                    </Typography>
                  )}
                </Stack>
              </Paper>
            );
          })}
        </Box>
      </Stack>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Nuevo libro</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Título"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              autoFocus
            />
            <TextField
              label="Autor"
              value={form.author}
              onChange={(e) => setForm({ ...form, author: e.target.value })}
              required
            />
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
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!form.title || !form.author || createMutation.isPending}
          >
            Crear
          </Button>
        </DialogActions>
      </Dialog>
    </AppLayout>
  );
}
