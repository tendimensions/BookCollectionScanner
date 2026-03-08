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
import { getTags, createTag, updateTag, deleteTag } from '../api/client';
import type { Tag } from '../api/client';

type DialogMode = 'add' | 'edit';

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);

  // add/edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>('add');
  const [dialogName, setDialogName] = useState('');
  const [dialogId, setDialogId] = useState<number | null>(null);
  const [dialogError, setDialogError] = useState('');
  const [saving, setSaving] = useState(false);

  // delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Tag | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [snack, setSnack] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      setTags(await getTags());
    } catch {
      setSnack('Failed to load tags');
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

  const openEdit = (t: Tag) => {
    setDialogMode('edit');
    setDialogName(t.name);
    setDialogId(t.id);
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
        await createTag(name);
        setSnack('Tag created');
      } else if (dialogId != null) {
        await updateTag(dialogId, name);
        setSnack('Tag updated');
      }
      setDialogOpen(false);
      load();
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        setDialogError('A tag with that name already exists');
      } else {
        setDialogError('Failed to save tag');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTag(deleteTarget.id);
      setSnack('Tag deleted');
      setDeleteTarget(null);
      load();
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        setSnack('Cannot delete: books are tagged with this tag');
      } else {
        setSnack('Failed to delete tag');
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
      valueGetter: (_: unknown, row: Tag) =>
        new Date(row.created_at).toLocaleString(),
    },
    {
      field: 'actions', headerName: '', width: 100, sortable: false, align: 'right',
      renderCell: (p: GridRenderCellParams<Tag>) => (
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
        <Typography variant="h5" sx={{ fontWeight: 600 }}>Tags</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
          {tags.length} total
        </Typography>
        <Box sx={{ ml: 'auto' }}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
            Add Tag
          </Button>
        </Box>
      </Toolbar>

      <DataGrid
        rows={tags}
        columns={columns}
        loading={loading}
        pageSizeOptions={[25, 50, 100]}
        sx={{ flex: 1 }}
      />

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{dialogMode === 'add' ? 'New Tag' : 'Edit Tag'}</DialogTitle>
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
        <DialogTitle>Delete tag?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.
            Deletion is blocked if any books are tagged with it.
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
