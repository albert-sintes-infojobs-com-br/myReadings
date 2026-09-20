import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Rating,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AppLayout from '../components/layout/AppLayout';
import { createBook, listBooks, type BookInput } from '../api/books.api';
import { listCategories } from '../api/categories.api';
import type { BookStatus } from '../types/book';

const STATUS_LABEL: Record<BookStatus, string> = {
  NOT_STARTED: 'Sin empezar',
  READING: 'Leyendo',
  FINISHED: 'Terminado',
};

const EMPTY_FORM: BookInput = { title: '', author: '' };

export default function BooksPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<BookStatus | ''>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<BookInput>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  const booksQuery = useQuery({
    queryKey: ['books', statusFilter],
    queryFn: () => listBooks(statusFilter ? { status: statusFilter } : undefined),
  });
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: listCategories });

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
  const categories = categoriesQuery.data ?? [];

  return (
    <AppLayout>
      <Stack spacing={2}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h5">Libros</Typography>
          <Button variant="contained" onClick={openCreate}>
            Nuevo libro
          </Button>
        </Box>
        <TextField
          select
          label="Filtrar por estado"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as BookStatus | '')}
          sx={{ width: 240 }}
          size="small"
        >
          <MenuItem value="">Todos</MenuItem>
          <MenuItem value="NOT_STARTED">Sin empezar</MenuItem>
          <MenuItem value="READING">Leyendo</MenuItem>
          <MenuItem value="FINISHED">Terminado</MenuItem>
        </TextField>
        <Paper>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Título</TableCell>
                <TableCell>Autor</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Valoración</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {books.map((book) => (
                <TableRow
                  key={book.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/books/${book.id}`)}
                >
                  <TableCell>{book.title}</TableCell>
                  <TableCell>{book.author}</TableCell>
                  <TableCell>
                    <Chip size="small" label={STATUS_LABEL[book.status]} />
                  </TableCell>
                  <TableCell>
                    <Rating value={book.rating ?? 0} readOnly size="small" />
                  </TableCell>
                </TableRow>
              ))}
              {books.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    Sin libros todavía.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
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
