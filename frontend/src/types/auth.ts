export type Role = 'PARENT' | 'CHILD';
export type Gender = 'MALE' | 'FEMALE';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  gender: Gender;
  parentId: number | null;
}
