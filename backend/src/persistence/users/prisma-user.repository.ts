import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { SafeUser, UserRecord } from '../../domain/users/user.entity';
import type {
  CreateChildInput,
  CreateParentInput,
  UserRepository,
} from '../../domain/users/user.repository';

const SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  gender: true,
  parentId: true,
} as const;

const FULL_SELECT = {
  ...SAFE_SELECT,
  passwordHash: true,
} as const;

/**
 * Implementación Prisma del contrato `UserRepository`.
 * `findByEmail` es el ÚNICO método que expone `passwordHash` (login).
 */
@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<UserRecord | null> {
    const row = await this.prisma.user.findUnique({
      where: { email },
      select: FULL_SELECT,
    });
    return row as UserRecord | null;
  }

  async findById(id: number): Promise<SafeUser | null> {
    const row = await this.prisma.user.findUnique({
      where: { id },
      select: SAFE_SELECT,
    });
    return row as SafeUser | null;
  }

  async listChildren(parentId: number): Promise<SafeUser[]> {
    const rows = await this.prisma.user.findMany({
      where: { parentId },
      select: SAFE_SELECT,
      orderBy: { id: 'asc' },
    });
    return rows as SafeUser[];
  }

  async createParent(input: CreateParentInput): Promise<SafeUser> {
    const row = await this.prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash: input.passwordHash,
        role: 'PARENT',
        gender: input.gender,
        parentId: null,
      },
      select: SAFE_SELECT,
    });
    return row as SafeUser;
  }

  async createChild(input: CreateChildInput): Promise<SafeUser> {
    const row = await this.prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash: input.passwordHash,
        role: 'CHILD',
        gender: input.gender,
        parentId: input.parentId,
      },
      select: SAFE_SELECT,
    });
    return row as SafeUser;
  }
}
