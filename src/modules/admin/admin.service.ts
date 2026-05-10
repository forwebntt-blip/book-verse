import { AdminPermission, PaymentStatus as PrismaPaymentStatus, PublishStatus } from "../../generated/prisma/enums.js";
import {
  ADMIN_PERMISSIONS,
  AVAILABILITY_STATUS,
  ORDER_STATUS,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  PUBLISH_STATUS,
} from "../../shared/contracts";
import { withDbTransaction } from "../../shared/database/repository";
import { AppError } from "../../shared/errors/app-error";
import { logger } from "../../shared/utils/logger";
import {
  AdminRepository,
  type AdminAuthorRecord,
  type AdminBookRecord,
  type AdminCategoryRecord,
  type AdminCollectionRecord,
  type AdminOrderRecord,
  type AdminPublisherRecord,
} from "./admin.repository";
import { CheckoutService } from "../checkout/checkout.service";
import type {
  AdminCatalogPageModel,
  AdminDashboardPageModel,
  AdminOrderViewModel,
  ParsedAdminOrderCancelPayload,
  ParsedAdminOrderNotePayload,
  ParsedAdminOrderPaymentPayload,
  ParsedAdminOrderStatusPayload,
  ParsedAdminListQuery,
  ParsedAuthorPayload,
  ParsedBookPayload,
  ParsedBookStatusPayload,
  ParsedCategoryPayload,
  ParsedCollectionPayload,
  ParsedPublisherPayload,
} from "./admin.types";

function toPrismaJsonObject(
  value?: Record<string, unknown>,
): import("../../generated/prisma/client.js").Prisma.InputJsonValue | undefined {
  return value as import("../../generated/prisma/client.js").Prisma.InputJsonValue | undefined;
}

function toIsoDateInput(value?: Date | null): string | undefined {
  if (!value) {
    return undefined;
  }

  return value.toISOString().slice(0, 10);
}

function requirePermission(permission?: AdminPermission) {
  if (!permission) {
    return;
  }

  if (!Object.values(ADMIN_PERMISSIONS).includes(permission)) {
    throw new AppError({
      statusCode: 500,
      code: "INVALID_ADMIN_PERMISSION",
      message: "Admin permission configuration is invalid.",
      expose: false,
    });
  }
}

interface AdminServiceDependencies {
  repository?: Pick<
    AdminRepository,
    | "createAuthor"
    | "createBook"
    | "createCategory"
    | "createCollection"
    | "createPublisher"
    | "deleteAuthor"
    | "deleteBook"
    | "deleteCategory"
    | "deleteCollection"
    | "deletePublisher"
    | "findAuthorById"
    | "findAuthorBySlug"
    | "findBookById"
    | "findBookByIsbn"
    | "findBookBySlug"
    | "findCategoryById"
    | "findCategoryBySlug"
    | "findCollectionById"
    | "findCollectionBySlug"
    | "findOrderByOrderNumber"
    | "findPublisherById"
    | "findPublisherBySlug"
    | "listAuthors"
    | "listBooks"
    | "listCategories"
    | "listCollections"
    | "listImportJobs"
    | "listOrders"
    | "listPublishers"
    | "listStagedBooks"
    | "replaceBookCategories"
    | "replaceCollectionItems"
    | "updateAuthor"
    | "updateBook"
    | "updateCategory"
    | "updateCollection"
    | "updateLatestPaymentRecordForOrder"
    | "updateOrder"
    | "updatePublisher"
  >;
  runInTransaction?: typeof withDbTransaction;
  checkoutService?: Pick<
    CheckoutService,
    "cancelOrder" | "markBankTransferReceived"
  >;
}

const ORDER_STATUS_TRANSITIONS = {
  [ORDER_STATUS.PLACED]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.AWAITING_TRANSFER]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.PACKED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PACKED]: [ORDER_STATUS.SHIPPED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.SHIPPED]: [ORDER_STATUS.DELIVERED],
  [ORDER_STATUS.DELIVERED]: [],
  [ORDER_STATUS.CANCELLED]: [],
} as const;

export class AdminService {
  private readonly repository: NonNullable<AdminServiceDependencies["repository"]>;
  private readonly runInTransaction: NonNullable<AdminServiceDependencies["runInTransaction"]>;
  private readonly checkoutService: NonNullable<AdminServiceDependencies["checkoutService"]>;

