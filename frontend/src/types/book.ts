export type BookStatus = 'NOT_STARTED' | 'READING' | 'FINISHED';

export interface Book {
  id: number;
  ownerUserId: number;
  title: string;
  author: string;
  status: BookStatus;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  rating: number | null;
  categoryId: number | null;
  createdAt: string;
  updatedAt: string;
}
