import type {
  AdminAuthorViewModel,
  AdminBookViewModel,
  AdminCategoryViewModel,
  AdminCollectionViewModel,
  AdminDashboardPageModel,
  AdminImportJobViewModel,
  AdminOrderViewModel,
  AdminPublisherViewModel,
  AdminStagedBookViewModel,
  AnalyticsDashboardViewModel,
  AccountProfileResponse,
  AccountOrdersResponse,
  AuthMeViewModel,
  AuthUserResponse,
  ApiErrorResponse,
  ApiSuccessResponse,
  CartViewModel,
  CategorySummaryViewModel,
  CheckoutAttemptViewModel,
  CollectionSummaryViewModel,
  HomePageModel,
  ListingPageModel,
  OrderViewModel,
  ProductDetailPageModel,
  SearchPageModel,
  SearchSuggestionsResponse,
} from "../types/api";

export class ApiRequestError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
  }
}

async function readJson<T>(response: Response): Promise<T | null> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  return (await response.json()) as T;
}

async function unwrapResponse<T>(response: Response): Promise<ApiSuccessResponse<T>> {
  const payload = await readJson<ApiSuccessResponse<T> | ApiErrorResponse>(response);

  if (!response.ok) {
    if (payload && "success" in payload && !payload.success) {
      throw new ApiRequestError(payload.error.message, response.status, payload.error.code);
    }

    const message = response.status === 404 ? "Không tìm thấy nội dung yêu cầu." : "Tải dữ liệu thất bại.";
    throw new ApiRequestError(message, response.status);
  }

  if (!payload || !("success" in payload) || !payload.success) {
    throw new ApiRequestError("Phản hồi API không hợp lệ.", response.status);
  }

  return payload;
}

export async function requestData<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, {
    method: "GET",
    credentials: "same-origin",
    signal,
  });

  const payload = await unwrapResponse<T>(response);
  return payload.data;
}

export async function getHomePage(signal?: AbortSignal): Promise<HomePageModel> {
  return requestData<HomePageModel>("/api/v1/home", signal);
}

export async function getListingPage(path: string, signal?: AbortSignal): Promise<ListingPageModel> {
  return requestData<ListingPageModel>(`/api/v1${path}`, signal);
}

export async function getProductDetail(path: string, signal?: AbortSignal): Promise<ProductDetailPageModel> {
  return requestData<ProductDetailPageModel>(`/api/v1${path}`, signal);
}

export async function getCategories(signal?: AbortSignal): Promise<CategorySummaryViewModel[]> {
  return requestData<CategorySummaryViewModel[]>("/api/v1/categories", signal);
}

export async function getCollectionsOverview(signal?: AbortSignal): Promise<CollectionSummaryViewModel[]> {
  return requestData<CollectionSummaryViewModel[]>("/api/v1/collections", signal);
}

export async function getSearchPage(path: string, signal?: AbortSignal): Promise<SearchPageModel> {
  return requestData<SearchPageModel>(`/api/v1/search${path}`, signal);
}

export async function getSearchSuggestions(query: string, signal?: AbortSignal): Promise<SearchSuggestionsResponse> {
  const params = new URLSearchParams();
  params.set("q", query);
  return requestData<SearchSuggestionsResponse>(`/api/v1/search/suggestions?${params.toString()}`, signal);
}

export async function getCart(signal?: AbortSignal): Promise<CartViewModel> {
  return requestData<CartViewModel>("/api/v1/cart", signal);
}

async function getCsrfToken(): Promise<string> {
  const data = await requestData<{ csrfToken: string }>("/csrf-token");
  return data.csrfToken;
}

async function requestMutation<T>(
  path: string,
  input: {
    method: "POST" | "PATCH" | "DELETE";
    body?: Record<string, unknown>;
  },
): Promise<T> {
  const csrfToken = await getCsrfToken();
  const response = await fetch(path, {
    method: input.method,
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
      "x-csrf-token": csrfToken,
    },
    body: input.body ? JSON.stringify(input.body) : undefined,
  });

  const payload = await unwrapResponse<T>(response);
  return payload.data;
}

