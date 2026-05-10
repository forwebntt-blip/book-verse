export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface MoneyDto {
  amount: number;
  currency: "VND";
  formatted: string;
}

export type UserRole = "CUSTOMER" | "ADMIN" | "CONTENT_EDITOR" | "OPS";
export type AdminPermission =
  | "CATALOG_MANAGE"
  | "CONTENT_REVIEW"
  | "ORDER_MANAGE"
  | "ANALYTICS_VIEW";

export interface AuthenticatedUserDto {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  permissions: AdminPermission[];
}

export type AvailabilityStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
export type CatalogSort =
  | "featured"
  | "bestseller"
  | "newest"
  | "price_asc"
  | "price_desc";

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
  analytics?: {
    context: Record<string, unknown>;
    events: Array<{
      eventName: string;
      payload?: Record<string, unknown>;
    }>;
  };
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
  pagination?: PaginationViewModel | null;
  emptyState: {
    title: string;
    message: string;
    resetHref: string;
  } | null;
  analytics?: {
    context: Record<string, unknown>;
    events: Array<{
      eventName: string;
      payload?: Record<string, unknown>;
    }>;
  };
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
  analytics?: {
    context: Record<string, unknown>;
    events: Array<{
      eventName: string;
      payload?: Record<string, unknown>;
    }>;
  };
}

export interface AnalyticsDashboardViewModel {
  overview: {
    sessions: number;
    purchases: number;
    revenue: number;
    conversionRate: number;
  };
  homepageFunnel: Array<{ label: string; value: number }>;
  searchFunnel: Array<{ label: string; value: number }>;
  checkoutFunnel: Array<{ label: string; value: number }>;
  revenueSeries: Array<{ label: string; revenue: number; orders: number }>;
  paymentMethodBreakdown: Array<{ label: string; value: number }>;
  deviceBreakdown: Array<{ label: string; value: number }>;
  categoryBreakdown: Array<{ label: string; value: number }>;
  topBooks: Array<{ label: string; value: number }>;
  topSearchTerms: Array<{ label: string; value: number }>;
  noResultTerms: Array<{ label: string; value: number }>;
  guestVsLoggedIn: Array<{ label: string; value: number }>;
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
  coverImageUrl?: string | null;
  isFeatured: boolean;
  books: ProductCardViewModel[];
}

export interface SearchExploreLinkViewModel {
  label: string;
  href: string;
  note: string;
}

export interface SearchSuggestionItemViewModel {
  label: string;
  href: string;
  note?: string;
  kind: "query" | "book" | "author" | "category";
}

export interface SearchSuggestionsResponse {
  query: string;
  queries: SearchSuggestionItemViewModel[];
  books: SearchSuggestionItemViewModel[];
  topics: SearchSuggestionItemViewModel[];
  viewAllHref: string;
}

export interface SearchSectionViewModel {
  eyebrow: string;
  title: string;
  description: string;
  books: ProductCardViewModel[];
}

export interface SearchEmptyStateViewModel {
  title: string;
  message: string;
  resetHref: string;
  tips: string[];
}

export interface SearchPageModel {
  title: string;
  description: string;
  breadcrumb: BreadcrumbItem[];
  pageHeading: string;
  pageLead: string;
  searchQuery: string;
  hasQuery: boolean;
  resultSummary: string;
  fallbackNotice?: string | null;
  matchedBy: string[];
  books: ProductCardViewModel[];
  pagination?: PaginationViewModel | null;
  emptyState: SearchEmptyStateViewModel | null;
  suggestionSection: SearchSectionViewModel;
  exploreLinks: SearchExploreLinkViewModel[];
}

export interface CartLineViewModel {
  id: string;
  bookId: string;
  title: string;
  slug: string;
  detailHref: string;
  authorName: string;
  coverImageUrl?: string | null;
  availabilityStatus: AvailabilityStatus;
  availabilityLabel: string;
  inventoryQuantity: number;
  quantity: number;
  maxQuantity: number;
  unitPrice: MoneyDto;
  compareAt?: MoneyDto | null;
  shippingFee: MoneyDto;
  lineSubtotal: MoneyDto;
  lineTotal: MoneyDto;
  canPurchase: boolean;
  warning?: string;
}

export interface CartViewModel {
  id: string;
  currency: "VND";
  itemCount: number;
  isEmpty: boolean;
  isGuestCart: boolean;
  items: CartLineViewModel[];
  summary: {
    itemCount: number;
    subtotal: MoneyDto;
    shippingFee: MoneyDto;
    total: MoneyDto;
  };
  warnings: Array<{
    code: string;
    message: string;
    tone: "warning" | "danger";
  }>;
}

export type PaymentMethodCode = "COD" | "BANK_TRANSFER";
export type CheckoutAttemptStatus =
  | "STARTED"
  | "SHIPPING_INFO_CAPTURED"
  | "PAYMENT_METHOD_SELECTED"
  | "READY_TO_PLACE"
  | "COMPLETED"
  | "EXPIRED"
  | "ABANDONED";
export type OrderStatus =
  | "PLACED"
  | "AWAITING_TRANSFER"
  | "CONFIRMED"
  | "PACKED"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";
export type PaymentStatus =
  | "PENDING"
  | "AWAITING_VERIFICATION"
  | "PAID"
  | "FAILED";

export interface CheckoutPaymentMethodOptionViewModel {
  code: PaymentMethodCode;
  label: string;
  description: string;
  selected: boolean;
}

export interface CheckoutShippingInfoViewModel {
  fullName: string;
  phoneNumber: string;
  addressLine1: string;
  ward: string;
  district: string;
  province: string;
  note: string;
}

