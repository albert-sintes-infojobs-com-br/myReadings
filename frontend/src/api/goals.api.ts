import { apiClient } from './client';
import type { Goal } from '../types/goal';

export interface GoalInput {
  name: string;
  description?: string;
  targetPoints: number;
}

export async function listGoalsByChild(childId: number): Promise<Goal[]> {
  const { data } = await apiClient.get<Goal[]>(`/children/${childId}/goals`);
  return data;
}

export async function listMyGoals(): Promise<Goal[]> {
  const { data } = await apiClient.get<Goal[]>('/goals/mine');
  return data;
}

export async function createGoal(childId: number, input: GoalInput): Promise<Goal> {
  const { data } = await apiClient.post<Goal>(`/children/${childId}/goals`, input);
  return data;
}

export async function updateGoal(id: number, input: Partial<GoalInput>): Promise<Goal> {
  const { data } = await apiClient.patch<Goal>(`/goals/${id}`, input);
  return data;
}

export async function deleteGoal(id: number): Promise<void> {
  await apiClient.delete(`/goals/${id}`);
}

export async function redeemGoal(id: number): Promise<Goal> {
  const { data } = await apiClient.post<Goal>(`/goals/${id}/redeem`);
  return data;
}