  constructor(dependencies: AdminServiceDependencies = {}) {
    this.repository = dependencies.repository ?? new AdminRepository();
    this.runInTransaction = dependencies.runInTransaction ?? withDbTransaction;
    this.checkoutService = dependencies.checkoutService ?? new CheckoutService();
  }

  private ensureUniqueSlug(
    record:
      | AdminAuthorRecord
      | AdminPublisherRecord
      | AdminCategoryRecord
      | AdminBookRecord
      | AdminCollectionRecord
      | null,
    entity: string,
    currentId?: string,
  ): void {
    if (record && record.id !== currentId) {
      throw new AppError({
        statusCode: 409,
        code: `${entity.toUpperCase()}_SLUG_CONFLICT`,
        message: `Slug đã tồn tại cho ${entity}.`,
      });
    }
  }

  private ensureBookPayloadConsistency(payload: ParsedBookPayload): void {
    if (
      typeof payload.compareAtAmount === "number" &&
      payload.compareAtAmount < payload.priceAmount
    ) {
      throw new AppError({
        statusCode: 400,
        code: "INVALID_ADMIN_PAYLOAD",
        message: "compareAtAmount không được nhỏ hơn priceAmount.",
      });
    }

    if (
      payload.publishStatus === PUBLISH_STATUS.PUBLISHED &&
      payload.categoryIds.length === 0
    ) {
      throw new AppError({
        statusCode: 409,
        code: "BOOK_CATEGORY_REQUIRED",
        message: "Sach cần có một category trước khi publish.",
      });
    }
  }

  private mapOrderRecord(record: AdminOrderRecord): AdminOrderViewModel {
    return {
      id: record.id,
      orderNumber: record.orderNumber,
      status: record.status,
      paymentStatus: record.paymentStatus,
      paymentMethod: record.paymentMethod,
      itemCount: record.itemCount,
      totalAmount: record.totalAmount,
      customerFullName: record.customerFullName,
      customerPhoneNumber: record.customerPhoneNumber,
      customerEmail: record.customerEmail,
      internalNote: record.internalNote,
      cancellationReason: record.cancellationReason,
      placedAt: record.placedAt.toISOString(),
      confirmedAt: record.confirmedAt?.toISOString(),
      packedAt: record.packedAt?.toISOString(),
      shippedAt: record.shippedAt?.toISOString(),
      deliveredAt: record.deliveredAt?.toISOString(),
      cancelledAt: record.cancelledAt?.toISOString(),
      address: record.address
        ? {
            recipientName: record.address.recipientName,
            phoneNumber: record.address.phoneNumber,
            addressLine1: record.address.addressLine1,
            ward: record.address.ward,
            district: record.address.district,
            province: record.address.province,
            note: record.address.note,
          }
        : null,
      items: record.items.map((item) => ({
        id: item.id,
        bookSlug: item.bookSlug,
        bookTitle: item.bookTitle,
        authorName: item.authorName,
        publisherName: item.publisherName,
        quantity: item.quantity,
        unitPriceAmount: item.unitPriceAmount,
        lineSubtotalAmount: item.lineSubtotalAmount,
      })),
      payments: record.paymentRecords.map((payment) => ({
        id: payment.id,
        status: payment.status,
        method: payment.method,
        amount: payment.amount,
        attemptNumber: payment.attemptNumber,
        externalReference: payment.externalReference,
        proofUrl: payment.proofUrl,
        note: payment.note,
        paidAt: payment.paidAt?.toISOString(),
        verifiedAt: payment.verifiedAt?.toISOString(),
        failedAt: payment.failedAt?.toISOString(),
      })),
    };
  }

  private ensureValidOrderStatusTransition(currentStatus: AdminOrderRecord["status"], nextStatus: ParsedAdminOrderStatusPayload["status"]): void {
    if (currentStatus === nextStatus) {
      return;
    }

    const allowed = ORDER_STATUS_TRANSITIONS[currentStatus] as readonly string[];
    if (!allowed.includes(nextStatus)) {
      throw new AppError({
        statusCode: 409,
        code: "INVALID_ORDER_TRANSITION",
        message: `Khong the chuyen order tu ${currentStatus} sang ${nextStatus}.`,
      });
    }
  }

