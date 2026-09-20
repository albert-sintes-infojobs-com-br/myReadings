import { apiClient } from './client';
import type { RewardRequest, RewardRequestStatus } from '../types/reward-request';

export async function listPendingRewardRequests(): Promise<RewardRequest[]> {
  const { data } = await apiClient.get<RewardRequest[]>('/reward-requests');
  return data;
}

export async function resolveRewardRequest(
  id: number,
  status: Extract<RewardRequestStatus, 'RESOLVED' | 'DISMISSED'>,
): Promise<RewardRequest> {
  const { data } = await apiClient.patch<RewardRequest>(`/reward-requests/${id}`, { status });
  return data;
}
