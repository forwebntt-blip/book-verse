import type { Request } from "express";
import {
  AVAILABILITY_STATUS,
  CONTENT_IMPORT_JOB_STATUS,
  ORDER_STATUS,
  PAYMENT_STATUS,
  PUBLISH_STATUS,
  STAGED_BOOK_STATUS,
} from "../../shared/contracts";
import { AppError } from "../../shared/errors/app-error";
import type {
  ParsedAdminListQuery,
  ParsedAdminOrderCancelPayload,
  ParsedAdminOrderNotePayload,
  ParsedAdminOrderPaymentPayload,
  ParsedAdminOrderStatusPayload,
  ParsedAuthorPayload,
  ParsedBookPayload,
  ParsedBookStatusPayload,
  ParsedCategoryPayload,
  ParsedCollectionPayload,
  ParsedImportJobPayload,
  ParsedPublisherPayload,
} from "./admin.types";

function getSingleValue(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    const candidate = value.find(
      (item) =>
        typeof item === "string" ||
        typeof item === "number" ||
        typeof item === "boolean",
    );

    if (
      typeof candidate === "string" ||
      typeof candidate === "number" ||
      typeof candidate === "boolean"
    ) {
      return String(candidate).trim();
    }

    return undefined;
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value).trim();
  }

  return undefined;
}

function getMultiValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) =>
        typeof item === "string" || typeof item === "number" || typeof item === "boolean"
          ? String(item).split(",")
          : []
      )
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function requireTrimmedString(
  value: unknown,
  fieldName: string,
  options: {
    maxLength: number;
  },
): string {
  const normalized = getSingleValue(value);

  if (!normalized) {
    throw new AppError({
      statusCode: 400,
      code: "INVALID_ADMIN_PAYLOAD",
      message: `${fieldName} is required.`,
    });
  }

  if (normalized.length > options.maxLength) {
    throw new AppError({
      statusCode: 400,
      code: "INVALID_ADMIN_PAYLOAD",
      message: `${fieldName} must be at most ${options.maxLength} characters.`,
    });
  }

  return normalized;
}

function normalizeOptionalText(
  value: unknown,
  fieldName: string,
  maxLength: number,
): string | undefined {
  const normalized = getSingleValue(value);

  if (!normalized) {
    return undefined;
  }

  if (normalized.length > maxLength) {
    throw new AppError({
      statusCode: 400,
      code: "INVALID_ADMIN_PAYLOAD",
      message: `${fieldName} must be at most ${maxLength} characters.`,
    });
  }

  return normalized;
}

function parseBoolean(value: unknown): boolean {
  const normalized = getSingleValue(value)?.toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "on" || normalized === "yes";
}

function parseNonNegativeInteger(
  value: unknown,
  fieldName: string,
  options: {
    required?: boolean;
  } = {},
): number | undefined {
  const raw = getSingleValue(value);

  if (!raw) {
    if (options.required) {
      throw new AppError({
        statusCode: 400,
        code: "INVALID_ADMIN_PAYLOAD",
        message: `${fieldName} is required.`,
      });
    }

    return undefined;
  }

  const parsed = Number(raw);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new AppError({
      statusCode: 400,
      code: "INVALID_ADMIN_PAYLOAD",
      message: `${fieldName} must be a non-negative integer.`,
    });
  }

  return parsed;
}

function normalizeSlug(rawValue: unknown, fallbackText?: string): string {
  const explicit = getSingleValue(rawValue);
  const source = explicit || fallbackText;

  if (!source) {
    throw new AppError({
      statusCode: 400,
      code: "INVALID_ADMIN_PAYLOAD",
      message: "slug is required.",
    });
  }

  const slug = source
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug || slug.length > 160) {
    throw new AppError({
      statusCode: 400,
      code: "INVALID_ADMIN_PAYLOAD",
      message: "slug is invalid.",
    });
  }

  return slug;
}

function parseEnumValue<T extends string>(
  value: unknown,
  fieldName: string,
  allowedValues: readonly T[],
  options: {
    required?: boolean;
  } = {},
): T | undefined {
  const raw = getSingleValue(value);

  if (!raw) {
    if (options.required) {
      throw new AppError({
        statusCode: 400,
        code: "INVALID_ADMIN_PAYLOAD",
        message: `${fieldName} is required.`,
      });
    }

    return undefined;
  }

  const normalized = raw.toUpperCase() as T;

  if (!allowedValues.includes(normalized)) {
    throw new AppError({
      statusCode: 400,
      code: "INVALID_ADMIN_PAYLOAD",
      message: `${fieldName} is invalid.`,
    });
  }

  return normalized;
}