  private buildOrderStatusUpdateData(status: ParsedAdminOrderStatusPayload["status"]) {
    const now = new Date();

    switch (status) {
      case ORDER_STATUS.CONFIRMED:
        return {
          status,
          confirmedAt: now,
        };
      case ORDER_STATUS.PACKED:
        return {
          status,
          packedAt: now,
        };
      case ORDER_STATUS.SHIPPED:
        return {
          status,
          shippedAt: now,
        };
      case ORDER_STATUS.DELIVERED:
        return {
          status,
          deliveredAt: now,
        };
      case ORDER_STATUS.CANCELLED:
        return {
          status,
          cancelledAt: now,
        };
      default:
        return {
          status,
        };
    }
  }

  async buildDashboardPageModel(): Promise<AdminDashboardPageModel> {
    const [books, categories, collections, jobs, stagedBooks] = await Promise.all([
      this.repository.listBooks(),
      this.repository.listCategories(),
      this.repository.listCollections(),
      this.repository.listImportJobs(),
      this.repository.listStagedBooks(),
    ]);

    return {
      title: "Bảng điều khiển quản trị",
      description: "Bảng điều khiển cho quản lý danh mục và quy trình duyệt nội dung.",
      pageHeading: "Bảng điều khiển quản trị",
      pageLead:
        "Theo dõi tình trạng danh mục, luồng nhập dữ liệu và các bản ghi đang chờ duyệt trước khi xuất bản.",
      stats: [
        {
          label: "Sách trong danh mục",
          value: String(books.length),
          note: `${books.filter((book) => book.publishStatus === PublishStatus.PUBLISHED).length} đang được xuất bản`,
        },
        {
          label: "Danh mục",
          value: String(categories.length),
          note: `${categories.filter((category) => category.isFeatured).length} đang được ghim`,
        },
        {
          label: "Bộ sưu tập",
          value: String(collections.length),
          note: `${collections.filter((collection) => collection.publishStatus === PublishStatus.PUBLISHED).length} đang hiển thị`,
        },
        {
          label: "Bản ghi chờ duyệt",
          value: String(stagedBooks.length),
          note: `${stagedBooks.filter((item) => item.status !== "PUBLISHED").length} cần tiếp tục xử lý`,
        },
      ],
      quickLinks: [
        {
          label: "Quản lý danh mục",
          href: "/admin/catalog",
          note: "Tạo sách thủ công, sửa metadata, cập nhật trạng thái và quản lý bộ sưu tập.",
        },
      ],
      recentImports: jobs.slice(0, 5).map((job) => ({
        id: job.id,
        source: job.source,
        status: job.status,
        totalRecords: job.totalRecords,
        successfulRecords: job.successfulRecords,
        failedRecords: job.failedRecords,
      })),
      stagingSummary: [
        {
          label: "Đã nhập",
          value: String(stagedBooks.filter((item) => item.status === "IMPORTED").length),
        },
        {
          label: "Đang duyệt",
          value: String(stagedBooks.filter((item) => item.status === "IN_REVIEW").length),
        },
        {
          label: "Đã duyệt",
          value: String(stagedBooks.filter((item) => item.status === "APPROVED").length),
        },
        {
          label: "Đã từ chối",
          value: String(stagedBooks.filter((item) => item.status === "REJECTED").length),
        },
      ],
    };
  }

