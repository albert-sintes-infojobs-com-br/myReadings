export type Role = 'PARENT' | 'CHILD';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  parentId: number | null;
}
