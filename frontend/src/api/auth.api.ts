import { apiClient } from './client';
import type { AuthUser, Gender } from '../types/auth';

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export async function loginRequest(email: string, password: string): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', { email, password });
  return data;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  gender: Gender;
}

export async function registerRequest(input: RegisterInput): Promise<AuthUser> {
  const { data } = await apiClient.post<AuthUser>('/auth/register', input);
  return data;
}

export async function meRequest(): Promise<AuthUser> {
  const { data } = await apiClient.get<AuthUser>('/auth/me');
  return data;
}
