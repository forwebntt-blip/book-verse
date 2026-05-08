import type { Prisma } from "../../generated/prisma/client.js";
import { getPrismaClient } from "../../infra/database/prisma";
import type { DbClient } from "../../shared/database/repository";

const AUTHOR_SELECT = {
  id: true,
  slug: true,
  name: true,
  biography: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AuthorSelect;

const PUBLISHER_SELECT = {
  id: true,
  slug: true,
  name: true,
  description: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PublisherSelect;

const CATEGORY_SELECT = {
  id: true,
  slug: true,
  name: true,
  description: true,
  isFeatured: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CategorySelect;

const BOOK_SELECT = {
  id: true,
  slug: true,
  title: true,
  subtitle: true,
  shortDescription: true,
  description: true,
  coverImageUrl: true,
  authorId: true,
  publisherId: true,
  publishStatus: true,
  availabilityStatus: true,
  priceAmount: true,
  compareAtAmount: true,
  shippingFeeAmount: true,
  currency: true,
  pageCount: true,
  languageCode: true,
  isbn: true,
  publishedAt: true,
  inventoryQuantity: true,
  isFeatured: true,
  isBestseller: true,
  isRecommended: true,
  sortWeight: true,
  keywords: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: {
      id: true,
      slug: true,
      name: true,
    },
  },
  publisher: {
    select: {
      id: true,
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

const COLLECTION_SELECT = {
  id: true,
  slug: true,
  name: true,
  description: true,
  coverImageUrl: true,
  publishStatus: true,
  isFeatured: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
  items: {
    orderBy: {
      position: "asc",
    },
    select: {
      position: true,
      book: {
        select: {
          id: true,
          slug: true,
          title: true,
        },
      },
    },
  },
} satisfies Prisma.CollectionSelect;

const IMPORT_JOB_SELECT = {
  id: true,
  source: true,
  sourceReference: true,
  triggeredByUserId: true,
  status: true,
  totalRecords: true,
  processedRecords: true,
  successfulRecords: true,
  failedRecords: true,
  errorSummary: true,
  metadata: true,
  startedAt: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ContentImportJobSelect;

const STAGED_BOOK_SELECT = {
  id: true,
  importJobId: true,
  reviewerUserId: true,
  mappedBookId: true,
  sourceRecordId: true,
  sourceUrl: true,
  status: true,
  title: true,
  authorName: true,
  publisherName: true,
  isbn: true,
  priceAmount: true,
  compareAtAmount: true,
  coverImageUrl: true,
  shortDescription: true,
  description: true,
  keywords: true,
  rawPayload: true,
  normalizedPayload: true,
  rejectReason: true,
  reviewedAt: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.StagedBookSelect;

export type AdminAuthorRecord = Prisma.AuthorGetPayload<{
  select: typeof AUTHOR_SELECT;
}>;

export type AdminPublisherRecord = Prisma.PublisherGetPayload<{
  select: typeof PUBLISHER_SELECT;
}>;

export type AdminCategoryRecord = Prisma.CategoryGetPayload<{
  select: typeof CATEGORY_SELECT;
}>;

export type AdminBookRecord = Prisma.BookGetPayload<{
  select: typeof BOOK_SELECT;
}>;

export type AdminCollectionRecord = Prisma.CollectionGetPayload<{
  select: typeof COLLECTION_SELECT;
}>;

export type AdminImportJobRecord = Prisma.ContentImportJobGetPayload<{
  select: typeof IMPORT_JOB_SELECT;
}>;

export type AdminStagedBookRecord = Prisma.StagedBookGetPayload<{
  select: typeof STAGED_BOOK_SELECT;
}>;

async function getDb(db?: DbClient) {
  return db ?? getPrismaClient();
}

export class AdminRepository {
  async listAuthors(db?: DbClient): Promise<AdminAuthorRecord[]> {
    const client = await getDb(db);

    return client.author.findMany({
      orderBy: {
        name: "asc",
      },
      select: AUTHOR_SELECT,
    });
  }

  async findAuthorById(id: string, db?: DbClient): Promise<AdminAuthorRecord | null> {
    const client = await getDb(db);

    return client.author.findUnique({
      where: { id },
      select: AUTHOR_SELECT,
    });
  }

  async findAuthorBySlug(slug: string, db?: DbClient): Promise<AdminAuthorRecord | null> {
    const client = await getDb(db);

    return client.author.findUnique({
      where: { slug },
      select: AUTHOR_SELECT,
    });
  }

  async createAuthor(input: Prisma.AuthorCreateInput, db?: DbClient): Promise<AdminAuthorRecord> {
    const client = await getDb(db);

    return client.author.create({
      data: input,
      select: AUTHOR_SELECT,
    });
  }

  async updateAuthor(
    id: string,
    input: Prisma.AuthorUpdateInput,
    db?: DbClient,
  ): Promise<AdminAuthorRecord> {
    const client = await getDb(db);

    return client.author.update({
      where: { id },
      data: input,
      select: AUTHOR_SELECT,
    });
  }

  async deleteAuthor(id: string, db?: DbClient): Promise<void> {
    const client = await getDb(db);
    await client.author.delete({
      where: { id },
    });
  }

  async listPublishers(db?: DbClient): Promise<AdminPublisherRecord[]> {
    const client = await getDb(db);

    return client.publisher.findMany({
      orderBy: {
        name: "asc",
      },
      select: PUBLISHER_SELECT,
    });
  }

  async findPublisherById(id: string, db?: DbClient): Promise<AdminPublisherRecord | null> {
    const client = await getDb(db);

    return client.publisher.findUnique({
      where: { id },
      select: PUBLISHER_SELECT,
    });
  }

  async findPublisherBySlug(slug: string, db?: DbClient): Promise<AdminPublisherRecord | null> {
    const client = await getDb(db);

    return client.publisher.findUnique({
      where: { slug },
      select: PUBLISHER_SELECT,
    });
  }

  async createPublisher(
    input: Prisma.PublisherCreateInput,
    db?: DbClient,
  ): Promise<AdminPublisherRecord> {
    const client = await getDb(db);

    return client.publisher.create({
      data: input,
      select: PUBLISHER_SELECT,
    });
  }

  async updatePublisher(
    id: string,
    input: Prisma.PublisherUpdateInput,
    db?: DbClient,
  ): Promise<AdminPublisherRecord> {
    const client = await getDb(db);

    return client.publisher.update({
      where: { id },
      data: input,
      select: PUBLISHER_SELECT,
    });
  }

  async deletePublisher(id: string, db?: DbClient): Promise<void> {
    const client = await getDb(db);
    await client.publisher.delete({
      where: { id },
    });
  }

  async listCategories(db?: DbClient): Promise<AdminCategoryRecord[]> {
    const client = await getDb(db);

    return client.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: CATEGORY_SELECT,
    });
  }

  async findCategoryById(id: string, db?: DbClient): Promise<AdminCategoryRecord | null> {
    const client = await getDb(db);

    return client.category.findUnique({
      where: { id },
      select: CATEGORY_SELECT,
    });
  }

  async findCategoryBySlug(slug: string, db?: DbClient): Promise<AdminCategoryRecord | null> {
    const client = await getDb(db);

    return client.category.findUnique({
      where: { slug },
      select: CATEGORY_SELECT,
    });
  }

  async createCategory(
    input: Prisma.CategoryCreateInput,
    db?: DbClient,
  ): Promise<AdminCategoryRecord> {
    const client = await getDb(db);

    return client.category.create({
      data: input,
      select: CATEGORY_SELECT,
    });
  }

  async updateCategory(
    id: string,
    input: Prisma.CategoryUpdateInput,
    db?: DbClient,
  ): Promise<AdminCategoryRecord> {
    const client = await getDb(db);

    return client.category.update({
      where: { id },
      data: input,
      select: CATEGORY_SELECT,
    });
  }

  async deleteCategory(id: string, db?: DbClient): Promise<void> {
    const client = await getDb(db);
    await client.category.delete({
      where: { id },
    });
  }

  async listBooks(params: {
    q?: string;
    publishStatus?: Prisma.BookWhereInput["publishStatus"];
    availabilityStatus?: Prisma.BookWhereInput["availabilityStatus"];
  } = {}, db?: DbClient): Promise<AdminBookRecord[]> {
    const client = await getDb(db);

    return client.book.findMany({
      where: {
        ...(params.q
          ? {
              OR: [
                { title: { contains: params.q, mode: "insensitive" } },
                { slug: { contains: params.q, mode: "insensitive" } },
                { isbn: { contains: params.q, mode: "insensitive" } },
                {
                  author: {
                    is: {
                      name: {
                        contains: params.q,
                        mode: "insensitive",
                      },
                    },
                  },
                },
              ],
            }
          : {}),
        ...(params.publishStatus ? { publishStatus: params.publishStatus } : {}),
        ...(params.availabilityStatus ? { availabilityStatus: params.availabilityStatus } : {}),
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      select: BOOK_SELECT,
    });
  }

  async findBookById(id: string, db?: DbClient): Promise<AdminBookRecord | null> {
    const client = await getDb(db);

    return client.book.findUnique({
      where: { id },
      select: BOOK_SELECT,
    });
  }

  async findBookBySlug(slug: string, db?: DbClient): Promise<AdminBookRecord | null> {
    const client = await getDb(db);

    return client.book.findUnique({
      where: { slug },
      select: BOOK_SELECT,
    });
  }

  async findBookByIsbn(isbn: string, db?: DbClient): Promise<AdminBookRecord | null> {
    const client = await getDb(db);

    return client.book.findUnique({
      where: { isbn },
      select: BOOK_SELECT,
    });
  }

  async createBook(
    input: Prisma.BookCreateInput | Prisma.BookUncheckedCreateInput,
    db?: DbClient,
  ): Promise<AdminBookRecord> {
    const client = await getDb(db);

    return client.book.create({
      data: input,
      select: BOOK_SELECT,
    });
  }

  async updateBook(
    id: string,
    input: Prisma.BookUpdateInput | Prisma.BookUncheckedUpdateInput,
    db?: DbClient,
  ): Promise<AdminBookRecord> {
    const client = await getDb(db);

    return client.book.update({
      where: { id },
      data: input,
      select: BOOK_SELECT,
    });
  }

  async replaceBookCategories(
    bookId: string,
    categoryIds: string[],
    primaryCategoryId?: string,
    db?: DbClient,
  ): Promise<void> {
    const client = await getDb(db);

    await client.bookCategory.deleteMany({
      where: {
        bookId,
      },
    });

    if (categoryIds.length === 0) {
      return;
    }

    await client.bookCategory.createMany({
      data: categoryIds.map((categoryId, index) => ({
        bookId,
        categoryId,
        position: index + 1,
        isPrimary: primaryCategoryId ? primaryCategoryId === categoryId : index === 0,
      })),
    });
  }

  async deleteBook(id: string, db?: DbClient): Promise<void> {
    const client = await getDb(db);
    await client.book.delete({
      where: { id },
    });
  }

  async listCollections(db?: DbClient): Promise<AdminCollectionRecord[]> {
    const client = await getDb(db);

    return client.collection.findMany({
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
      select: COLLECTION_SELECT,
    });
  }

  async findCollectionById(id: string, db?: DbClient): Promise<AdminCollectionRecord | null> {
    const client = await getDb(db);

    return client.collection.findUnique({
      where: { id },
      select: COLLECTION_SELECT,
    });
  }

  async findCollectionBySlug(slug: string, db?: DbClient): Promise<AdminCollectionRecord | null> {
    const client = await getDb(db);

    return client.collection.findUnique({
      where: { slug },
      select: COLLECTION_SELECT,
    });
  }

  async createCollection(
    input: Prisma.CollectionCreateInput,
    db?: DbClient,
  ): Promise<AdminCollectionRecord> {
    const client = await getDb(db);

    return client.collection.create({
      data: input,
      select: COLLECTION_SELECT,
    });
  }

  async updateCollection(
    id: string,
    input: Prisma.CollectionUpdateInput,
    db?: DbClient,
  ): Promise<AdminCollectionRecord> {
    const client = await getDb(db);

    return client.collection.update({
      where: { id },
      data: input,
      select: COLLECTION_SELECT,
    });
  }

  async replaceCollectionItems(
    collectionId: string,
    bookIds: string[],
    db?: DbClient,
  ): Promise<void> {
    const client = await getDb(db);

    await client.collectionItem.deleteMany({
      where: { collectionId },
    });

    if (bookIds.length === 0) {
      return;
    }

    await client.collectionItem.createMany({
      data: bookIds.map((bookId, index) => ({
        collectionId,
        bookId,
        position: index + 1,
      })),
    });
  }

  async deleteCollection(id: string, db?: DbClient): Promise<void> {
    const client = await getDb(db);
    await client.collection.delete({
      where: { id },
    });
  }

  async listImportJobs(db?: DbClient): Promise<AdminImportJobRecord[]> {
    const client = await getDb(db);

    return client.contentImportJob.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: IMPORT_JOB_SELECT,
    });
  }

  async findImportJobById(id: string, db?: DbClient): Promise<AdminImportJobRecord | null> {
    const client = await getDb(db);

    return client.contentImportJob.findUnique({
      where: { id },
      select: IMPORT_JOB_SELECT,
    });
  }

  async createImportJob(
    input: Prisma.ContentImportJobCreateInput,
    db?: DbClient,
  ): Promise<AdminImportJobRecord> {
    const client = await getDb(db);

    return client.contentImportJob.create({
      data: input,
      select: IMPORT_JOB_SELECT,
    });
  }

  async updateImportJob(
    id: string,
    input:
      | Prisma.ContentImportJobUpdateInput
      | Prisma.ContentImportJobUncheckedUpdateInput,
    db?: DbClient,
  ): Promise<AdminImportJobRecord> {
    const client = await getDb(db);

    return client.contentImportJob.update({
      where: { id },
      data: input,
      select: IMPORT_JOB_SELECT,
    });
  }

  async listStagedBooks(params: {
    status?: Prisma.StagedBookWhereInput["status"];
    q?: string;
  } = {}, db?: DbClient): Promise<AdminStagedBookRecord[]> {
    const client = await getDb(db);

    return client.stagedBook.findMany({
      where: {
        ...(params.q
          ? {
              OR: [
                { title: { contains: params.q, mode: "insensitive" } },
                { authorName: { contains: params.q, mode: "insensitive" } },
                { publisherName: { contains: params.q, mode: "insensitive" } },
                { sourceRecordId: { contains: params.q, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(params.status ? { status: params.status } : {}),
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      select: STAGED_BOOK_SELECT,
    });
  }

  async findStagedBookById(
    id: string,
    db?: DbClient,
  ): Promise<AdminStagedBookRecord | null> {
    const client = await getDb(db);

    return client.stagedBook.findUnique({
      where: { id },
      select: STAGED_BOOK_SELECT,
    });
  }

  async createStagedBook(
    input: Prisma.StagedBookCreateInput | Prisma.StagedBookUncheckedCreateInput,
    db?: DbClient,
  ): Promise<AdminStagedBookRecord> {
    const client = await getDb(db);

    return client.stagedBook.create({
      data: input,
      select: STAGED_BOOK_SELECT,
    });
  }

  async updateStagedBook(
    id: string,
    input: Prisma.StagedBookUpdateInput | Prisma.StagedBookUncheckedUpdateInput,
    db?: DbClient,
  ): Promise<AdminStagedBookRecord> {
    const client = await getDb(db);

    return client.stagedBook.update({
      where: { id },
      data: input,
      select: STAGED_BOOK_SELECT,
    });
  }
}