async function mutateCart(
  path: string,
  input: {
    method: "POST" | "PATCH" | "DELETE";
    body?: Record<string, unknown>;
  },
): Promise<CartViewModel> {
  return requestMutation<CartViewModel>(path, input);
}

export async function addToCart(bookId: string, quantity: number): Promise<CartViewModel> {
  return mutateCart("/api/v1/cart/items", {
    method: "POST",
    body: {
      bookId,
      quantity,
    },
  });
}

export async function updateCartItemQuantity(itemId: string, quantity: number): Promise<CartViewModel> {
  return mutateCart(`/api/v1/cart/items/${itemId}`, {
    method: "PATCH",
    body: {
      quantity,
    },
  });
}

export async function removeCartItem(itemId: string): Promise<CartViewModel> {
  return mutateCart(`/api/v1/cart/items/${itemId}`, {
    method: "DELETE",
  });
}

export async function startCheckout(): Promise<CheckoutAttemptViewModel> {
  return requestMutation<CheckoutAttemptViewModel>("/api/v1/checkout/start", {
    method: "POST",
  });
}

export async function getCheckoutSummary(signal?: AbortSignal): Promise<CheckoutAttemptViewModel> {
  return requestData<CheckoutAttemptViewModel>("/api/v1/checkout/summary", signal);
}

export async function saveCheckoutShippingInfo(input: {
  checkoutAttemptId?: string;
  fullName: string;
  phoneNumber: string;
  addressLine1: string;
  ward: string;
  district: string;
  province: string;
  note?: string;
}): Promise<CheckoutAttemptViewModel> {
  return requestMutation<CheckoutAttemptViewModel>("/api/v1/checkout/shipping-info", {
    method: "POST",
    body: input,
  });
}

export async function saveCheckoutPaymentMethod(input: {
  checkoutAttemptId?: string;
  paymentMethod: "COD" | "BANK_TRANSFER";
}): Promise<CheckoutAttemptViewModel> {
  return requestMutation<CheckoutAttemptViewModel>("/api/v1/checkout/payment-method", {
    method: "POST",
    body: input,
  });
}

export async function placeOrder(input: {
  checkoutAttemptId?: string;
  idempotencyKey?: string;
}): Promise<OrderViewModel> {
  return requestMutation<OrderViewModel>("/api/v1/orders", {
    method: "POST",
    body: input,
  });
}

export async function getOrder(orderNumber: string, signal?: AbortSignal): Promise<OrderViewModel> {
  return requestData<OrderViewModel>(`/api/v1/orders/${encodeURIComponent(orderNumber)}`, signal);
}

export async function cancelOrder(orderNumber: string, reason?: string): Promise<OrderViewModel> {
  return requestMutation<OrderViewModel>(`/api/v1/orders/${encodeURIComponent(orderNumber)}/cancel`, {
    method: "POST",
    body: {
      reason,
    },
  });
}

export async function getAuthMe(signal?: AbortSignal): Promise<AuthMeViewModel> {
  return requestData<AuthMeViewModel>("/api/v1/auth/me", signal);
}

export async function identifyAnalyticsSession(input: {
  consentGranted: boolean;
  sessionId?: string;
  isLoggedIn: boolean;
  deviceType?: string;
  landingPath?: string;
  referrer?: string;
}) {
  return requestMutation<{ accepted: boolean }>("/api/v1/analytics/identify", {
    method: "POST",
    body: input,
  });
}

export async function sendAnalyticsEvents(input: {
  consentGranted: boolean;
  sessionId?: string;
  cartId?: string;
  orderId?: string;
  pagePath?: string;
  deviceType?: string;
  events: Array<{
    eventName: string;
    occurredAt?: string;
    payload: Record<string, unknown>;
  }>;
}) {
  return requestMutation<{ accepted: boolean; storedEvents: number }>("/api/v1/analytics/events", {
    method: "POST",
    body: input,
  });
}

