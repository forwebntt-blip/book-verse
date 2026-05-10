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

test("updateOrderStatus rejects invalid transition from delivered back to packed", async () => {
  const service = new AdminService({
    repository: {
      findOrderByOrderNumber: async () =>
        ({
          id: "order-1",
          orderNumber: "ORD-1",
          status: "DELIVERED",
          paymentStatus: "PAID",
          paymentMethod: "COD",
          itemCount: 1,
          totalAmount: 100000,
          customerFullName: "A",
          customerPhoneNumber: "B",
          customerEmail: null,
          internalNote: null,
          cancellationReason: null,
          placedAt: new Date(),
          confirmedAt: new Date(),
          packedAt: new Date(),
          shippedAt: new Date(),
          deliveredAt: new Date(),
          cancelledAt: null,
          address: null,
          items: [],
          paymentRecords: [],
        }) as never,
    } as never,
  });

  await assert.rejects(
    () => service.updateOrderStatus("ORD-1", { status: "PACKED" }, "admin-1"),
    (error: unknown) =>
      error instanceof AppError && error.code === "INVALID_ORDER_TRANSITION",
  );
});

test("updateOrderStatus blocks confirming bank transfer order before payment is paid", async () => {
  const service = new AdminService({
    repository: {
      findOrderByOrderNumber: async () =>
        ({
          id: "order-1",
          orderNumber: "ORD-1",
          status: "AWAITING_TRANSFER",
          paymentStatus: "AWAITING_VERIFICATION",
          paymentMethod: "BANK_TRANSFER",
          itemCount: 1,
          totalAmount: 100000,
          customerFullName: "A",
          customerPhoneNumber: "B",
          customerEmail: null,
          internalNote: null,
          cancellationReason: null,
          placedAt: new Date(),
          confirmedAt: null,
          packedAt: null,
          shippedAt: null,
          deliveredAt: null,
          cancelledAt: null,
          address: null,
          items: [],
          paymentRecords: [],
        }) as never,
    } as never,
  });

  await assert.rejects(
    () => service.updateOrderStatus("ORD-1", { status: "CONFIRMED" }, "admin-1"),
    (error: unknown) =>
      error instanceof AppError && error.code === "ORDER_PAYMENT_NOT_CONFIRMED",
  );
});

test("updateOrderInternalNote persists note through repository update", async () => {
  const service = new AdminService({
    repository: {
      findOrderByOrderNumber: async () =>
        ({
          id: "order-1",
          orderNumber: "ORD-1",
          status: "PLACED",
          paymentStatus: "PENDING",
          paymentMethod: "COD",
          itemCount: 1,
          totalAmount: 100000,
          customerFullName: "A",
          customerPhoneNumber: "B",
          customerEmail: null,
          internalNote: null,
          cancellationReason: null,
          placedAt: new Date("2026-05-10T00:00:00.000Z"),
          confirmedAt: null,
          packedAt: null,
          shippedAt: null,
          deliveredAt: null,
          cancelledAt: null,
          address: null,
          items: [],
          paymentRecords: [],
        }) as never,
      updateOrder: async (_orderNumber: string, input: Record<string, unknown>) =>
        ({
          id: "order-1",
          orderNumber: "ORD-1",
          status: "PLACED",
          paymentStatus: "PENDING",
          paymentMethod: "COD",
          itemCount: 1,
          totalAmount: 100000,
          customerFullName: "A",
          customerPhoneNumber: "B",
          customerEmail: null,
          internalNote: input.internalNote,
          cancellationReason: null,
          placedAt: new Date("2026-05-10T00:00:00.000Z"),
          confirmedAt: null,
          packedAt: null,
          shippedAt: null,
          deliveredAt: null,
          cancelledAt: null,
          address: null,
          items: [],
          paymentRecords: [],
        }) as never,
    } as never,
  });

  const updated = await service.updateOrderInternalNote("ORD-1", { internalNote: "Call shipper before 5pm" }, "admin-1");

  assert.equal(updated.internalNote, "Call shipper before 5pm");
});