  async buildCatalogPageModel(
    query: ParsedAdminListQuery,
    options: {
      editAuthorId?: string;
      editPublisherId?: string;
      editCategoryId?: string;
      editBookId?: string;
      editCollectionId?: string;
    } = {},
  ): Promise<AdminCatalogPageModel> {
    const [
      books,
      authors,
      publishers,
      categories,
      collections,
      editingAuthor,
      editingPublisher,
      editingCategory,
      editingBook,
      editingCollection,
    ] =
      await Promise.all([
        this.repository.listBooks({
          q: query.q,
          publishStatus: query.publishStatus,
          availabilityStatus: query.availabilityStatus,
        }),
        this.repository.listAuthors(),
        this.repository.listPublishers(),
        this.repository.listCategories(),
        this.repository.listCollections(),
        options.editAuthorId ? this.repository.findAuthorById(options.editAuthorId) : null,
        options.editPublisherId ? this.repository.findPublisherById(options.editPublisherId) : null,
        options.editCategoryId ? this.repository.findCategoryById(options.editCategoryId) : null,
        options.editBookId ? this.repository.findBookById(options.editBookId) : null,
        options.editCollectionId
          ? this.repository.findCollectionById(options.editCollectionId)
          : null,
      ]);

    return {
      title: "Quản trị danh mục",
      description: "Tạo, sửa, xóa thực thể danh mục và điều chỉnh trạng thái xuất bản / tình trạng còn hàng.",
      pageHeading: "Quản lý danh mục",
      pageLead:
        "Tại một nơi, đội ngũ có thể tạo sách thủ công, quản lý quan hệ tác giả / nhà xuất bản / danh mục và kiểm soát luồng xuất bản bộ sưu tập.",
      entities: {
        books: books.map((book) => ({
          id: book.id,
          slug: book.slug,
          title: book.title,
          authorName: book.author.name,
          publisherName: book.publisher.name,
          publishStatus: book.publishStatus,
          availabilityStatus: book.availabilityStatus,
          priceAmount: book.priceAmount,
          inventoryQuantity: book.inventoryQuantity,
        })),
        authors: authors.map((author) => ({
          id: author.id,
          slug: author.slug,
          name: author.name,
          biography: author.biography,
        })),
        publishers: publishers.map((publisher) => ({
          id: publisher.id,
          slug: publisher.slug,
          name: publisher.name,
          description: publisher.description,
        })),
        categories: categories.map((category) => ({
          id: category.id,
          slug: category.slug,
          name: category.name,
          description: category.description,
          isFeatured: category.isFeatured,
          sortOrder: category.sortOrder,
        })),
        collections: collections.map((collection) => ({
          id: collection.id,
          slug: collection.slug,
          name: collection.name,
          description: collection.description,
          coverImageUrl: collection.coverImageUrl,
          isFeatured: collection.isFeatured,
          publishStatus: collection.publishStatus,
          itemCount: collection.items.length,
          bookIds: collection.items.map((item) => item.book.id),
        })),
      },
      filters: {
        searchQuery: query.q ?? "",
        publishStatus: query.publishStatus,
        availabilityStatus: query.availabilityStatus,
      },
      editingAuthor: editingAuthor
        ? {
            id: editingAuthor.id,
            slug: editingAuthor.slug,
            name: editingAuthor.name,
            biography: editingAuthor.biography,
          }
        : null,
      editingPublisher: editingPublisher
        ? {
            id: editingPublisher.id,
            slug: editingPublisher.slug,
            name: editingPublisher.name,
            description: editingPublisher.description,
          }
        : null,
      editingCategory: editingCategory
        ? {
            id: editingCategory.id,
            slug: editingCategory.slug,
            name: editingCategory.name,
            description: editingCategory.description,
            isFeatured: editingCategory.isFeatured,
            sortOrder: editingCategory.sortOrder,
          }
        : null,
      editingBook: editingBook
        ? {
            id: editingBook.id,
            slug: editingBook.slug,
            title: editingBook.title,
            subtitle: editingBook.subtitle,
            shortDescription: editingBook.shortDescription,
            description: editingBook.description,
            coverImageUrl: editingBook.coverImageUrl,
            authorId: editingBook.authorId,
            publisherId: editingBook.publisherId,
            publishStatus: editingBook.publishStatus,
            availabilityStatus: editingBook.availabilityStatus,
            priceAmount: editingBook.priceAmount,
            compareAtAmount: editingBook.compareAtAmount,
            shippingFeeAmount: editingBook.shippingFeeAmount,
            pageCount: editingBook.pageCount,
            languageCode: editingBook.languageCode,
            isbn: editingBook.isbn,
            inventoryQuantity: editingBook.inventoryQuantity,
            sortWeight: editingBook.sortWeight,
            isFeatured: editingBook.isFeatured,
            isBestseller: editingBook.isBestseller,
            isRecommended: editingBook.isRecommended,
            keywords: editingBook.keywords,
            categoryIds: editingBook.bookCategories.map((item) => item.category.id),
            primaryCategoryId:
              editingBook.bookCategories.find((item) => item.isPrimary)?.category.id ??
              editingBook.bookCategories[0]?.category.id,
            metadata: editingBook.metadata
              ? JSON.stringify(editingBook.metadata, null, 2)
              : undefined,
          }
        : null,
      editingCollection: editingCollection
        ? {
            id: editingCollection.id,
            slug: editingCollection.slug,
            name: editingCollection.name,
            description: editingCollection.description,
            coverImageUrl: editingCollection.coverImageUrl,
            publishStatus: editingCollection.publishStatus,
            isFeatured: editingCollection.isFeatured,
            sortOrder: editingCollection.sortOrder,
            bookIds: editingCollection.items.map((item) => item.book.id),
          }
        : null,
    };
  }

