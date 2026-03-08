import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogContentText, DialogTitle, IconButton, Snackbar, TextField,
  Toolbar, Tooltip, Typography,
} from '@mui/material';
import {
  DataGrid,
} from '@mui/x-data-grid';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../api/client';
import type { Category } from '../api/client';

type DialogMode = 'add' | 'edit';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  // add/edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>('add');
  const [dialogName, setDialogName] = useState('');
  const [dialogId, setDialogId] = useState<number | null>(null);
  const [dialogError, setDialogError] = useState('');
  const [saving, setSaving] = useState(false);

  // delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [snack, setSnack] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      setCategories(await getCategories());
    } catch {
      setSnack('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setDialogMode('add');
    setDialogName('');
    setDialogId(null);
    setDialogError('');
    setDialogOpen(true);
  };

  const openEdit = (c: Category) => {
    setDialogMode('edit');
    setDialogName(c.name);
    setDialogId(c.id);
    setDialogError('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const name = dialogName.trim();
    if (!name) { setDialogError('Name is required'); return; }
    setSaving(true);
    setDialogError('');
    try {
      if (dialogMode === 'add') {
        await createCategory(name);
        setSnack('Category created');
      } else if (dialogId != null) {
        await updateCategory(dialogId, name);
        setSnack('Category updated');
      }
      setDialogOpen(false);
      load();
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        setDialogError('A category with that name already exists');
      } else {
        setDialogError('Failed to save category');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCategory(deleteTarget.id);
      setSnack('Category deleted');
      setDeleteTarget(null);
      load();
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        setSnack('Cannot delete: books are assigned to this category');
      } else {
        setSnack('Failed to delete category');
      }
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Name', flex: 1 },
    {
      field: 'created_at', headerName: 'Created', width: 180,
      valueGetter: (_: unknown, row: Category) =>
        new Date(row.created_at).toLocaleString(),
    },
    {
      field: 'actions', headerName: '', width: 100, sortable: false, align: 'right',
      renderCell: (p: GridRenderCellParams<Category>) => (
        <Box>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => openEdit(p.row)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" color="error" onClick={() => setDeleteTarget(p.row)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar disableGutters sx={{ mb: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>Categories</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
          {categories.length} total
        </Typography>
        <Box sx={{ ml: 'auto' }}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
            Add Category
          </Button>
        </Box>
      </Toolbar>

      <DataGrid
        rows={categories}
        columns={columns}
        loading={loading}
        pageSizeOptions={[25, 50, 100]}
        sx={{ flex: 1 }}
      />

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{dialogMode === 'add' ? 'New Category' : 'Edit Category'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus fullWidth label="Name" value={dialogName} margin="dense"
            onChange={e => setDialogName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            error={!!dialogError} helperText={dialogError}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete category?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.
            Deletion is blocked if any books are assigned to this category.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button color="error" onClick={handleDelete} disabled={deleting}>
            {deleting ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.startsWith('Cannot') ? 'warning' : 'info'} onClose={() => setSnack('')}>
          {snack}
        </Alert>
      </Snackbar>
    </Box>
  );
}
