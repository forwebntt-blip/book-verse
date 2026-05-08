import type { Prisma } from "../../generated/prisma/client.js";
import { PublishStatus } from "../../generated/prisma/enums.js";
import { getPrismaClient } from "../../infra/database/prisma";

const CATEGORY_SELECT = {
  id: true,
  slug: true,
  name: true,
  description: true,
  isFeatured: true,
  sortOrder: true,
} satisfies Prisma.CategorySelect;

const COLLECTION_SELECT = {
  id: true,
  slug: true,
  name: true,
  description: true,
  coverImageUrl: true,
  publishStatus: true,
  isFeatured: true,
  sortOrder: true,
} satisfies Prisma.CollectionSelect;

const STOREFRONT_BOOK_SELECT = {
  id: true,
  slug: true,
  title: true,
  shortDescription: true,
  description: true,
  coverImageUrl: true,
  authorId: true,
  publisherId: true,
  availabilityStatus: true,
  priceAmount: true,
  compareAtAmount: true,
  shippingFeeAmount: true,
  currency: true,
  inventoryQuantity: true,
  isFeatured: true,
  isBestseller: true,
  isRecommended: true,
  sortWeight: true,
  keywords: true,
  publishedAt: true,
  createdAt: true,
  author: {
    select: {
      slug: true,
      name: true,
    },
  },
  publisher: {
    select: {
      slug: true,
      name: true,
    },
  },
  bookCategories: {
    orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
    select: {
      isPrimary: true,
      position: true,
      category: {
        select: {
          id: true,
          slug: true,
          name: true,
        },
      },
    },
  },
} satisfies Prisma.BookSelect;

const STOREFRONT_BOOK_DETAIL_SELECT = {
  ...STOREFRONT_BOOK_SELECT,
  subtitle: true,
  description: true,
  pageCount: true,
  languageCode: true,
  isbn: true,
  keywords: true,
  metadata: true,
  collectionItems: {
    orderBy: {
      position: "asc",
    },
    where: {
      collection: {
        publishStatus: PublishStatus.PUBLISHED,
      },
    },
    select: {
      collection: {
        select: {
          slug: true,
          name: true,
        },
      },
    },
  },
} satisfies Prisma.BookSelect;

export type StorefrontBookRecord = Prisma.BookGetPayload<{
  select: typeof STOREFRONT_BOOK_SELECT;
}>;

export type StorefrontBookDetailRecord = Prisma.BookGetPayload<{
  select: typeof STOREFRONT_BOOK_DETAIL_SELECT;
}>;

export type StorefrontCategoryRecord = Prisma.CategoryGetPayload<{
  select: typeof CATEGORY_SELECT;
}>;

export type StorefrontCollectionRecord = Prisma.CollectionGetPayload<{
  select: typeof COLLECTION_SELECT;
}>;

export class CatalogRepository {
  async findBooks(params: {
    where?: Prisma.BookWhereInput;
    orderBy?: Prisma.BookOrderByWithRelationInput[];
    skip?: number;
    take?: number;
  } = {}): Promise<StorefrontBookRecord[]> {
    const prisma = await getPrismaClient();

    return prisma.book.findMany({
      where: params.where,
      orderBy: params.orderBy,
      skip: params.skip,
      take: params.take,
      select: STOREFRONT_BOOK_SELECT,
    });
  }

  async findFacetBooks(where: Prisma.BookWhereInput): Promise<StorefrontBookRecord[]> {
    const prisma = await getPrismaClient();

    return prisma.book.findMany({
      where,
      orderBy: [{ sortWeight: "desc" }, { createdAt: "desc" }],
      select: STOREFRONT_BOOK_SELECT,
    });
  }

  async countBooks(where: Prisma.BookWhereInput): Promise<number> {
    const prisma = await getPrismaClient();
    return prisma.book.count({ where });
  }

  async findBookDetailBySlug(slug: string): Promise<StorefrontBookDetailRecord | null> {
    const prisma = await getPrismaClient();

    return prisma.book.findFirst({
      where: {
        slug,
        publishStatus: PublishStatus.PUBLISHED,
      },
      select: STOREFRONT_BOOK_DETAIL_SELECT,
    });
  }

  async findCategoryBySlug(slug: string): Promise<StorefrontCategoryRecord | null> {
    const prisma = await getPrismaClient();

    return prisma.category.findUnique({
      where: { slug },
      select: CATEGORY_SELECT,
    });
  }

  async findCategories(limit?: number): Promise<StorefrontCategoryRecord[]> {
    const prisma = await getPrismaClient();

    return prisma.category.findMany({
      take: limit,
      orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
      select: CATEGORY_SELECT,
    });
  }

  async findCollectionBySlug(slug: string): Promise<StorefrontCollectionRecord | null> {
    const prisma = await getPrismaClient();

    return prisma.collection.findUnique({
      where: { slug },
      select: COLLECTION_SELECT,
    });
  }

  async findCollections(limit?: number): Promise<StorefrontCollectionRecord[]> {
    const prisma = await getPrismaClient();

    return prisma.collection.findMany({
      take: limit,
      orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
      select: COLLECTION_SELECT,
    });
  }
}
