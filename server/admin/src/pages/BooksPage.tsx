import { useEffect, useState, useCallback } from 'react';
import {
  Box, Button, Chip, CircularProgress, Drawer, FormControl, IconButton,
  InputLabel, MenuItem, OutlinedInput, Select,
  Snackbar, Alert, TextField, Toolbar, Tooltip, Typography, Divider,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Checkbox, ListItemText,
} from '@mui/material';
import {
  DataGrid,
} from '@mui/x-data-grid';
import type { GridColDef, GridRenderCellParams, GridSortModel } from '@mui/x-data-grid';
import { GridToolbarContainer } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import {
  getBooks, getBook, getCategories, getTags, updateBook, deleteBook, exportData, createBook,
} from '../api/client';
import type { Book, Category, Tag, BookListParams } from '../api/client';

function parseAuthors(raw: string | null): string {
  if (!raw) return '';
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.join(', ') : raw;
  } catch {
    return raw;
  }
}

interface BookDrawerProps {
  bookId: number | null;
  onClose: () => void;
  onSaved: () => void;
  categories: Category[];
  tags: Tag[];
}

function BookDrawer({ bookId, onClose, onSaved, categories, tags }: BookDrawerProps) {
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categoryId, setCategoryId] = useState<string>('');
  const [tagIdStrings, setTagIdStrings] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (bookId == null) { setBook(null); return; }
    setLoading(true);
    getBook(bookId)
      .then(b => {
        setBook(b);
        setCategoryId(String(b.category?.id ?? ''));
        setTagIdStrings(b.tags?.map(t => String(t.id)) ?? []);
        setNotes(b.notes ?? '');
      })
      .catch(() => setError('Failed to load book'))
      .finally(() => setLoading(false));
  }, [bookId]);

  const handleSave = async () => {
    if (!book || !categoryId) return;
    setSaving(true);
    try {
      await updateBook(book.id, {
        category_id: Number(categoryId),
        tag_ids: tagIdStrings.map(Number),
        notes: notes || undefined,
      });
      onSaved();
      onClose();
    } catch {
      setError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const open = bookId != null;

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: 420, display: 'flex', flexDirection: 'column' } }}>
      {/* Push content below the fixed AppBar */}
      <Toolbar />
      <Box sx={{ flex: 1, overflowY: 'auto', p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {loading && <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>}
        {!loading && book && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              {book.thumbnail_url && (
                <Box component="img" src={book.thumbnail_url} alt="cover"
                  sx={{ width: 80, height: 110, objectFit: 'cover', borderRadius: 1, flexShrink: 0 }} />
              )}
              <Box>
                <Typography variant="h6" sx={{ lineHeight: 1.3 }}>{book.title ?? '(no title)'}</Typography>
                <Typography variant="body2" color="text.secondary">{parseAuthors(book.authors)}</Typography>
              </Box>
            </Box>

            <Divider />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {([
                ['ISBN', book.isbn],
                ['Publisher', book.publisher],
                ['Published', book.published_date],
                ['Pages', book.page_count?.toString()],
                ['Language', book.language],
                ['Added', new Date(book.created_at).toLocaleString()],
                ['Modified', new Date(book.updated_at).toLocaleString()],
              ] as [string, string | null | undefined][]).map(([label, val]) => val && (
                <Box key={label} sx={{ display: 'flex', gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, width: 80, flexShrink: 0 }}>{label}</Typography>
                  <Typography variant="body2" color="text.secondary">{val}</Typography>
                </Box>
              ))}
            </Box>

            {book.description && (
              <Typography variant="body2" color="text.secondary" sx={{
                overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical',
              }}>
                {book.description}
              </Typography>
            )}

            <Divider />

            <FormControl fullWidth size="small">
              <InputLabel>Category *</InputLabel>
              <Select
                value={categoryId}
                label="Category *"
                onChange={e => setCategoryId(e.target.value)}
              >
                {categories.map(c => <MenuItem key={c.id} value={String(c.id)}>{c.name}</MenuItem>)}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Tags</InputLabel>
              <Select
                multiple
                value={tagIdStrings}
                onChange={e => {
                  const val = e.target.value;
                  setTagIdStrings(typeof val === 'string' ? val.split(',') : val);
                }}
                input={<OutlinedInput label="Tags" />}
                renderValue={selected =>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map(id => {
                      const t = tags.find(t => String(t.id) === id);
                      return t ? <Chip key={id} label={t.name} size="small" /> : null;
                    })}
                  </Box>
                }
              >
                {tags.map(t => (
                  <MenuItem key={t.id} value={String(t.id)}>
                    <Checkbox checked={tagIdStrings.includes(String(t.id))} />
                    <ListItemText primary={t.name} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Notes"
              multiline
              minRows={2}
              maxRows={5}
              fullWidth
              size="small"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />

            <Box sx={{ mt: 'auto', display: 'flex', gap: 1 }}>
              <Button variant="contained" onClick={handleSave} disabled={saving || !categoryId} fullWidth>
                {saving ? <CircularProgress size={20} /> : 'Save'}
              </Button>
              <Button variant="outlined" onClick={onClose} fullWidth>Cancel</Button>
            </Box>

            {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
          </>
        )}
      </Box>
    </Drawer>
  );
}

interface AddBookDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  categories: Category[];
  tags: Tag[];
}

function AddBookDialog({ open, onClose, onCreated, categories, tags }: AddBookDialogProps) {
  const [isbn, setIsbn] = useState('');
  const [title, setTitle] = useState('');
  const [authorsText, setAuthorsText] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [tagIdStrings, setTagIdStrings] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setIsbn(''); setTitle(''); setAuthorsText(''); setCategoryId('');
    setTagIdStrings([]); setNotes(''); setError('');
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSave = async () => {
    if (!isbn.trim() || !categoryId) return;
    setSaving(true);
    setError('');
    try {
      const authors = authorsText.trim()
        ? authorsText.split(',').map(a => a.trim()).filter(Boolean)
        : undefined;
      await createBook({
        isbn: isbn.trim(),
        title: title.trim() || undefined,
        authors,
        category_id: Number(categoryId),
        tag_ids: tagIdStrings.map(Number),
        notes: notes.trim() || undefined,
      });
      onCreated();
      handleClose();
    } catch {
      setError('Failed to create book');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Add Book Manually</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        <TextField
          label="ISBN *" value={isbn} onChange={e => setIsbn(e.target.value)}
          size="small" autoFocus
          helperText="13-digit barcode number"
        />
        <TextField
          label="Title" value={title} onChange={e => setTitle(e.target.value)} size="small"
        />
        <TextField
          label="Authors" value={authorsText} onChange={e => setAuthorsText(e.target.value)}
          size="small" helperText="Comma-separated: Jane Smith, John Doe"
        />
        <FormControl fullWidth size="small" required>
          <InputLabel>Category *</InputLabel>
          <Select value={categoryId} label="Category *" onChange={e => setCategoryId(e.target.value)}>
            {categories.map(c => <MenuItem key={c.id} value={String(c.id)}>{c.name}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl fullWidth size="small">
          <InputLabel>Tags</InputLabel>
          <Select
            multiple value={tagIdStrings}
            onChange={e => {
              const val = e.target.value;
              setTagIdStrings(typeof val === 'string' ? val.split(',') : val);
            }}
            input={<OutlinedInput label="Tags" />}
            renderValue={selected =>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map(id => {
                  const t = tags.find(t => String(t.id) === id);
                  return t ? <Chip key={id} label={t.name} size="small" /> : null;
                })}
              </Box>
            }
          >
            {tags.map(t => (
              <MenuItem key={t.id} value={String(t.id)}>
                <Checkbox checked={tagIdStrings.includes(String(t.id))} />
                <ListItemText primary={t.name} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="Notes" value={notes} onChange={e => setNotes(e.target.value)}
          size="small" multiline minRows={2}
        />
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || !isbn.trim() || !categoryId}
        >
          {saving ? <CircularProgress size={20} /> : 'Add Book'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

interface ToolbarProps {
  search: string;
  onSearch: (v: string) => void;
  categoryId: string;
  onCategory: (v: string) => void;
  tagId: string;
  onTag: (v: string) => void;
  categories: Category[];
  tags: Tag[];
  onExport: () => void;
}

function BooksToolbar({ search, onSearch, categoryId, onCategory, tagId, onTag, categories, tags, onExport }: ToolbarProps) {
  return (
    <GridToolbarContainer sx={{ p: 1, gap: 1, flexWrap: 'wrap' }}>
      <TextField
        size="small" placeholder="Search title, author, ISBN…" value={search}
        onChange={e => onSearch(e.target.value)} sx={{ minWidth: 220 }}
      />
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel>Category</InputLabel>
        <Select value={categoryId} label="Category" onChange={e => onCategory(e.target.value)}>
          <MenuItem value=""><em>All</em></MenuItem>
          {categories.map(c => <MenuItem key={c.id} value={String(c.id)}>{c.name}</MenuItem>)}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel>Tag</InputLabel>
        <Select value={tagId} label="Tag" onChange={e => onTag(e.target.value)}>
          <MenuItem value=""><em>All</em></MenuItem>
          {tags.map(t => <MenuItem key={t.id} value={String(t.id)}>{t.name}</MenuItem>)}
        </Select>
      </FormControl>
      <Box sx={{ ml: 'auto' }}>
        <Tooltip title="Export JSON">
          <Button startIcon={<FileDownloadIcon />} onClick={onExport} size="small">Export</Button>
        </Tooltip>
      </Box>
    </GridToolbarContainer>
  );
}

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });
  const [sortModel, setSortModel] = useState<GridSortModel>([{ field: 'created_at', sort: 'desc' }]);
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [snack, setSnack] = useState('');

  const loadBooks = useCallback(async () => {
    setLoading(true);
    const params: BookListParams = {
      page: paginationModel.page + 1,
      page_size: paginationModel.pageSize,
    };
    if (search) params.search = search;
    if (categoryFilter) params.category_id = Number(categoryFilter);
    if (tagFilter) params.tag_id = Number(tagFilter);
    if (sortModel[0]) {
      params.sort_by = sortModel[0].field;
      params.sort_dir = (sortModel[0].sort ?? 'desc') as 'asc' | 'desc';
    }
    try {
      const data = await getBooks(params);
      setBooks(data.items);
      setTotal(data.total);
    } catch {
      setSnack('Failed to load books');
    } finally {
      setLoading(false);
    }
  }, [paginationModel, search, categoryFilter, tagFilter, sortModel]);

  useEffect(() => { loadBooks(); }, [loadBooks]);

  useEffect(() => {
    Promise.all([getCategories(), getTags()]).then(([cats, tgs]) => {
      setCategories(cats);
      setTags(tgs);
    });
  }, []);

  const handleDelete = async () => {
    if (deleteId == null) return;
    setDeleting(true);
    try {
      await deleteBook(deleteId);
      setSnack('Book deleted');
      setDeleteId(null);
      loadBooks();
    } catch {
      setSnack('Failed to delete book');
    } finally {
      setDeleting(false);
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'thumbnail_url', headerName: '', width: 52, sortable: false,
      renderCell: (p: GridRenderCellParams) => p.value
        ? <Box component="img" src={p.value as string} alt="cover"
            sx={{ width: 36, height: 50, objectFit: 'cover', borderRadius: 0.5, my: 0.5 }} />
        : <Box sx={{ width: 36, height: 50, bgcolor: 'grey.200', borderRadius: 0.5, my: 0.5 }} />,
    },
    { field: 'title', headerName: 'Title', flex: 2, minWidth: 180 },
    {
      field: 'authors', headerName: 'Authors', flex: 1.5, minWidth: 140,
      valueGetter: (_: unknown, row: Book) => parseAuthors(row.authors),
    },
    { field: 'isbn', headerName: 'ISBN', width: 140 },
    {
      field: 'category', headerName: 'Category', width: 130, sortable: false,
      valueGetter: (_: unknown, row: Book) => row.category?.name ?? '',
    },
    {
      field: 'tags', headerName: 'Tags', flex: 1, minWidth: 130, sortable: false,
      renderCell: (p: GridRenderCellParams<Book>) =>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, py: 0.5 }}>
          {((p.row as Book).tags ?? []).map((t: Tag) => <Chip key={t.id} label={t.name} size="small" />)}
        </Box>,
    },
    {
      field: 'published_date', headerName: 'Year', width: 80,
      valueGetter: (_: unknown, row: Book) => row.published_date?.slice(0, 4) ?? '',
    },
    {
      field: 'actions', headerName: '', width: 60, sortable: false, align: 'center',
      renderCell: (p: GridRenderCellParams) => (
        <Tooltip title="Delete">
          <IconButton size="small" color="error"
            onClick={e => { e.stopPropagation(); setDeleteId(p.row.id as number); }}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar disableGutters sx={{ mb: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>Books</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
          {total} record{total !== 1 ? 's' : ''}
        </Typography>
        <Tooltip title="Add book manually">
          <IconButton size="small" sx={{ ml: 1 }} onClick={() => setAddOpen(true)}>
            <AddIcon />
          </IconButton>
        </Tooltip>
      </Toolbar>

      <DataGrid
        rows={books}
        columns={columns}
        loading={loading}
        rowCount={total}
        paginationMode="server"
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        sortModel={sortModel}
        onSortModelChange={setSortModel}
        pageSizeOptions={[25, 50, 100]}
        rowHeight={60}
        disableColumnFilter
        onRowClick={p => setSelectedBookId(p.row.id as number)}
        slots={{
          toolbar: () => (
            <BooksToolbar
              search={search}
              onSearch={v => { setSearch(v); setPaginationModel(m => ({ ...m, page: 0 })); }}
              categoryId={categoryFilter}
              onCategory={v => { setCategoryFilter(v); setPaginationModel(m => ({ ...m, page: 0 })); }}
              tagId={tagFilter}
              onTag={v => { setTagFilter(v); setPaginationModel(m => ({ ...m, page: 0 })); }}
              categories={categories}
              tags={tags}
              onExport={exportData}
            />
          ),
        }}
        sx={{ flex: 1, cursor: 'pointer' }}
      />

      <BookDrawer
        bookId={selectedBookId}
        onClose={() => setSelectedBookId(null)}
        onSaved={loadBooks}
        categories={categories}
        tags={tags}
      />

      <AddBookDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={() => { loadBooks(); setSnack('Book added'); }}
        categories={categories}
        tags={tags}
      />

      <Dialog open={deleteId != null} onClose={() => setDeleteId(null)}>
        <DialogTitle>Delete book?</DialogTitle>
        <DialogContent>
          <DialogContentText>This action cannot be undone.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button color="error" onClick={handleDelete} disabled={deleting}>
            {deleting ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack('')}
        message={snack} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </Box>
  );
}