  async listOrders(query: ParsedAdminListQuery): Promise<AdminOrderViewModel[]> {
    const orders = await this.repository.listOrders({
      q: query.q,
      orderStatus: query.orderStatus,
      paymentStatus: query.paymentStatus,
    });

    return orders.map((order) => this.mapOrderRecord(order));
  }

  async getOrder(orderNumber: string): Promise<AdminOrderViewModel> {
    const order = await this.repository.findOrderByOrderNumber(orderNumber);

    if (!order) {
      throw new AppError({
        statusCode: 404,
        code: "ORDER_NOT_FOUND",
        message: "Khong tim thay don hang.",
      });
    }

    return this.mapOrderRecord(order);
  }

  async updateOrderStatus(
    orderNumber: string,
    payload: ParsedAdminOrderStatusPayload,
    actorUserId: string,
  ): Promise<AdminOrderViewModel> {
    const order = await this.repository.findOrderByOrderNumber(orderNumber);

    if (!order) {
      throw new AppError({
        statusCode: 404,
        code: "ORDER_NOT_FOUND",
        message: "Khong tim thay don hang can cap nhat.",
      });
    }

    this.ensureValidOrderStatusTransition(order.status, payload.status);

    if (
      payload.status === ORDER_STATUS.CONFIRMED &&
      order.paymentMethod === PAYMENT_METHOD.BANK_TRANSFER &&
      order.paymentStatus !== PAYMENT_STATUS.PAID
    ) {
      throw new AppError({
        statusCode: 409,
        code: "ORDER_PAYMENT_NOT_CONFIRMED",
        message: "Don chuyen khoan phai duoc xac nhan thanh toan truoc khi chuyen sang CONFIRMED.",
      });
    }

    const updated = await this.repository.updateOrder(
      orderNumber,
      this.buildOrderStatusUpdateData(payload.status),
    );

    this.logAdminAction("update_order_status", {
      actorUserId,
      orderNumber,
      fromStatus: order.status,
      toStatus: payload.status,
    });

    return this.mapOrderRecord(updated);
  }

  async cancelOrder(
    orderNumber: string,
    payload: ParsedAdminOrderCancelPayload,
    actorUserId: string,
  ): Promise<AdminOrderViewModel> {
    const updated = await this.checkoutService.cancelOrder({
      orderNumber,
      reason: payload.reason,
      requestContext: {
        requestId: `admin-cancel:${orderNumber}:${Date.now()}`,
        userId: actorUserId,
      },
    });

    this.logAdminAction("cancel_order", {
      actorUserId,
      orderNumber,
      reason: payload.reason ?? null,
    });

    const order = await this.repository.findOrderByOrderNumber(updated.orderNumber);
    if (!order) {
      throw new AppError({
        statusCode: 404,
        code: "ORDER_NOT_FOUND",
        message: "Khong tim thay don hang sau khi huy.",
      });
    }

    return this.mapOrderRecord(order);
  }

  async markBankTransferReceived(
    orderNumber: string,
    payload: ParsedAdminOrderPaymentPayload,
    actorUserId: string,
  ): Promise<AdminOrderViewModel> {
    if (payload.proofUrl) {
      const orderBeforeUpdate = await this.repository.findOrderByOrderNumber(orderNumber);
      if (!orderBeforeUpdate) {
        throw new AppError({
          statusCode: 404,
          code: "ORDER_NOT_FOUND",
          message: "Khong tim thay don hang can xac nhan chuyen khoan.",
        });
      }

      await this.repository.updateLatestPaymentRecordForOrder(orderBeforeUpdate.id, {
        proofUrl: payload.proofUrl,
      });
    }

    const updated = await this.checkoutService.markBankTransferReceived({
      orderNumber,
      externalReference: payload.externalReference,
      note: payload.note,
      requestContext: {
        requestId: `admin-payment:${orderNumber}:${Date.now()}`,
        userId: actorUserId,
      },
    });

    this.logAdminAction("mark_order_transfer_received", {
      actorUserId,
      orderNumber,
      externalReference: payload.externalReference ?? null,
      proofUrl: payload.proofUrl ?? null,
    });

    const order = await this.repository.findOrderByOrderNumber(updated.orderNumber);
    if (!order) {
      throw new AppError({
        statusCode: 404,
        code: "ORDER_NOT_FOUND",
        message: "Khong tim thay don hang sau khi xac nhan thanh toan.",
      });
    }

    return this.mapOrderRecord(order);
  }

