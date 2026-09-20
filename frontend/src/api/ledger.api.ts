import { apiClient } from './client';
import type { Balance, ChildLedger } from '../types/ledger';

export async function getMyBalance(): Promise<Balance> {
  const { data } = await apiClient.get<Balance>('/ledger/balance');
  return data;
}

export async function getChildLedger(childId: number): Promise<ChildLedger> {
  const { data } = await apiClient.get<ChildLedger>(`/children/${childId}/ledger`);
  return data;
}