export async function getAnalyticsDashboard(signal?: AbortSignal): Promise<AnalyticsDashboardViewModel> {
  return requestData<AnalyticsDashboardViewModel>("/api/v1/analytics/dashboard", signal);
}

export async function flushCriticalAnalytics() {
  return requestMutation<{ delivered: number; failed: number; relayEnabled: boolean }>(
    "/api/v1/analytics/flush-critical",
    {
      method: "POST",
    },
  );
}

export async function login(input: {
  email: string;
  password: string;
  returnTo?: string;
}): Promise<AuthUserResponse> {
  return requestMutation<AuthUserResponse>("/api/v1/auth/login", {
    method: "POST",
    body: input,
  });
}

export async function register(input: {
  email: string;
  fullName: string;
  password: string;
  phoneNumber?: string;
  returnTo?: string;
}): Promise<AuthUserResponse> {
  return requestMutation<AuthUserResponse>("/api/v1/auth/register", {
    method: "POST",
    body: input,
  });
}

export async function logout(): Promise<{ loggedOut: true }> {
  return requestMutation<{ loggedOut: true }>("/api/v1/auth/logout", {
    method: "POST",
  });
}

export async function getAccountOrders(signal?: AbortSignal): Promise<AccountOrdersResponse> {
  return requestData<AccountOrdersResponse>("/api/v1/account/orders", signal);
}

export async function getAccountProfile(signal?: AbortSignal): Promise<AccountProfileResponse> {
  return requestData<AccountProfileResponse>("/api/v1/account/profile", signal);
}

export async function updateAccountProfile(input: {
  fullName: string;
  phoneNumber?: string;
}): Promise<AccountProfileResponse> {
  return requestMutation<AccountProfileResponse>("/api/v1/account/profile", {
    method: "PATCH",
    body: input,
  });
}

export async function getAdminDashboard(signal?: AbortSignal): Promise<AdminDashboardPageModel> {
  return requestData<AdminDashboardPageModel>("/api/v1/admin/dashboard", signal);
}

export async function getAdminAuthors(signal?: AbortSignal): Promise<AdminAuthorViewModel[]> {
  return requestData<AdminAuthorViewModel[]>("/api/v1/admin/authors", signal);
}

export async function createAdminAuthor(input: {
  slug?: string;
  name: string;
  biography?: string;
}): Promise<AdminAuthorViewModel> {
  return requestMutation<AdminAuthorViewModel>("/api/v1/admin/authors", {
    method: "POST",
    body: input,
  });
}