  async updateOrderInternalNote(
    orderNumber: string,
    payload: ParsedAdminOrderNotePayload,
    actorUserId: string,
  ): Promise<AdminOrderViewModel> {
    const order = await this.repository.findOrderByOrderNumber(orderNumber);

    if (!order) {
      throw new AppError({
        statusCode: 404,
        code: "ORDER_NOT_FOUND",
        message: "Khong tim thay don hang can cap nhat ghi chu.",
      });
    }

    const updated = await this.repository.updateOrder(orderNumber, {
      internalNote: payload.internalNote ?? null,
    });

    this.logAdminAction("update_order_internal_note", {
      actorUserId,
      orderNumber,
      hasNote: Boolean(payload.internalNote),
    });

    return this.mapOrderRecord(updated);
  }

  private logAdminAction(action: string, metadata: Record<string, unknown>) {
    logger.info(`Admin action: ${action}`, {
      module: "admin",
      ...metadata,
    });
  }

  private normalizeDeleteFailure(error: unknown, entity: string): never {
    const code =
      error instanceof Error && "code" in error
        ? (error as Error & { code?: string }).code
        : undefined;

    if (code === "P2003") {
      throw new AppError({
        statusCode: 409,
        code: `${entity.toUpperCase()}_DELETE_BLOCKED`,
        message: `${entity} đang được tham chiếu bởi dữ liệu khác nên không thể xoá.`,
      });
    }

    throw error;
  }

  async createAuthor(payload: ParsedAuthorPayload, actorUserId?: string) {
    this.ensureUniqueSlug(await this.repository.findAuthorBySlug(payload.slug), "author");

    const author = await this.repository.createAuthor(payload);
    this.logAdminAction("create_author", { actorUserId, authorId: author.id, slug: author.slug });
    return author;
  }

  async updateAuthor(id: string, payload: ParsedAuthorPayload, actorUserId?: string) {
    this.ensureUniqueSlug(await this.repository.findAuthorBySlug(payload.slug), "author", id);
    const author = await this.repository.updateAuthor(id, payload);
    this.logAdminAction("update_author", { actorUserId, authorId: author.id, slug: author.slug });
    return author;
  }

  async deleteAuthor(id: string, actorUserId?: string) {
    try {
      await this.repository.deleteAuthor(id);
    } catch (error) {
      this.normalizeDeleteFailure(error, "author");
    }
    this.logAdminAction("delete_author", { actorUserId, authorId: id });
  }

  async createPublisher(payload: ParsedPublisherPayload, actorUserId?: string) {
    this.ensureUniqueSlug(await this.repository.findPublisherBySlug(payload.slug), "publisher");
    const publisher = await this.repository.createPublisher(payload);
    this.logAdminAction("create_publisher", {
      actorUserId,
      publisherId: publisher.id,
      slug: publisher.slug,
    });
    return publisher;
  }

  async updatePublisher(id: string, payload: ParsedPublisherPayload, actorUserId?: string) {
    this.ensureUniqueSlug(
      await this.repository.findPublisherBySlug(payload.slug),
      "publisher",
      id,
    );
    const publisher = await this.repository.updatePublisher(id, payload);
    this.logAdminAction("update_publisher", {
      actorUserId,
      publisherId: publisher.id,
      slug: publisher.slug,
    });
    return publisher;
  }

  async deletePublisher(id: string, actorUserId?: string) {
    try {
      await this.repository.deletePublisher(id);
    } catch (error) {
      this.normalizeDeleteFailure(error, "publisher");
    }
    this.logAdminAction("delete_publisher", { actorUserId, publisherId: id });
  }

  async createCategory(payload: ParsedCategoryPayload, actorUserId?: string) {
    this.ensureUniqueSlug(await this.repository.findCategoryBySlug(payload.slug), "category");
    const category = await this.repository.createCategory(payload);
    this.logAdminAction("create_category", {
      actorUserId,
      categoryId: category.id,
      slug: category.slug,
    });
    return category;
  }

  async updateCategory(id: string, payload: ParsedCategoryPayload, actorUserId?: string) {
    this.ensureUniqueSlug(
      await this.repository.findCategoryBySlug(payload.slug),
      "category",
      id,
    );
    const category = await this.repository.updateCategory(id, payload);
    this.logAdminAction("update_category", {
      actorUserId,
      categoryId: category.id,
      slug: category.slug,
    });
    return category;
  }