export interface CheckoutWarningViewModel {
  code: string;
  message: string;
  tone: "warning" | "danger";
}

export interface CheckoutAttemptViewModel {
  id: string;
  status: CheckoutAttemptStatus;
  paymentMethod: PaymentMethodCode | null;
  canPlaceOrder: boolean;
  isGuestCheckout: boolean;
  shipping: CheckoutShippingInfoViewModel;
  paymentOptions: CheckoutPaymentMethodOptionViewModel[];
  summary: {
    itemCount: number;
    subtotal: MoneyDto;
    shippingFee: MoneyDto;
    total: MoneyDto;
  };
  warnings: CheckoutWarningViewModel[];
  expiresAt?: string | null;
  placeOrderIdempotencyKey: string;
}

export interface OrderAddressViewModel {
  recipientName: string;
  phoneNumber: string;
  addressLine1: string;
  ward?: string | null;
  district: string;
  province: string;
  note?: string | null;
}

export interface OrderLineViewModel {
  id: string;
  bookSlug: string;
  bookTitle: string;
  authorName: string;
  publisherName: string;
  quantity: number;
  coverImageUrl?: string | null;
  unitPrice: MoneyDto;
  lineSubtotal: MoneyDto;
}

export interface PaymentRecordViewModel {
  status: PaymentStatus;
  method: PaymentMethodCode;
  amount: MoneyDto;
  attemptNumber: number;
  externalReference?: string | null;
  note?: string | null;
}

export interface OrderViewModel {
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethodCode;
  isGuestOrder: boolean;
  customerFullName: string;
  customerPhoneNumber: string;
  customerEmail?: string | null;
  placedAtLabel: string;
  summary: CheckoutAttemptViewModel["summary"];
  address: OrderAddressViewModel;
  items: OrderLineViewModel[];
  payments: PaymentRecordViewModel[];
  canCancel: boolean;
  bankTransferInstruction?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
    amount: MoneyDto;
    transferNote: string;
  };
}

export interface AuthMeViewModel {
  isAuthenticated: boolean;
  user: AuthenticatedUserDto | null;
}

export interface AuthUserResponse {
  user: AuthenticatedUserDto;
}

export interface AccountOrderListItemViewModel {
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethodCode;
  itemCount: number;
  total: MoneyDto;
  placedAt: string;
}

export interface AccountOrdersResponse {
  orders: AccountOrderListItemViewModel[];
}

export interface AccountProfileViewModel {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string | null;
  role: UserRole;
}

export interface AccountProfileResponse {
  profile: AccountProfileViewModel;
}

export type PublishStatus = "DRAFT" | "REVIEW" | "PUBLISHED" | "ARCHIVED";
export type ContentImportJobStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "PARTIAL_SUCCESS";
export type StagedBookStatus = "IMPORTED" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "PUBLISHED";

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
}

export interface AdminCatalogEntitySummary {
  id: string;
  slug: string;
  name: string;
}

export interface AdminAuthorViewModel extends AdminCatalogEntitySummary {
  biography?: string | null;
}

export interface AdminPublisherViewModel extends AdminCatalogEntitySummary {
  description?: string | null;
}

export interface AdminCategoryViewModel extends AdminCatalogEntitySummary {
  description?: string | null;
  isFeatured: boolean;
  sortOrder: number;
}

export interface AdminBookViewModel {
  id: string;
  slug: string;
  title: string;
  authorName: string;
  publisherName: string;
  publishStatus: PublishStatus;
  availabilityStatus: AvailabilityStatus;
  priceAmount: number;
  inventoryQuantity: number;
}

export interface AdminCollectionViewModel extends AdminCatalogEntitySummary {
  description?: string | null;
  coverImageUrl?: string | null;
  isFeatured: boolean;
  publishStatus: PublishStatus;
  itemCount: number;
  bookIds: string[];
}

export interface AdminImportJobViewModel {
  id: string;
  source: string;
  status: ContentImportJobStatus;
  totalRecords: number;
  processedRecords: number;
  successfulRecords: number;
  failedRecords: number;
}

export interface AdminStagedBookViewModel {
  id: string;
  title: string;
  status: StagedBookStatus;
  authorName?: string | null;
  publisherName?: string | null;
  mappedBookId?: string | null;
  reviewedAt?: string | null;
  normalizedSlug?: string | null;
  rejectReason?: string | null;
}

export interface AdminOrderPaymentRecordViewModel {
  id: string;
  status: PaymentStatus;
  method: PaymentMethodCode;
  amount: number;
  attemptNumber: number;
  externalReference?: string | null;
  proofUrl?: string | null;
  note?: string | null;
  paidAt?: string | null;
  verifiedAt?: string | null;
  failedAt?: string | null;
}

export interface AdminOrderItemViewModel {
  id: string;
  bookSlug: string;
  bookTitle: string;
  authorName: string;
  publisherName: string;
  quantity: number;
  unitPriceAmount: number;
  lineSubtotalAmount: number;
}

export interface AdminOrderViewModel {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethodCode;
  itemCount: number;
  totalAmount: number;
  customerFullName: string;
  customerPhoneNumber: string;
  customerEmail?: string | null;
  internalNote?: string | null;
  cancellationReason?: string | null;
  placedAt: string;
  confirmedAt?: string | null;
  packedAt?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
  address?: {
    recipientName: string;
    phoneNumber: string;
    addressLine1: string;
    ward?: string | null;
    district: string;
    province: string;
    note?: string | null;
  } | null;
  items: AdminOrderItemViewModel[];
  payments: AdminOrderPaymentRecordViewModel[];
}
