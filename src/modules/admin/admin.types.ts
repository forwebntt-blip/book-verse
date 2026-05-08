import type {
  AvailabilityStatus,
  ContentImportJobStatus,
  PublishStatus,
  StagedBookStatus,
} from "../../shared/contracts";

export interface AdminCatalogEntitySummary {
  id: string;
  slug: string;
  name: string;
}

export interface ParsedAdminListQuery {
  page: number;
  pageSize: number;
  q?: string;
  publishStatus?: PublishStatus;
  availabilityStatus?: AvailabilityStatus;
  stagedStatus?: StagedBookStatus;
}

export interface ParsedAuthorPayload {
  slug: string;
  name: string;
  biography?: string;
}

export interface ParsedPublisherPayload {
  slug: string;
  name: string;
  description?: string;
}

export interface ParsedCategoryPayload {
  slug: string;
  name: string;
  description?: string;
  isFeatured: boolean;
  sortOrder: number;
}

export interface ParsedCollectionPayload {
  slug: string;
  name: string;
  description?: string;
  coverImageUrl?: string;
  publishStatus: PublishStatus;
  isFeatured: boolean;
  sortOrder: number;
  bookIds: string[];
}

export interface ParsedBookPayload {
  slug: string;
  title: string;
  subtitle?: string;
  shortDescription?: string;
  description?: string;
  coverImageUrl?: string;
  authorId: string;
  publisherId: string;
  publishStatus: PublishStatus;
  availabilityStatus: AvailabilityStatus;
  priceAmount: number;
  compareAtAmount?: number;
  shippingFeeAmount: number;
  pageCount?: number;
  languageCode?: string;
  isbn?: string;
  publishedAt?: string;
  inventoryQuantity: number;
  isFeatured: boolean;
  isBestseller: boolean;
  isRecommended: boolean;
  sortWeight: number;
  keywords: string[];
  categoryIds: string[];
  primaryCategoryId?: string;
  metadata?: Record<string, unknown>;
}

export interface ParsedBookStatusPayload {
  publishStatus?: PublishStatus;
  availabilityStatus?: AvailabilityStatus;
}

export interface ParsedImportJobPayload {
  source: string;
  sourceReference?: string;
  records: Array<{
    sourceRecordId?: string;
    sourceUrl?: string;
    title: string;
    authorName?: string;
    publisherName?: string;
    isbn?: string;
    priceAmount?: number;
    compareAtAmount?: number;
    coverImageUrl?: string;
    shortDescription?: string;
    description?: string;
    keywords: string[];
    rawPayload?: Record<string, unknown>;
  }>;
}

export interface AdminDashboardPageModel {
  title: string;
  description: string;
  pageHeading: string;
  pageLead: string;
  stats: Array<{
    label: string;
    value: string;
    note: string;
  }>;
  quickLinks: Array<{
    label: string;
    href: string;
    note: string;
  }>;
  recentImports: Array<{
    id: string;
    source: string;
    status: ContentImportJobStatus;
    totalRecords: number;
    successfulRecords: number;
    failedRecords: number;
  }>;
  stagingSummary: Array<{
    label: string;
    value: string;
  }>;
}

export interface AdminCatalogPageModel {
  title: string;
  description: string;
  pageHeading: string;
  pageLead: string;
  entities: {
    books: Array<{
      id: string;
      slug: string;
      title: string;
      authorName: string;
      publisherName: string;
      publishStatus: PublishStatus;
      availabilityStatus: AvailabilityStatus;
      priceAmount: number;
      inventoryQuantity: number;
    }>;
    authors: Array<AdminCatalogEntitySummary & {
      biography?: string | null;
    }>;
    publishers: Array<AdminCatalogEntitySummary & {
      description?: string | null;
    }>;
    categories: Array<AdminCatalogEntitySummary & {
      description?: string | null;
      isFeatured: boolean;
      sortOrder: number;
    }>;
    collections: Array<AdminCatalogEntitySummary & {
      description?: string | null;
      coverImageUrl?: string | null;
      isFeatured: boolean;
      publishStatus: PublishStatus;
      itemCount: number;
      bookIds: string[];
    }>;
  };
  filters: {
    searchQuery: string;
    publishStatus?: PublishStatus;
    availabilityStatus?: AvailabilityStatus;
  };
  editingAuthor?: {
    id: string;
    slug: string;
    name: string;
    biography?: string | null;
  } | null;
  editingPublisher?: {
    id: string;
    slug: string;
    name: string;
    description?: string | null;
  } | null;
  editingCategory?: {
    id: string;
    slug: string;
    name: string;
    description?: string | null;
    isFeatured: boolean;
    sortOrder: number;
  } | null;
  editingBook?: {
    id: string;
    slug: string;
    title: string;
    subtitle?: string | null;
    shortDescription?: string | null;
    description?: string | null;
    coverImageUrl?: string | null;
    authorId: string;
    publisherId: string;
    publishStatus: PublishStatus;
    availabilityStatus: AvailabilityStatus;
    priceAmount: number;
    compareAtAmount?: number | null;
    shippingFeeAmount: number;
    pageCount?: number | null;
    languageCode?: string | null;
    isbn?: string | null;
    inventoryQuantity: number;
    sortWeight: number;
    isFeatured: boolean;
    isBestseller: boolean;
    isRecommended: boolean;
    keywords: string[];
    categoryIds: string[];
    primaryCategoryId?: string;
    metadata?: string;
  } | null;
  editingCollection?: {
    id: string;
    slug: string;
    name: string;
    description?: string | null;
    coverImageUrl?: string | null;
    publishStatus: PublishStatus;
    isFeatured: boolean;
    sortOrder: number;
    bookIds: string[];
  } | null;
}

export interface AdminContentOpsPageModel {
  title: string;
  description: string;
  pageHeading: string;
  pageLead: string;
  filters: {
    q: string;
    stagedStatus?: StagedBookStatus;
  };
  jobs: Array<{
    id: string;
    source: string;
    status: ContentImportJobStatus;
    totalRecords: number;
    processedRecords: number;
    successfulRecords: number;
    failedRecords: number;
  }>;
  stagedBooks: Array<{
    id: string;
    title: string;
    status: StagedBookStatus;
    authorName?: string | null;
    publisherName?: string | null;
    mappedBookId?: string | null;
    reviewedAt?: string | null;
    normalizedSlug?: string | null;
    rejectReason?: string | null;
  }>;
}