  async deleteCategory(id: string, actorUserId?: string) {
    try {
      await this.repository.deleteCategory(id);
    } catch (error) {
      this.normalizeDeleteFailure(error, "category");
    }
    this.logAdminAction("delete_category", { actorUserId, categoryId: id });
  }

  async createBook(payload: ParsedBookPayload, actorUserId?: string) {
    return this.runInTransaction(async (tx) => {
      this.ensureBookPayloadConsistency(payload);
      this.ensureUniqueSlug(await this.repository.findBookBySlug(payload.slug, tx), "book");

      if (payload.isbn) {
        const existingByIsbn = await this.repository.findBookByIsbn(payload.isbn, tx);

        if (existingByIsbn) {
          throw new AppError({
            statusCode: 409,
            code: "BOOK_ISBN_CONFLICT",
            message: "ISBN đã tồn tại trong catalog.",
          });
        }
      }

      const book = await this.repository.createBook(
        {
          slug: payload.slug,
          title: payload.title,
          subtitle: payload.subtitle,
          shortDescription: payload.shortDescription,
          description: payload.description,
          coverImageUrl: payload.coverImageUrl,
          authorId: payload.authorId,
          publisherId: payload.publisherId,
          publishStatus: payload.publishStatus,
          availabilityStatus: payload.availabilityStatus,
          priceAmount: payload.priceAmount,
          compareAtAmount: payload.compareAtAmount,
          shippingFeeAmount: payload.shippingFeeAmount,
          pageCount: payload.pageCount,
          languageCode: payload.languageCode,
          isbn: payload.isbn,
          publishedAt: payload.publishedAt ? new Date(payload.publishedAt) : undefined,
          inventoryQuantity: payload.inventoryQuantity,
          isFeatured: payload.isFeatured,
          isBestseller: payload.isBestseller,
          isRecommended: payload.isRecommended,
          sortWeight: payload.sortWeight,
          keywords: payload.keywords,
          metadata: toPrismaJsonObject(payload.metadata),
        },
        tx,
      );

      await this.repository.replaceBookCategories(
        book.id,
        payload.categoryIds,
        payload.primaryCategoryId,
        tx,
      );

      const hydratedBook = await this.repository.findBookById(book.id, tx);

      if (!hydratedBook) {
        throw new AppError({
          statusCode: 500,
          code: "BOOK_CREATE_FAILED",
          message: "Không tải nạp được sách sau khi tạo.",
          expose: false,
        });
      }

      this.logAdminAction("create_book", {
        actorUserId,
        bookId: hydratedBook.id,
        slug: hydratedBook.slug,
      });

      return hydratedBook;
    });
  }

  async updateBook(id: string, payload: ParsedBookPayload, actorUserId?: string) {
    return this.runInTransaction(async (tx) => {
      this.ensureBookPayloadConsistency(payload);
      this.ensureUniqueSlug(await this.repository.findBookBySlug(payload.slug, tx), "book", id);

      if (payload.isbn) {
        const existingByIsbn = await this.repository.findBookByIsbn(payload.isbn, tx);

        if (existingByIsbn && existingByIsbn.id !== id) {
          throw new AppError({
            statusCode: 409,
            code: "BOOK_ISBN_CONFLICT",
            message: "ISBN đã tồn tại trong catalog.",
          });
        }
      }

      const book = await this.repository.updateBook(
        id,
        {
          slug: payload.slug,
          title: payload.title,
          subtitle: payload.subtitle,
          shortDescription: payload.shortDescription,
          description: payload.description,
          coverImageUrl: payload.coverImageUrl,
          authorId: payload.authorId,
          publisherId: payload.publisherId,
          publishStatus: payload.publishStatus,
          availabilityStatus: payload.availabilityStatus,
          priceAmount: payload.priceAmount,
          compareAtAmount: payload.compareAtAmount,
          shippingFeeAmount: payload.shippingFeeAmount,
          pageCount: payload.pageCount,
          languageCode: payload.languageCode,
          isbn: payload.isbn,
          publishedAt: payload.publishedAt ? new Date(payload.publishedAt) : null,
          inventoryQuantity: payload.inventoryQuantity,
          isFeatured: payload.isFeatured,
          isBestseller: payload.isBestseller,
          isRecommended: payload.isRecommended,
          sortWeight: payload.sortWeight,
          keywords: payload.keywords,
          metadata: toPrismaJsonObject(payload.metadata),
        },
        tx,
      );

      await this.repository.replaceBookCategories(
        book.id,
        payload.categoryIds,
        payload.primaryCategoryId,
        tx,
      );

      const hydratedBook = await this.repository.findBookById(book.id, tx);

      if (!hydratedBook) {
        throw new AppError({
          statusCode: 500,
          code: "BOOK_UPDATE_FAILED",
          message: "Không tải nạp được sách sau khi cập nhật.",
          expose: false,
        });
      }

      this.logAdminAction("update_book", {
        actorUserId,
        bookId: hydratedBook.id,
        slug: hydratedBook.slug,
      });

      return hydratedBook;
    });
  }

