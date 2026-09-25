import { apiClient } from './client';
import type { Book, BookStatus } from '../types/book';

export interface BookInput {
  title: string;
  author: string;
  status?: BookStatus;
  startDate?: string;
  endDate?: string;
  notes?: string;
  rating?: number;
  categoryId?: number;
}

export interface ListBooksFilter {
  status?: BookStatus;
  categoryId?: number;
}

export async function listBooks(filter?: ListBooksFilter): Promise<Book[]> {
  const { data } = await apiClient.get<Book[]>('/books', { params: filter });
  return data;
}

export async function listChildBooks(childId: number, filter?: ListBooksFilter): Promise<Book[]> {
  const { data } = await apiClient.get<Book[]>(`/children/${childId}/books`, { params: filter });
  return data;
}

export async function getBook(id: number): Promise<Book> {
  const { data } = await apiClient.get<Book>(`/books/${id}`);
  return data;
}

export async function createBook(input: BookInput): Promise<Book> {
  const { data } = await apiClient.post<Book>('/books', input);
  return data;
}

export async function updateBook(id: number, input: Partial<BookInput>): Promise<Book> {
  const { data } = await apiClient.patch<Book>(`/books/${id}`, input);
  return data;
}

export async function deleteBook(id: number): Promise<void> {
  await apiClient.delete(`/books/${id}`);
}

export async function requestReward(bookId: number): Promise<void> {
  await apiClient.post(`/books/${bookId}/request-reward`);
}
