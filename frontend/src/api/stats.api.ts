import { apiClient } from './client';
import type { ChildStats, OverviewStats } from '../types/stats';

export async function getMyStats(): Promise<ChildStats> {
  const { data } = await apiClient.get<ChildStats>('/stats/me');
  return data;
}

export async function getOverviewStats(childId?: number): Promise<OverviewStats> {
  const { data } = await apiClient.get<OverviewStats>('/stats/overview', {
    params: childId !== undefined ? { childId } : undefined,
  });
  return data;
}
