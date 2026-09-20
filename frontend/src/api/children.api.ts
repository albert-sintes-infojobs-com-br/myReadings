import { apiClient } from './client';
import type { AuthUser } from '../types/auth';

export interface CreateChildInput {
  name: string;
  email: string;
  password: string;
}

export async function listChildren(): Promise<AuthUser[]> {
  const { data } = await apiClient.get<AuthUser[]>('/users/children');
  return data;
}

export async function createChild(input: CreateChildInput): Promise<AuthUser> {
  const { data } = await apiClient.post<AuthUser>('/users/children', input);
  return data;
}
