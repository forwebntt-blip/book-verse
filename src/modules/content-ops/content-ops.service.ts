import type { Prisma } from "../../generated/prisma/client.js";
import {
  ContentImportJobStatus,
  PublishStatus,
  StagedBookStatus,
} from "../../generated/prisma/enums.js";
import {
  AVAILABILITY_STATUS,
  PUBLISH_STATUS,
  STAGED_BOOK_STATUS,
} from "../../shared/contracts";
import { withDbTransaction } from "../../shared/database/repository";
import { AppError } from "../../shared/errors/app-error";
import { logger } from "../../shared/utils/logger";
import { AdminRepository, type AdminStagedBookRecord } from "../admin/admin.repository";
import type { ParsedImportJobPayload } from "../admin/admin.types";
import { parseAdminListQuery } from "../admin/admin.query";

function toPrismaJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function compactText(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function uniqueKeywords(values: string[]): string[] {
  return Array.from(
    new Set(
      values
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

function toNormalizedPayload(stagedBook: AdminStagedBookRecord): Record<string, unknown> {
  const title = stagedBook.title.trim();
  const authorName = compactText(stagedBook.authorName);
  const publisherName = compactText(stagedBook.publisherName);
  const slug = slugify(title);
  const inventoryQuantity = stagedBook.priceAmount && stagedBook.priceAmount > 0 ? 12 : 0;

  return {
    slug,
    title,
    authorName,
    publisherName,
    priceAmount: stagedBook.priceAmount ?? 0,
    compareAtAmount: stagedBook.compareAtAmount ?? undefined,
    shippingFeeAmount: 30000,
    inventoryQuantity,
    publishStatus: PUBLISH_STATUS.PUBLISHED,
    availabilityStatus:
      inventoryQuantity > 0 ? AVAILABILITY_STATUS.IN_STOCK : AVAILABILITY_STATUS.OUT_OF_STOCK,
    coverImageUrl: compactText(stagedBook.coverImageUrl),
    shortDescription: compactText(stagedBook.shortDescription),
    description: compactText(stagedBook.description),
    isbn: compactText(stagedBook.isbn),
    keywords: uniqueKeywords(stagedBook.keywords),
    metadata: {
      sourceRecordId: stagedBook.sourceRecordId,
      sourceUrl: stagedBook.sourceUrl,
      normalizedAt: new Date().toISOString(),
      source: "staged_book",
    },
  };
}

interface ContentOpsServiceDependencies {
  repository?: Pick<
    AdminRepository,
    | "createAuthor"
    | "createBook"
    | "createImportJob"
    | "createPublisher"
    | "createStagedBook"
    | "findAuthorBySlug"
    | "findBookById"
    | "findBookByIsbn"
    | "findBookBySlug"
    | "findImportJobById"
    | "findPublisherBySlug"
    | "findStagedBookById"
    | "listImportJobs"
    | "listStagedBooks"
    | "updateImportJob"
    | "updateBook"
    | "updateStagedBook"
  >;
  runInTransaction?: <T>(
    work: (tx: Prisma.TransactionClient) => Promise<T>,
  ) => Promise<T>;
}

export class ContentOpsService {
  private readonly repository: NonNullable<ContentOpsServiceDependencies["repository"]>;
  private readonly runInTransaction: NonNullable<
    ContentOpsServiceDependencies["runInTransaction"]
  >;

  constructor(dependencies: ContentOpsServiceDependencies = {}) {
    this.repository = dependencies.repository ?? new AdminRepository();
    this.runInTransaction = dependencies.runInTransaction ?? withDbTransaction;
  }

  async listContentOpsOverview() {
    const [jobs, stagedBooks] = await Promise.all([
      this.repository.listImportJobs(),
      this.repository.listStagedBooks(),
    ]);

    return {
      jobs,
      stagedBooks,
    };
  }

  async listFilteredContentOpsOverview(input: {
    q?: string;
    stagedStatus?: (typeof STAGED_BOOK_STATUS)[keyof typeof STAGED_BOOK_STATUS];
  }) {
    const [jobs, stagedBooks] = await Promise.all([
      this.repository.listImportJobs(),
      this.repository.listStagedBooks({
        q: input.q,
        status: input.stagedStatus,
      }),
    ]);

    return {
      jobs,
      stagedBooks,
    };
  }

  async buildContentOpsPageModel(input: {
    q?: string;
    stagedStatus?: (typeof STAGED_BOOK_STATUS)[keyof typeof STAGED_BOOK_STATUS];
  } = {}) {
    const overview = await this.listFilteredContentOpsOverview(input);

    return {
      title: "Vận hàng nội dung",
      description: "Theo dõi tiến trình nhập dữ liệu về luồng duyệt nội dung trước khi xuất bản lên cửa hàng.",
      pageHeading: "Vận hành nội dung",
      pageLead:
        "Dữ liệu thu thập vào vùng chờ phải được chuẩn hóa, duyệt hoặc từ chối trước khi có thể xuất bản sang danh mục chính.",
      filters: {
        q: input.q ?? "",
        stagedStatus: input.stagedStatus,
      },
      jobs: overview.jobs.map((job) => ({
        id: job.id,
        source: job.source,
        status: job.status,
        totalRecords: job.totalRecords,
        processedRecords: job.processedRecords,
        successfulRecords: job.successfulRecords,
        failedRecords: job.failedRecords,
      })),
      stagedBooks: overview.stagedBooks.map((item) => ({
        id: item.id,
        title: item.title,
        status: item.status,
        authorName: item.authorName,
        publisherName: item.publisherName,
        mappedBookId: item.mappedBookId,
        reviewedAt: item.reviewedAt ? item.reviewedAt.toISOString() : null,
        normalizedSlug:
          item.normalizedPayload &&
          typeof item.normalizedPayload === "object" &&
          "slug" in item.normalizedPayload
            ? String(item.normalizedPayload.slug)
            : null,
        rejectReason: item.rejectReason,
      })),
    };
  }

  async importStagedBooks(input: {
    triggeredByUserId: string;
    payload: ParsedImportJobPayload;
  }) {
    return this.runInTransaction(async (tx) => {
      const job = await this.repository.createImportJob(
        {
          source: input.payload.source,
          sourceReference: input.payload.sourceReference,
          triggeredByUser: {
            connect: {
              id: input.triggeredByUserId,
            },
          },
          status: ContentImportJobStatus.RUNNING,
          totalRecords: input.payload.records.length,
          processedRecords: 0,
          successfulRecords: 0,
          failedRecords: 0,
          startedAt: new Date(),
          metadata: {
            importedVia: "admin_api",
          },
        },
        tx,
      );

      let successfulRecords = 0;
      let failedRecords = 0;

      for (const record of input.payload.records) {
        try {
          await this.repository.createStagedBook(
            {
              importJob: {
                connect: {
                  id: job.id,
                },
              },
              sourceRecordId: record.sourceRecordId,
              sourceUrl: record.sourceUrl,
              status: StagedBookStatus.IMPORTED,
              title: record.title,
              authorName: record.authorName,
              publisherName: record.publisherName,
              isbn: record.isbn,
              priceAmount: record.priceAmount,
              compareAtAmount: record.compareAtAmount,
              coverImageUrl: record.coverImageUrl,
              shortDescription: record.shortDescription,
              description: record.description,
              keywords: record.keywords,
              rawPayload: toPrismaJsonValue(
                record.rawPayload ?? {
                  source: input.payload.source,
                  title: record.title,
                },
              ),
            },
            tx,
          );
          successfulRecords += 1;
        } catch (error) {
          failedRecords += 1;
          logger.error("Failed to stage imported book record", error, {
            module: "content-ops",
            importJobId: job.id,
            title: record.title,
          });
        }
      }

      return this.repository.updateImportJob(
        job.id,
        {
          processedRecords: input.payload.records.length,
          successfulRecords,
          failedRecords,
          completedAt: new Date(),
          status:
            failedRecords === 0
              ? ContentImportJobStatus.COMPLETED
              : successfulRecords === 0
                ? ContentImportJobStatus.FAILED
                : ContentImportJobStatus.PARTIAL_SUCCESS,
          errorSummary:
            failedRecords > 0
              ? `${failedRecords} record(s) failed during staging import.`
              : null,
        },
        tx,
      );
    });
  }

  async normalizeStagedBook(input: {
    stagedBookId: string;
    reviewerUserId: string;
  }): Promise<AdminStagedBookRecord> {
    return this.runInTransaction(async (tx) => {
      const stagedBook = await this.repository.findStagedBookById(input.stagedBookId, tx);

      if (!stagedBook) {
        throw new AppError({
          statusCode: 404,
          code: "STAGED_BOOK_NOT_FOUND",
          message: "Không tìm thấy bản ghi chờ duyệt.",
        });
      }

      if (!compactText(stagedBook.title)) {
        throw new AppError({
          statusCode: 409,
          code: "STAGED_BOOK_INVALID",
          message: "Bản ghi chờ duyệt không có tiêu đề hợp lệ để chuẩn hóa",
        });
      }

      return this.repository.updateStagedBook(
        stagedBook.id,
        {
          reviewerUserId: input.reviewerUserId,
          status:
            stagedBook.status === StagedBookStatus.APPROVED
              ? StagedBookStatus.APPROVED
              : StagedBookStatus.IN_REVIEW,
          normalizedPayload: toPrismaJsonValue(toNormalizedPayload(stagedBook)),
          reviewedAt: new Date(),
          rejectReason: null,
        },
        tx,
      );
    });
  }

  async approveStagedBook(input: {
    stagedBookId: string;
    reviewerUserId: string;
  }): Promise<AdminStagedBookRecord> {
    return this.runInTransaction(async (tx) => {
      const stagedBook = await this.repository.findStagedBookById(input.stagedBookId, tx);

      if (!stagedBook) {
        throw new AppError({
          statusCode: 404,
          code: "STAGED_BOOK_NOT_FOUND",
          message: "Không tìm thấy bản ghi chờ duyệt",
        });
      }

      const normalizedPayload =
        stagedBook.normalizedPayload && typeof stagedBook.normalizedPayload === "object"
          ? stagedBook.normalizedPayload
          : toNormalizedPayload(stagedBook);

      return this.repository.updateStagedBook(
        stagedBook.id,
        {
          reviewerUserId: input.reviewerUserId,
          status: StagedBookStatus.APPROVED,
          normalizedPayload: toPrismaJsonValue(normalizedPayload),
          reviewedAt: new Date(),
          rejectReason: null,
        },
        tx,
      );
    });
  }

  async rejectStagedBook(input: {
    stagedBookId: string;
    reviewerUserId: string;
    reason: string;
  }): Promise<AdminStagedBookRecord> {
    return this.runInTransaction(async (tx) => {
      const stagedBook = await this.repository.findStagedBookById(input.stagedBookId, tx);

      if (!stagedBook) {
        throw new AppError({
          statusCode: 404,
          code: "STAGED_BOOK_NOT_FOUND",
          message: "Không tìm thấy bản ghi chờ duyệ.",
        });
      }

      return this.repository.updateStagedBook(
        stagedBook.id,
        {
          reviewerUserId: input.reviewerUserId,
          status: StagedBookStatus.REJECTED,
          rejectReason: input.reason.trim(),
          reviewedAt: new Date(),
        },
        tx,
      );
    });
  }

  async publishStagedBook(input: {
    stagedBookId: string;
    reviewerUserId: string;
  }): Promise<AdminStagedBookRecord> {
    return this.runInTransaction(async (tx) => {
      const stagedBook = await this.repository.findStagedBookById(input.stagedBookId, tx);

      if (!stagedBook) {
        throw new AppError({
          statusCode: 404,
          code: "STAGED_BOOK_NOT_FOUND",
          message: "Không tìm thấy bản ghi chờ duyệt",
        });
      }

      if (stagedBook.status !== StagedBookStatus.APPROVED) {
        throw new AppError({
          statusCode: 409,
          code: "STAGED_BOOK_NOT_APPROVED",
          message: "Bản ghi chờ duyệt phải được duyệt trước khi xuất bản",
        });
      }

      const normalizedPayload =
        stagedBook.normalizedPayload && typeof stagedBook.normalizedPayload === "object"
          ? (stagedBook.normalizedPayload as Record<string, unknown>)
          : toNormalizedPayload(stagedBook);

      const slug = String(normalizedPayload.slug ?? "");

      if (!slug) {
        throw new AppError({
          statusCode: 409,
          code: "STAGED_BOOK_NOT_NORMALIZED",
          message: "Bản ghi chờ duyệt chưa được chuẩn hoá hợp lệ",
        });
      }

      const isbn = compactText(String(normalizedPayload.isbn ?? stagedBook.isbn ?? ""));
      let existingBook = stagedBook.mappedBookId
        ? await this.repository.findBookById(stagedBook.mappedBookId, tx)
        : null;

      if (!existingBook && isbn) {
        existingBook = await this.repository.findBookByIsbn(isbn, tx);
      }

      if (!existingBook) {
        existingBook = await this.repository.findBookBySlug(slug, tx);
      }

      const authorName = compactText(String(normalizedPayload.authorName ?? stagedBook.authorName ?? ""));
      const publisherName = compactText(
        String(normalizedPayload.publisherName ?? stagedBook.publisherName ?? ""),
      );

      if (!authorName || !publisherName) {
        throw new AppError({
          statusCode: 409,
          code: "STAGED_BOOK_MISSING_RELATIONS",
          message: "Bản ghi chờ duyệt thiéu tác giả hoặc nhà xuất bản",
        });
      }

      const authorSlug = slugify(authorName);
      const publisherSlug = slugify(publisherName);

      let author = await this.repository.findAuthorBySlug(authorSlug, tx);
      if (!author) {
        author = await this.repository.createAuthor(
          {
            slug: authorSlug,
            name: authorName,
          },
          tx,
        );
      }

      let publisher = await this.repository.findPublisherBySlug(publisherSlug, tx);
      if (!publisher) {
        publisher = await this.repository.createPublisher(
          {
            slug: publisherSlug,
            name: publisherName,
          },
          tx,
        );
      }

      const bookPayload: Prisma.BookUncheckedCreateInput = {
        slug,
        title: String(normalizedPayload.title ?? stagedBook.title).trim(),
        subtitle: compactText(String(normalizedPayload.subtitle ?? "")),
        shortDescription: compactText(
          String(normalizedPayload.shortDescription ?? stagedBook.shortDescription ?? ""),
        ),
        description: compactText(
          String(normalizedPayload.description ?? stagedBook.description ?? ""),
        ),
        coverImageUrl: compactText(
          String(normalizedPayload.coverImageUrl ?? stagedBook.coverImageUrl ?? ""),
        ),
        authorId: author.id,
        publisherId: publisher.id,
        publishStatus: PublishStatus.PUBLISHED,
        availabilityStatus:
          String(
            normalizedPayload.availabilityStatus ?? AVAILABILITY_STATUS.IN_STOCK,
          ) as Prisma.BookCreateInput["availabilityStatus"],
        priceAmount: Number(normalizedPayload.priceAmount ?? stagedBook.priceAmount ?? 0),
        compareAtAmount: normalizedPayload.compareAtAmount
          ? Number(normalizedPayload.compareAtAmount)
          : undefined,
        shippingFeeAmount: Number(normalizedPayload.shippingFeeAmount ?? 30000),
        pageCount: normalizedPayload.pageCount
          ? Number(normalizedPayload.pageCount)
          : undefined,
        languageCode: compactText(String(normalizedPayload.languageCode ?? "")),
        isbn,
        publishedAt: new Date(),
        inventoryQuantity: Number(normalizedPayload.inventoryQuantity ?? 0),
        isFeatured: false,
        isBestseller: false,
        isRecommended: false,
        sortWeight: 0,
        keywords: Array.isArray(normalizedPayload.keywords)
          ? uniqueKeywords(
              normalizedPayload.keywords.map((item) => String(item)),
            )
          : uniqueKeywords(stagedBook.keywords),
        metadata:
          normalizedPayload.metadata && typeof normalizedPayload.metadata === "object"
            ? (normalizedPayload.metadata as Prisma.InputJsonValue)
            : undefined,
      };

      const book = existingBook
        ? await this.repository.updateBook(
            existingBook.id,
            bookPayload,
            tx,
          )
        : await this.repository.createBook(bookPayload, tx);

      return this.repository.updateStagedBook(
        stagedBook.id,
        {
          reviewerUserId: input.reviewerUserId,
          status: StagedBookStatus.PUBLISHED,
          mappedBookId: book.id,
          publishedAt: new Date(),
          reviewedAt: stagedBook.reviewedAt ?? new Date(),
          normalizedPayload: toPrismaJsonValue(normalizedPayload),
        },
        tx,
      );
    });
  }
}