export async function updateAdminAuthor(id: string, input: {
  slug?: string;
  name: string;
  biography?: string;
}): Promise<AdminAuthorViewModel> {
  return requestMutation<AdminAuthorViewModel>(`/api/v1/admin/authors/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: input,
  });
}

export async function deleteAdminAuthor(id: string): Promise<{ deleted: true }> {
  return requestMutation<{ deleted: true }>(`/api/v1/admin/authors/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function getAdminPublishers(signal?: AbortSignal): Promise<AdminPublisherViewModel[]> {
  return requestData<AdminPublisherViewModel[]>("/api/v1/admin/publishers", signal);
}

export async function createAdminPublisher(input: {
  slug?: string;
  name: string;
  description?: string;
}): Promise<AdminPublisherViewModel> {
  return requestMutation<AdminPublisherViewModel>("/api/v1/admin/publishers", {
    method: "POST",
    body: input,
  });
}

export async function updateAdminPublisher(id: string, input: {
  slug?: string;
  name: string;
  description?: string;
}): Promise<AdminPublisherViewModel> {
  return requestMutation<AdminPublisherViewModel>(`/api/v1/admin/publishers/${encodeURIComponent(id)}`, {
    method: "POST",
    body: input,
  });
}

export async function deleteAdminPublisher(id: string): Promise<{ deleted: true }> {
  return requestMutation<{ deleted: true }>(`/api/v1/admin/publishers/${encodeURIComponent(id)}/delete`, {
    method: "POST",
  });
}

export async function getAdminCategories(signal?: AbortSignal): Promise<AdminCategoryViewModel[]> {
  return requestData<AdminCategoryViewModel[]>("/api/v1/admin/categories", signal);
}

export async function createAdminCategory(input: {
  slug?: string;
  name: string;
  description?: string;
  isFeatured?: boolean;
  sortOrder?: number;
}): Promise<AdminCategoryViewModel> {
  return requestMutation<AdminCategoryViewModel>("/api/v1/admin/categories", {
    method: "POST",
    body: input,
  });
}

export async function updateAdminCategory(id: string, input: {
  slug?: string;
  name: string;
  description?: string;
  isFeatured?: boolean;
  sortOrder?: number;
}): Promise<AdminCategoryViewModel> {
  return requestMutation<AdminCategoryViewModel>(`/api/v1/admin/categories/${encodeURIComponent(id)}`, {
    method: "POST",
    body: input,
  });
}

export async function deleteAdminCategory(id: string): Promise<{ deleted: true }> {
  return requestMutation<{ deleted: true }>(`/api/v1/admin/categories/${encodeURIComponent(id)}/delete`, {
    method: "POST",
  });
}

export async function getAdminBooks(params?: {
  q?: string;
  publishStatus?: string;
  availabilityStatus?: string;
}): Promise<AdminBookViewModel[]> {
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  if (params?.publishStatus) search.set("publishStatus", params.publishStatus);
  if (params?.availabilityStatus) search.set("availabilityStatus", params.availabilityStatus);

  return requestData<AdminBookViewModel[]>(
    `/api/v1/admin/books${search.toString() ? `?${search.toString()}` : ""}`,
  );
}

export async function createAdminBook(input: Record<string, unknown>): Promise<AdminBookViewModel> {
  return requestMutation<AdminBookViewModel>("/api/v1/admin/books", {
    method: "POST",
    body: input,
  });
}

export async function updateAdminBook(id: string, input: Record<string, unknown>): Promise<AdminBookViewModel> {
  return requestMutation<AdminBookViewModel>(`/api/v1/admin/books/${encodeURIComponent(id)}`, {
    method: "POST",
    body: input,
  });
}

export async function updateAdminBookStatus(id: string, input: {
  publishStatus?: string;
  availabilityStatus?: string;
}): Promise<AdminBookViewModel> {
  return requestMutation<AdminBookViewModel>(`/api/v1/admin/books/${encodeURIComponent(id)}/status`, {
    method: "POST",
    body: input,
  });
}

export async function deleteAdminBook(id: string): Promise<{ deleted: true }> {
  return requestMutation<{ deleted: true }>(`/api/v1/admin/books/${encodeURIComponent(id)}/delete`, {
    method: "POST",
  });
}

export async function getAdminCollections(signal?: AbortSignal): Promise<AdminCollectionViewModel[]> {
  return requestData<AdminCollectionViewModel[]>("/api/v1/admin/collections", signal);
}

export async function createAdminCollection(input: Record<string, unknown>): Promise<AdminCollectionViewModel> {
  return requestMutation<AdminCollectionViewModel>("/api/v1/admin/collections", {
    method: "POST",
    body: input,
  });
}

export async function updateAdminCollection(id: string, input: Record<string, unknown>): Promise<AdminCollectionViewModel> {
  return requestMutation<AdminCollectionViewModel>(`/api/v1/admin/collections/${encodeURIComponent(id)}`, {
    method: "POST",
    body: input,
  });
}

export async function deleteAdminCollection(id: string): Promise<{ deleted: true }> {
  return requestMutation<{ deleted: true }>(`/api/v1/admin/collections/${encodeURIComponent(id)}/delete`, {
    method: "POST",
  });
}

export async function getAdminImportJobs(signal?: AbortSignal): Promise<AdminImportJobViewModel[]> {
  return requestData<AdminImportJobViewModel[]>("/api/v1/admin/import-jobs", signal);
}

export async function createAdminImportJob(input: Record<string, unknown>): Promise<AdminImportJobViewModel> {
  return requestMutation<AdminImportJobViewModel>("/api/v1/admin/import-jobs", {
    method: "POST",
    body: input,
  });
}

export async function getAdminStagedBooks(params?: {
  q?: string;
  stagedStatus?: string;
}): Promise<AdminStagedBookViewModel[]> {
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  if (params?.stagedStatus) search.set("stagedStatus", params.stagedStatus);

  return requestData<AdminStagedBookViewModel[]>(
    `/api/v1/admin/staged-books${search.toString() ? `?${search.toString()}` : ""}`,
  );
}

async function stagedBookAction(path: string, body?: Record<string, unknown>) {
  return requestMutation<AdminStagedBookViewModel>(path, {
    method: "POST",
    body,
  });
}

export async function normalizeAdminStagedBook(id: string) {
  return stagedBookAction(`/api/v1/admin/staged-books/${encodeURIComponent(id)}/normalize`);
}

export async function approveAdminStagedBook(id: string) {
  return stagedBookAction(`/api/v1/admin/staged-books/${encodeURIComponent(id)}/approve`);
}

export async function rejectAdminStagedBook(id: string, reason: string) {
  return stagedBookAction(`/api/v1/admin/staged-books/${encodeURIComponent(id)}/reject`, { reason });
}

export async function publishAdminStagedBook(id: string) {
  return stagedBookAction(`/api/v1/admin/staged-books/${encodeURIComponent(id)}/publish`);
}

export async function getAdminOrders(params?: {
  q?: string;
  orderStatus?: string;
  paymentStatus?: string;
}): Promise<AdminOrderViewModel[]> {
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  if (params?.orderStatus) search.set("orderStatus", params.orderStatus);
  if (params?.paymentStatus) search.set("paymentStatus", params.paymentStatus);

  return requestData<AdminOrderViewModel[]>(
    `/api/v1/admin/orders${search.toString() ? `?${search.toString()}` : ""}`,
  );
}

export async function getAdminOrder(orderNumber: string): Promise<AdminOrderViewModel> {
  return requestData<AdminOrderViewModel>(`/api/v1/admin/orders/${encodeURIComponent(orderNumber)}`);
}

export async function updateAdminOrderStatus(
  orderNumber: string,
  input: { status: string },
): Promise<AdminOrderViewModel> {
  return requestMutation<AdminOrderViewModel>(
    `/api/v1/admin/orders/${encodeURIComponent(orderNumber)}/status`,
    {
      method: "POST",
      body: input,
    },
  );
}

export async function cancelAdminOrder(
  orderNumber: string,
  input: { reason?: string },
): Promise<AdminOrderViewModel> {
  return requestMutation<AdminOrderViewModel>(
    `/api/v1/admin/orders/${encodeURIComponent(orderNumber)}/cancel`,
    {
      method: "POST",
      body: input,
    },
  );
}

export async function markAdminOrderTransferReceived(
  orderNumber: string,
  input: { externalReference?: string; note?: string; proofUrl?: string },
): Promise<AdminOrderViewModel> {
  return requestMutation<AdminOrderViewModel>(
    `/api/v1/admin/orders/${encodeURIComponent(orderNumber)}/bank-transfer/mark-received`,
    {
      method: "POST",
      body: input,
    },
  );
}

export async function updateAdminOrderInternalNote(
  orderNumber: string,
  input: { internalNote?: string },
): Promise<AdminOrderViewModel> {
  return requestMutation<AdminOrderViewModel>(
    `/api/v1/admin/orders/${encodeURIComponent(orderNumber)}/internal-note`,
    {
      method: "PATCH",
      body: input,
    },
  );
}
