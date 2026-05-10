import type { AvailabilityStatus, MoneyDto } from "../../shared/contracts";

export const CATALOG_SORTS = {
  FEATURED: "featured",
  BESTSELLER: "bestseller",
  NEWEST: "newest",
  PRICE_ASC: "price_asc",
  PRICE_DESC: "price_desc",
} as const;

export type CatalogSort = (typeof CATALOG_SORTS)[keyof typeof CATALOG_SORTS];

export interface ParsedCatalogQuery {
  categorySlug?: string;
  authorSlug?: string;
  publisherSlug?: string;
  availability?: AvailabilityStatus;
  priceMin?: number;
  priceMax?: number;
  sort: CatalogSort;
  page: number;
}

export interface CatalogScope {
  type: "all" | "category" | "collection";
  slug?: string;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
  active?: boolean;
}

export interface ProductBadgeViewModel {
  label: string;
  tone: "featured" | "bestseller" | "recommended" | "availability";
}

export interface ProductCardViewModel {
  id: string;
  slug: string;
  title: string;
  authorName: string;
  authorSlug: string;
  publisherName: string;
  publisherSlug: string;
  shortDescription?: string | null;
  coverImageUrl?: string | null;
  primaryCategory?: {
    slug: string;
    name: string;
  };
  categories: Array<{
    slug: string;
    name: string;
  }>;
  price: MoneyDto;
  compareAt?: MoneyDto | null;
  shippingFee: MoneyDto;
  availabilityStatus: AvailabilityStatus;
  availabilityLabel: string;
  badges: ProductBadgeViewModel[];
  detailHref: string;
  interactionEventName?: string;
  analyticsPayload: Record<string, unknown>;
}

export interface CatalogSectionViewModel {
  slug: string;
  name: string;
  description: string | null;
  href: string;
  count: number;
  books: ProductCardViewModel[];
}

export interface PaginationLinkViewModel {
  label: string;
  href?: string;
  active: boolean;
  disabled: boolean;
}

export interface PaginationViewModel {
  page: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  from: number;
  to: number;
  prevHref?: string;
  nextHref?: string;
  items: PaginationLinkViewModel[];
}

export interface FilterOptionViewModel {
  value: string;
  label: string;
  count: number;
  selected: boolean;
}

export interface ActiveFilterViewModel {
  label: string;
  clearHref: string;
}

export interface CatalogFiltersViewModel {
  action: string;
  sortOptions: Array<{
    value: CatalogSort;
    label: string;
  }>;
  selectedSort: CatalogSort;
  categoryOptions: FilterOptionViewModel[];
  authorOptions: FilterOptionViewModel[];
  publisherOptions: FilterOptionViewModel[];
  availabilityOptions: FilterOptionViewModel[];
  priceMin?: number;
  priceMax?: number;
  minAvailablePrice?: number;
  maxAvailablePrice?: number;
  hasActiveFilters: boolean;
  resetHref: string;
}

export interface PageAnalyticsViewModel {
  context: Record<string, unknown>;
  events: Array<{
    eventName: string;
    payload?: Record<string, unknown>;
  }>;
}

export interface HomePageModel {
  title: string;
  description: string;
  banner: {
    title: string;
    lead: string;
    primaryCta: {
      label: string;
      href: string;
    };
    secondaryCta: {
      label: string;
      href: string;
    };
  };
  spotlightBook?: ProductCardViewModel;
  stats: Array<{
    label: string;
    value: string;
  }>;
  featuredBooks: ProductCardViewModel[];
  bestsellerBooks: ProductCardViewModel[];
  categorySections: CatalogSectionViewModel[];
  collectionSections: CatalogSectionViewModel[];
  analytics: PageAnalyticsViewModel;
}

export interface ListingPageModel {
  title: string;
  description: string;
  eyebrow: string;
  pageHeading: string;
  pageLead: string;
  breadcrumb: BreadcrumbItem[];
  resultSummary: string;
  currentSortLabel: string;
  books: ProductCardViewModel[];
  filters: CatalogFiltersViewModel;
  activeFilters: ActiveFilterViewModel[];
  pagination?: PaginationViewModel;
  emptyState: {
    title: string;
    message: string;
    resetHref: string;
  } | null;
  analytics: PageAnalyticsViewModel;
}

export interface ProductMetadataItemViewModel {
  label: string;
  value: string;
  href?: string;
}

export interface ProductDetailPageModel {
  title: string;
  description: string;
  breadcrumb: BreadcrumbItem[];
  book: ProductCardViewModel & {
    subtitle?: string | null;
    longDescription?: string | null;
    pageCount?: number | null;
    languageCode?: string | null;
    isbn?: string | null;
    publishedAtLabel?: string | null;
    inventoryQuantity: number;
    collections: Array<{
      slug: string;
      name: string;
      href: string;
    }>;
    metadataItems: ProductMetadataItemViewModel[];
    purchaseNote: string;
    isPurchasable: boolean;
  };
  relatedBooks: ProductCardViewModel[];
  analytics: PageAnalyticsViewModel;
}

export interface CategorySummaryViewModel {
  slug: string;
  name: string;
  description: string | null;
  bookCount: number;
  href: string;
}

export interface CollectionSummaryViewModel {
  slug: string;
  name: string;
  description: string | null;
  href: string;
  count: number;
  coverImageUrl: string | null;
  isFeatured: boolean;
  books: ProductCardViewModel[];
}