function parseJsonObject(value: unknown, fieldName: string): Record<string, unknown> | undefined {
  const raw = getSingleValue(value);

  if (!raw) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Expected object");
    }

    return parsed as Record<string, unknown>;
  } catch (_error) {
    throw new AppError({
      statusCode: 400,
      code: "INVALID_ADMIN_PAYLOAD",
      message: `${fieldName} must be valid JSON object.`,
    });
  }
}

function parsePublishedAt(value: unknown): string | undefined {
  const raw = getSingleValue(value);

  if (!raw) {
    return undefined;
  }

  const date = new Date(raw);

  if (Number.isNaN(date.getTime())) {
    throw new AppError({
      statusCode: 400,
      code: "INVALID_ADMIN_PAYLOAD",
      message: "publishedAt is invalid.",
    });
  }

  return date.toISOString();
}

function uniqueValues(values: string[]): string[] {
  return Array.from(new Set(values));
}

export function parseAdminListQuery(query: Request["query"]): ParsedAdminListQuery {
  const page = parseNonNegativeInteger(query.page, "page") ?? 1;
  const pageSize = parseNonNegativeInteger(query.pageSize, "pageSize") ?? 20;

  return {
    page: page > 0 ? page : 1,
    pageSize: pageSize > 0 ? Math.min(pageSize, 100) : 20,
    q: getSingleValue(query.q),
    publishStatus: parseEnumValue(
      query.publishStatus,
      "publishStatus",
      Object.values(PUBLISH_STATUS),
    ),
    availabilityStatus: parseEnumValue(
      query.availabilityStatus,
      "availabilityStatus",
      Object.values(AVAILABILITY_STATUS),
    ),
    stagedStatus: parseEnumValue(
      query.stagedStatus,
      "stagedStatus",
      Object.values(STAGED_BOOK_STATUS),
    ),
    orderStatus: parseEnumValue(
      query.orderStatus,
      "orderStatus",
      Object.values(ORDER_STATUS),
    ),
    paymentStatus: parseEnumValue(
      query.paymentStatus,
      "paymentStatus",
      Object.values(PAYMENT_STATUS),
    ),
  };
}

export function parseAuthorPayload(body: Request["body"]): ParsedAuthorPayload {
  const name = requireTrimmedString(body.name, "name", { maxLength: 160 });

  return {
    slug: normalizeSlug(body.slug, name),
    name,
    biography: normalizeOptionalText(body.biography, "biography", 4000),
  };
}

export function parsePublisherPayload(body: Request["body"]): ParsedPublisherPayload {
  const name = requireTrimmedString(body.name, "name", { maxLength: 160 });

  return {
    slug: normalizeSlug(body.slug, name),
    name,
    description: normalizeOptionalText(body.description, "description", 4000),
  };
}

export function parseCategoryPayload(body: Request["body"]): ParsedCategoryPayload {
  const name = requireTrimmedString(body.name, "name", { maxLength: 160 });

  return {
    slug: normalizeSlug(body.slug, name),
    name,
    description: normalizeOptionalText(body.description, "description", 4000),
    isFeatured: parseBoolean(body.isFeatured),
    sortOrder: parseNonNegativeInteger(body.sortOrder, "sortOrder") ?? 0,
  };
}

export function parseCollectionPayload(body: Request["body"]): ParsedCollectionPayload {
  const name = requireTrimmedString(body.name, "name", { maxLength: 160 });

  return {
    slug: normalizeSlug(body.slug, name),
    name,
    description: normalizeOptionalText(body.description, "description", 4000),
    coverImageUrl: normalizeOptionalText(body.coverImageUrl, "coverImageUrl", 1000),
    publishStatus:
      parseEnumValue(
        body.publishStatus,
        "publishStatus",
        Object.values(PUBLISH_STATUS),
      ) ?? PUBLISH_STATUS.DRAFT,
    isFeatured: parseBoolean(body.isFeatured),
    sortOrder: parseNonNegativeInteger(body.sortOrder, "sortOrder") ?? 0,
    bookIds: uniqueValues(getMultiValue(body.bookIds)),
  };
}

