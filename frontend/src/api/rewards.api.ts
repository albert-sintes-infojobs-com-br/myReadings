import { apiClient } from './client';
import type { Reward, RewardType } from '../types/reward';

export interface RewardInput {
  type: RewardType;
  value: number;
  deadline: string;
  penaltyValue?: number;
  goalId?: number;
}

export async function listRewards(): Promise<Reward[]> {
  const { data } = await apiClient.get<Reward[]>('/rewards');
  return data;
}

export async function getReward(id: number): Promise<Reward> {
  const { data } = await apiClient.get<Reward>(`/rewards/${id}`);
  return data;
}

export async function createReward(bookId: number, input: RewardInput): Promise<Reward> {
  const { data } = await apiClient.post<Reward>(`/books/${bookId}/rewards`, input);
  return data;
}

export async function updateReward(id: number, input: Partial<RewardInput>): Promise<Reward> {
  const { data } = await apiClient.patch<Reward>(`/rewards/${id}`, input);
  return data;
}

export async function deleteReward(id: number): Promise<void> {
  await apiClient.delete(`/rewards/${id}`);
}
