import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export default api;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Category {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Book {
  id: number;
  isbn: string;
  title: string | null;
  authors: string | null; // JSON string
  publisher: string | null;
  published_date: string | null;
  description: string | null;
  page_count: number | null;
  thumbnail_url: string | null;
  language: string | null;
  category: Category;
  tags: Tag[];
  isbn_raw_data: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ── Categories ────────────────────────────────────────────────────────────────

export const getCategories = () => api.get<Category[]>('/categories').then(r => r.data);
export const createCategory = (name: string) => api.post<Category>('/categories', { name }).then(r => r.data);
export const updateCategory = (id: number, name: string) => api.put<Category>(`/categories/${id}`, { name }).then(r => r.data);
export const deleteCategory = (id: number) => api.delete(`/categories/${id}`);

// ── Tags ──────────────────────────────────────────────────────────────────────

export const getTags = () => api.get<Tag[]>('/tags').then(r => r.data);
export const createTag = (name: string) => api.post<Tag>('/tags', { name }).then(r => r.data);
export const updateTag = (id: number, name: string) => api.put<Tag>(`/tags/${id}`, { name }).then(r => r.data);
export const deleteTag = (id: number) => api.delete(`/tags/${id}`);

// ── Books ─────────────────────────────────────────────────────────────────────

export interface BookListResponse {
  items: Book[];
  total: number;
}

export interface BookListParams {
  search?: string;
  category_id?: number;
  tag_ids?: number[];
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}

export const getBooks = (params?: BookListParams) =>
  api.get<BookListResponse>('/books', { params }).then(r => r.data);

export const getBook = (id: number) => api.get<Book>(`/books/${id}`).then(r => r.data);

export interface BookCreateParams {
  isbn: string;
  title?: string;
  authors?: string[];
  category_id: number;
  tag_ids?: number[];
  notes?: string;
}

export const createBook = (data: BookCreateParams) =>
  api.post<Book>('/books', data).then(r => r.data);

export const updateBook = (id: number, data: { category_id?: number; tag_ids?: number[]; notes?: string }) =>
  api.put<Book>(`/books/${id}`, data).then(r => r.data);

export const deleteBook = (id: number) => api.delete(`/books/${id}`);

// ── Export ────────────────────────────────────────────────────────────────────

export const exportData = () => window.open('/api/export', '_blank');

// ── Health / version ──────────────────────────────────────────────────────────

export const getHealth = () =>
  api.get<{ status: string; version: string }>('/health').then(r => r.data);
