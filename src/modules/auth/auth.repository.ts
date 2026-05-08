import type { Prisma } from "../../generated/prisma/client.js";
import { getPrismaClient } from "../../infra/database/prisma";
import type { DbClient } from "../../shared/database/repository";

const USER_SELECT = {
  id: true,
  email: true,
  fullName: true,
  passwordHash: true,
  phoneNumber: true,
  role: true,
  permissions: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type AuthUserRecord = Prisma.UserGetPayload<{
  select: typeof USER_SELECT;
}>;

async function getDb(db?: DbClient) {
  return db ?? getPrismaClient();
}

export class AuthRepository {
  async findUserByEmail(email: string, db?: DbClient): Promise<AuthUserRecord | null> {
    const client = await getDb(db);

    return client.user.findUnique({
      where: {
        email,
      },
      select: USER_SELECT,
    });
  }

  async findUserById(userId: string, db?: DbClient): Promise<AuthUserRecord | null> {
    const client = await getDb(db);

    return client.user.findUnique({
      where: {
        id: userId,
      },
      select: USER_SELECT,
    });
  }

  async createUser(
    input: {
      email: string;
      fullName: string;
      passwordHash: string;
      phoneNumber?: string;
    },
    db?: DbClient,
  ): Promise<AuthUserRecord> {
    const client = await getDb(db);

    return client.user.create({
      data: {
        email: input.email,
        fullName: input.fullName,
        passwordHash: input.passwordHash,
        phoneNumber: input.phoneNumber ?? undefined,
      },
      select: USER_SELECT,
    });
  }

  async updateLastLoginAt(userId: string, db?: DbClient): Promise<AuthUserRecord> {
    const client = await getDb(db);

    return client.user.update({
      where: {
        id: userId,
      },
      data: {
        lastLoginAt: new Date(),
      },
      select: USER_SELECT,
    });
  }
}
