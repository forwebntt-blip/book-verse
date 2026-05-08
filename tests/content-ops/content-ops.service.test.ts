import test from "node:test";
import assert from "node:assert/strict";

import { AppError } from "../../src/shared/errors/app-error";
import { STAGED_BOOK_STATUS } from "../../src/shared/contracts";
import { ContentOpsService } from "../../src/modules/content-ops/content-ops.service";

function makeStagedBook(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "staged-1",
    importJobId: "job-1",
    reviewerUserId: null,
    mappedBookId: null,
    sourceRecordId: "crawl-1",
    sourceUrl: "https://example.com/books/1",
    status: STAGED_BOOK_STATUS.IMPORTED,
    title: " Dac Nhan Tam ",
    authorName: " Dale Carnegie ",
    publisherName: " Alpha Books ",
    isbn: "9786041234567",
    priceAmount: 150000,
    compareAtAmount: 180000,
    coverImageUrl: "https://example.com/dac-nhan-tam.jpg",
    shortDescription: " Sach ky nang ",
    description: " Ban staging ",
    keywords: ["ky nang", " giao tiep "],
    rawPayload: {
      title: "Dac Nhan Tam",
    },
    normalizedPayload: null,
    rejectReason: null,
    reviewedAt: null,
    publishedAt: null,
    createdAt: new Date("2026-05-05T00:00:00.000Z"),
    updatedAt: new Date("2026-05-05T00:00:00.000Z"),
    ...overrides,
  };
}

test("normalizeStagedBook derives normalized payload and moves item to review", async () => {
  const updates: Array<Record<string, unknown>> = [];
  const stagedBook = makeStagedBook();
  const service = new ContentOpsService({
    repository: {
      findStagedBookById: async () => stagedBook,
      updateStagedBook: async (_id, data) => {
        updates.push(data as unknown as Record<string, unknown>);
        return {
          ...stagedBook,
          ...data,
        };
      },
    } as never,
    runInTransaction: async (work) => work(undefined as never),
  });

  const updated = await service.normalizeStagedBook({
    stagedBookId: "staged-1",
    reviewerUserId: "admin-1",
  });

  assert.equal(updated.status, STAGED_BOOK_STATUS.IN_REVIEW);
  assert.equal(updated.reviewerUserId, "admin-1");
  assert.equal(
    (updates[0]?.normalizedPayload as Record<string, unknown>)?.slug,
    "dac-nhan-tam",
  );
});

test("publishStagedBook rejects records that have not been approved", async () => {
  const service = new ContentOpsService({
    repository: {
      findStagedBookById: async () =>
        makeStagedBook({
          status: STAGED_BOOK_STATUS.IN_REVIEW,
        }),
    } as never,
    runInTransaction: async (work) => work(undefined as never),
  });

  await assert.rejects(
    () =>
      service.publishStagedBook({
        stagedBookId: "staged-1",
        reviewerUserId: "admin-1",
      }),
    (error: unknown) =>
      error instanceof AppError && error.code === "STAGED_BOOK_NOT_APPROVED",
  );
});

test("publishStagedBook creates a mapped book and marks staged content as published", async () => {
  const createdBooks: Array<Record<string, unknown>> = [];
  const stagedBook = makeStagedBook({
    status: STAGED_BOOK_STATUS.APPROVED,
    normalizedPayload: {
      slug: "dac-nhan-tam",
      title: "Dac Nhan Tam",
      authorName: "Dale Carnegie",
      publisherName: "Alpha Books",
      priceAmount: 150000,
      compareAtAmount: 180000,
      shippingFeeAmount: 30000,
      inventoryQuantity: 12,
      publishStatus: "PUBLISHED",
      availabilityStatus: "IN_STOCK",
      keywords: ["ky nang", "giao tiep"],
      metadata: {
        source: "crawler",
      },
    },
  });

  const service = new ContentOpsService({
    repository: {
      findStagedBookById: async () => stagedBook,
      findBookById: async () => null,
      findBookByIsbn: async () => null,
      findBookBySlug: async () => null,
      findAuthorBySlug: async () => null,
      findPublisherBySlug: async () => null,
      createAuthor: async (input) => ({
        id: "author-1",
        slug: input.slug,
        name: input.name,
      }),
      createPublisher: async (input) => ({
        id: "publisher-1",
        slug: input.slug,
        name: input.name,
      }),
      createBook: async (input) => {
        createdBooks.push(input as unknown as Record<string, unknown>);
        return {
          id: "book-1",
          slug: input.slug,
          title: input.title,
        };
      },
      updateStagedBook: async (_id, data) => ({
        ...stagedBook,
        ...data,
      }),
    } as never,
    runInTransaction: async (work) => work(undefined as never),
  });

  const published = await service.publishStagedBook({
    stagedBookId: "staged-1",
    reviewerUserId: "admin-1",
  });

  assert.equal(createdBooks[0]?.slug, "dac-nhan-tam");
  assert.equal(createdBooks[0]?.authorId, "author-1");
  assert.equal(createdBooks[0]?.publisherId, "publisher-1");
  assert.equal(published.status, STAGED_BOOK_STATUS.PUBLISHED);
  assert.equal(published.mappedBookId, "book-1");
});
