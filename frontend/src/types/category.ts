export interface Category {
  id: number;
  ownerUserId: number;
  title: string;
  description: string | null;
  colorHex: string;
  createdAt: string;
}
