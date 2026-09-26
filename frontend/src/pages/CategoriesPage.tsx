import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
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
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
  type CategoryInput,
} from '../api/categories.api';
import type { Category } from '../types/category';

const EMPTY_FORM: CategoryInput = { title: '', colorHex: '#3f51b5', description: '' };

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryInput>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: listCategories });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['categories'] });
  }

  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
    },
  });
  const updateMutation = useMutation({
    mutationFn: (vars: { id: number; input: Partial<CategoryInput> }) =>
      updateCategory(vars.id, vars.input),
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: invalidate,
    onError: (err) => {
      const message = axios.isAxiosError(err) ? err.response?.data?.message : undefined;
      setError(typeof message === 'string' ? message : 'No se pudo eliminar la categoría');
    },
  });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(category: Category) {
    setEditing(category);
    setForm({
      title: category.title,
      colorHex: category.colorHex,
      description: category.description ?? '',
    });
    setError(null);
    setDialogOpen(true);
  }

  function handleSave() {
    setError(null);
    const input = { ...form, description: form.description || undefined };
    const mutation = editing
      ? updateMutation.mutateAsync({ id: editing.id, input })
      : createMutation.mutateAsync(input);
    mutation.catch((err) => {
      const message = axios.isAxiosError(err) ? err.response?.data?.message : undefined;
      setError(typeof message === 'string' ? message : 'No se pudo guardar la categoría');
    });
  }

  function handleDelete(category: Category) {
    if (!window.confirm(`¿Eliminar la categoría "${category.title}"?`)) return;
    setError(null);
    deleteMutation.mutate(category.id);
  }

  const categories = categoriesQuery.data ?? [];

  return (
    <AppLayout>
      <Stack spacing={2}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h5">Categorías</Typography>
          <Button variant="contained" onClick={openCreate}>
            Nueva categoría
          </Button>
        </Box>
        {error && <Alert severity="error">{error}</Alert>}
        <Paper>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Color</TableCell>
                <TableCell>Título</TableCell>
                <TableCell>Descripción</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    <Box
                      sx={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        bgcolor: category.colorHex,
                        border: '1px solid rgba(0,0,0,0.2)',
                      }}
                    />
                  </TableCell>
                  <TableCell>{category.title}</TableCell>
                  <TableCell>{category.description ?? '—'}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => openEdit(category)} aria-label="Editar">
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(category)} aria-label="Eliminar">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {categoriesQuery.isLoading && (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    Cargando…
                  </TableCell>
                </TableRow>
              )}
              {!categoriesQuery.isLoading && categories.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    Sin categorías todavía.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
      </Stack>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{editing ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle>
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
              label="Color"
              type="color"
              value={form.colorHex}
              onChange={(e) => setForm({ ...form, colorHex: e.target.value })}
            />
            <TextField
              label="Descripción"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!form.title || createMutation.isPending || updateMutation.isPending}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </AppLayout>
  );
}
