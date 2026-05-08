import test from "node:test";
import assert from "node:assert/strict";

import { AppError } from "../../src/shared/errors/app-error";
import { AdminService } from "../../src/modules/admin/admin.service";

function makeBookRecord(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "book-1",
    slug: "existing-book",
    title: "Existing Book",
    ...overrides,
  };
}

test("createBook rejects publishing without categories", async () => {
  const service = new AdminService({
    repository: {
      findBookBySlug: async () => null,
      findBookByIsbn: async () => null,
    } as never,
    runInTransaction: async (work) => work(undefined as never),
  });

  await assert.rejects(
    () =>
      service.createBook({
        slug: "sach-moi",
        title: "Sach moi",
        authorId: "author-1",
        publisherId: "publisher-1",
        publishStatus: "PUBLISHED",
        availabilityStatus: "IN_STOCK",
        priceAmount: 100000,
        shippingFeeAmount: 30000,
        inventoryQuantity: 5,
        isFeatured: false,
        isBestseller: false,
        isRecommended: false,
        sortWeight: 0,
        keywords: [],
        categoryIds: [],
      }),
    (error: unknown) =>
      error instanceof AppError && error.code === "BOOK_CATEGORY_REQUIRED",
  );
});

test("updateBook rejects duplicate ISBN on another book", async () => {
  const service = new AdminService({
    repository: {
      findBookBySlug: async () => null,
      findBookByIsbn: async () => makeBookRecord({ id: "book-2" }),
    } as never,
    runInTransaction: async (work) => work(undefined as never),
  });

  await assert.rejects(
    () =>
      service.updateBook("book-1", {
        slug: "sach-moi",
        title: "Sach moi",
        authorId: "author-1",
        publisherId: "publisher-1",
        publishStatus: "DRAFT",
        availabilityStatus: "IN_STOCK",
        priceAmount: 100000,
        shippingFeeAmount: 30000,
        inventoryQuantity: 5,
        isbn: "9786041234567",
        isFeatured: false,
        isBestseller: false,
        isRecommended: false,
        sortWeight: 0,
        keywords: [],
        categoryIds: ["cat-1"],
      }),
    (error: unknown) =>
      error instanceof AppError && error.code === "BOOK_ISBN_CONFLICT",
  );
});

test("deleteAuthor surfaces a business error when author is still referenced", async () => {
  const service = new AdminService({
    repository: {
      deleteAuthor: async () => {
        const error = new Error("foreign key");
        (error as Error & { code?: string }).code = "P2003";
        throw error;
      },
    } as never,
  });

  await assert.rejects(
    () => service.deleteAuthor("author-1"),
    (error: unknown) =>
      error instanceof AppError && error.code === "AUTHOR_DELETE_BLOCKED",
  );
});

test("deleteCategory surfaces a business error when category is still referenced", async () => {
  const service = new AdminService({
    repository: {
      deleteCategory: async () => {
        const error = new Error("foreign key");
        (error as Error & { code?: string }).code = "P2003";
        throw error;
      },
    } as never,
  });

  await assert.rejects(
    () => service.deleteCategory("category-1"),
    (error: unknown) =>
      error instanceof AppError && error.code === "CATEGORY_DELETE_BLOCKED",
  );
});
