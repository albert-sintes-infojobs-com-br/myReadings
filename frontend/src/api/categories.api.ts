import { apiClient } from './client';
import type { Category } from '../types/category';

export interface CategoryInput {
  title: string;
  colorHex: string;
  description?: string;
}

export async function listCategories(): Promise<Category[]> {
  const { data } = await apiClient.get<Category[]>('/categories');
  return data;
}

export async function createCategory(input: CategoryInput): Promise<Category> {
  const { data } = await apiClient.post<Category>('/categories', input);
  return data;
}

export async function updateCategory(id: number, input: Partial<CategoryInput>): Promise<Category> {
  const { data } = await apiClient.put<Category>(`/categories/${id}`, input);
  return data;
}

export async function deleteCategory(id: number): Promise<void> {
  await apiClient.delete(`/categories/${id}`);
}