  async updateBookStatus(id: string, payload: ParsedBookStatusPayload, actorUserId?: string) {
    const book = await this.repository.updateBook(
      id,
      {
        ...(payload.publishStatus ? { publishStatus: payload.publishStatus } : {}),
        ...(payload.availabilityStatus
          ? { availabilityStatus: payload.availabilityStatus }
          : {}),
      },
    );

    this.logAdminAction("update_book_status", {
      actorUserId,
      bookId: book.id,
      publishStatus: book.publishStatus,
      availabilityStatus: book.availabilityStatus,
    });

    return book;
  }

  async deleteBook(id: string, actorUserId?: string) {
    try {
      await this.repository.deleteBook(id);
    } catch (error) {
      this.normalizeDeleteFailure(error, "book");
    }
    this.logAdminAction("delete_book", { actorUserId, bookId: id });
  }

  async createCollection(payload: ParsedCollectionPayload, actorUserId?: string) {
    return this.runInTransaction(async (tx) => {
      this.ensureUniqueSlug(
        await this.repository.findCollectionBySlug(payload.slug, tx),
        "collection",
      );

      const collection = await this.repository.createCollection(
        {
          slug: payload.slug,
          name: payload.name,
          description: payload.description,
          coverImageUrl: payload.coverImageUrl,
          publishStatus: payload.publishStatus,
          isFeatured: payload.isFeatured,
          sortOrder: payload.sortOrder,
        },
        tx,
      );

      await this.repository.replaceCollectionItems(collection.id, payload.bookIds, tx);

      const hydratedCollection = await this.repository.findCollectionById(collection.id, tx);

      if (!hydratedCollection) {
        throw new AppError({
          statusCode: 500,
          code: "COLLECTION_CREATE_FAILED",
          message: "Không tải nạp được collection sau khi tạo.",
          expose: false,
        });
      }

      this.logAdminAction("create_collection", {
        actorUserId,
        collectionId: hydratedCollection.id,
        slug: hydratedCollection.slug,
      });

      return hydratedCollection;
    });
  }

  async updateCollection(id: string, payload: ParsedCollectionPayload, actorUserId?: string) {
    return this.runInTransaction(async (tx) => {
      this.ensureUniqueSlug(
        await this.repository.findCollectionBySlug(payload.slug, tx),
        "collection",
        id,
      );

      const collection = await this.repository.updateCollection(
        id,
        {
          slug: payload.slug,
          name: payload.name,
          description: payload.description,
          coverImageUrl: payload.coverImageUrl,
          publishStatus: payload.publishStatus,
          isFeatured: payload.isFeatured,
          sortOrder: payload.sortOrder,
        },
        tx,
      );

      await this.repository.replaceCollectionItems(collection.id, payload.bookIds, tx);

      const hydratedCollection = await this.repository.findCollectionById(collection.id, tx);

      if (!hydratedCollection) {
        throw new AppError({
          statusCode: 500,
          code: "COLLECTION_UPDATE_FAILED",
          message: "Không tải nạp được collection sau khi cập nhật.",
          expose: false,
        });
      }

      this.logAdminAction("update_collection", {
        actorUserId,
        collectionId: hydratedCollection.id,
        slug: hydratedCollection.slug,
      });

      return hydratedCollection;
    });
  }

  async deleteCollection(id: string, actorUserId?: string) {
    try {
      await this.repository.deleteCollection(id);
    } catch (error) {
      this.normalizeDeleteFailure(error, "collection");
    }
    this.logAdminAction("delete_collection", { actorUserId, collectionId: id });
  }
}