export function parseBookPayload(body: Request["body"]): ParsedBookPayload {
  const title = requireTrimmedString(body.title, "title", { maxLength: 255 });
  const categoryIds = uniqueValues(getMultiValue(body.categoryIds));
  const primaryCategoryId = getSingleValue(body.primaryCategoryId);

  if (primaryCategoryId && !categoryIds.includes(primaryCategoryId)) {
    categoryIds.unshift(primaryCategoryId);
  }

  return {
    slug: normalizeSlug(body.slug, title),
    title,
    subtitle: normalizeOptionalText(body.subtitle, "subtitle", 255),
    shortDescription: normalizeOptionalText(body.shortDescription, "shortDescription", 1000),
    description: normalizeOptionalText(body.description, "description", 12000),
    coverImageUrl: normalizeOptionalText(body.coverImageUrl, "coverImageUrl", 1000),
    authorId: requireTrimmedString(body.authorId, "authorId", { maxLength: 120 }),
    publisherId: requireTrimmedString(body.publisherId, "publisherId", { maxLength: 120 }),
    publishStatus:
      parseEnumValue(
        body.publishStatus,
        "publishStatus",
        Object.values(PUBLISH_STATUS),
      ) ?? PUBLISH_STATUS.DRAFT,
    availabilityStatus:
      parseEnumValue(
        body.availabilityStatus,
        "availabilityStatus",
        Object.values(AVAILABILITY_STATUS),
      ) ?? AVAILABILITY_STATUS.IN_STOCK,
    priceAmount: parseNonNegativeInteger(body.priceAmount, "priceAmount", { required: true })!,
    compareAtAmount: parseNonNegativeInteger(body.compareAtAmount, "compareAtAmount"),
    shippingFeeAmount:
      parseNonNegativeInteger(body.shippingFeeAmount, "shippingFeeAmount", {
        required: true,
      })!,
    pageCount: parseNonNegativeInteger(body.pageCount, "pageCount"),
    languageCode: normalizeOptionalText(body.languageCode, "languageCode", 16)?.toLowerCase(),
    isbn: normalizeOptionalText(body.isbn, "isbn", 32),
    publishedAt: parsePublishedAt(body.publishedAt),
    inventoryQuantity:
      parseNonNegativeInteger(body.inventoryQuantity, "inventoryQuantity", {
        required: true,
      })!,
    isFeatured: parseBoolean(body.isFeatured),
    isBestseller: parseBoolean(body.isBestseller),
    isRecommended: parseBoolean(body.isRecommended),
    sortWeight: parseNonNegativeInteger(body.sortWeight, "sortWeight") ?? 0,
    keywords: uniqueValues(
      getMultiValue(body.keywords).map((item) => item.toLowerCase()),
    ),
    categoryIds,
    primaryCategoryId,
    metadata: parseJsonObject(body.metadata, "metadata"),
  };
}

export function parseBookStatusPayload(body: Request["body"]): ParsedBookStatusPayload {
  const publishStatus = parseEnumValue(
    body.publishStatus,
    "publishStatus",
    Object.values(PUBLISH_STATUS),
  );
  const availabilityStatus = parseEnumValue(
    body.availabilityStatus,
    "availabilityStatus",
    Object.values(AVAILABILITY_STATUS),
  );

  if (!publishStatus && !availabilityStatus) {
    throw new AppError({
      statusCode: 400,
      code: "INVALID_ADMIN_PAYLOAD",
      message: "At least one status field is required.",
    });
  }

  return {
    publishStatus,
    availabilityStatus,
  };
}

export function parseAdminOrderStatusPayload(
  body: Request["body"],
): ParsedAdminOrderStatusPayload {
  const status = parseEnumValue(
    body.status,
    "status",
    Object.values(ORDER_STATUS),
    { required: true },
  );

  return {
    status: status!,
  };
}

export function parseAdminOrderCancelPayload(
  body: Request["body"],
): ParsedAdminOrderCancelPayload {
  return {
    reason: normalizeOptionalText(body.reason, "reason", 255),
  };
}

export function parseAdminOrderPaymentPayload(
  body: Request["body"],
): ParsedAdminOrderPaymentPayload {
  return {
    externalReference: normalizeOptionalText(body.externalReference, "externalReference", 120),
    note: normalizeOptionalText(body.note, "note", 500),
    proofUrl: normalizeOptionalText(body.proofUrl, "proofUrl", 1000),
  };
}

