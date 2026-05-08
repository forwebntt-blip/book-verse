import type { Prisma, PrismaClient } from "../../generated/prisma/client";
import { getPrismaClient } from "../../infra/database/prisma";

export type DbClient = PrismaClient | Prisma.TransactionClient;

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
}

export interface PaginationResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Repository<TEntity, TCreateInput, TUpdateInput, TId = string> {
  findById(id: TId, db?: DbClient): Promise<TEntity | null>;
  create(input: TCreateInput, db?: DbClient): Promise<TEntity>;
  update(id: TId, input: TUpdateInput, db?: DbClient): Promise<TEntity>;
  delete(id: TId, db?: DbClient): Promise<void>;
}

export function normalizePagination(query: PaginationQuery = {}): Required<PaginationQuery> {
  const page = query.page && query.page > 0 ? Math.floor(query.page) : 1;
  const pageSize = query.pageSize && query.pageSize > 0 ? Math.min(Math.floor(query.pageSize), 100) : 20;

  return {
    page,
    pageSize,
  };
}

export function toSkipTake(query: PaginationQuery = {}): {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
} {
  const { page, pageSize } = normalizePagination(query);

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

export async function withDbTransaction<T>(
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  const prisma = await getPrismaClient();
  return prisma.$transaction((tx) => work(tx), {
    maxWait: 10_000,
    timeout: 20_000,
  });
}