export function parseAdminOrderNotePayload(
  body: Request["body"],
): ParsedAdminOrderNotePayload {
  return {
    internalNote: normalizeOptionalText(body.internalNote, "internalNote", 2000),
  };
}

export function parseImportJobPayload(body: Request["body"]): ParsedImportJobPayload {
  const source = requireTrimmedString(body.source, "source", { maxLength: 120 });
  const sourceReference = normalizeOptionalText(body.sourceReference, "sourceReference", 255);
  let recordsValue = body.records;

  if (typeof recordsValue === "string") {
    try {
      recordsValue = JSON.parse(recordsValue);
    } catch (_error) {
      throw new AppError({
        statusCode: 400,
        code: "INVALID_ADMIN_PAYLOAD",
        message: "records must be valid json.",
      });
    }
  }

  if ((!recordsValue || recordsValue === "") && typeof body.recordsJson === "string") {
    try {
      recordsValue = JSON.parse(body.recordsJson);
    } catch (_error) {
      throw new AppError({
        statusCode: 400,
        code: "INVALID_ADMIN_PAYLOAD",
        message: "recordsJson must be valid json.",
      });
    }
  }

  if (!Array.isArray(recordsValue) || recordsValue.length === 0) {
    throw new AppError({
      statusCode: 400,
      code: "INVALID_ADMIN_PAYLOAD",
      message: "records is required.",
    });
  }

  return {
    source,
    sourceReference,
    records: recordsValue.map((record, index) => {
      if (!record || typeof record !== "object") {
        throw new AppError({
          statusCode: 400,
          code: "INVALID_ADMIN_PAYLOAD",
          message: `records[${index}] is invalid.`,
        });
      }

      const objectRecord = record as Record<string, unknown>;

      return {
        sourceRecordId: normalizeOptionalText(
          objectRecord.sourceRecordId,
          `records[${index}].sourceRecordId`,
          255,
        ),
        sourceUrl: normalizeOptionalText(
          objectRecord.sourceUrl,
          `records[${index}].sourceUrl`,
          1000,
        ),
        title: requireTrimmedString(objectRecord.title, `records[${index}].title`, {
          maxLength: 255,
        }),
        authorName: normalizeOptionalText(
          objectRecord.authorName,
          `records[${index}].authorName`,
          160,
        ),
        publisherName: normalizeOptionalText(
          objectRecord.publisherName,
          `records[${index}].publisherName`,
          160,
        ),
        isbn: normalizeOptionalText(objectRecord.isbn, `records[${index}].isbn`, 32),
        priceAmount: parseNonNegativeInteger(
          objectRecord.priceAmount,
          `records[${index}].priceAmount`,
        ),
        compareAtAmount: parseNonNegativeInteger(
          objectRecord.compareAtAmount,
          `records[${index}].compareAtAmount`,
        ),
        coverImageUrl: normalizeOptionalText(
          objectRecord.coverImageUrl,
          `records[${index}].coverImageUrl`,
          1000,
        ),
        shortDescription: normalizeOptionalText(
          objectRecord.shortDescription,
          `records[${index}].shortDescription`,
          1000,
        ),
        description: normalizeOptionalText(
          objectRecord.description,
          `records[${index}].description`,
          12000,
        ),
        keywords: uniqueValues(
          getMultiValue(objectRecord.keywords).map((item) => item.toLowerCase()),
        ),
        rawPayload:
          objectRecord.rawPayload && typeof objectRecord.rawPayload === "object"
            ? (objectRecord.rawPayload as Record<string, unknown>)
            : undefined,
      };
    }),
  };
}

export function parseStatusFilter(
  value: unknown,
): {
  importJobStatus?: (typeof CONTENT_IMPORT_JOB_STATUS)[keyof typeof CONTENT_IMPORT_JOB_STATUS];
  stagedStatus?: (typeof STAGED_BOOK_STATUS)[keyof typeof STAGED_BOOK_STATUS];
} {
  return {
    importJobStatus: parseEnumValue(
      value,
      "status",
      Object.values(CONTENT_IMPORT_JOB_STATUS),
    ),
    stagedStatus: parseEnumValue(
      value,
      "status",
      Object.values(STAGED_BOOK_STATUS),
    ),
  };
}
