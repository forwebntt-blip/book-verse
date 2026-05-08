export const CURRENCY = {
  VND: "VND",
} as const;

export const USER_ROLES = {
  CUSTOMER: "CUSTOMER",
  ADMIN: "ADMIN",
  CONTENT_EDITOR: "CONTENT_EDITOR",
  OPS: "OPS",
} as const;

export const ADMIN_PERMISSIONS = {
  CATALOG_MANAGE: "CATALOG_MANAGE",
  CONTENT_REVIEW: "CONTENT_REVIEW",
  ORDER_MANAGE: "ORDER_MANAGE",
  ANALYTICS_VIEW: "ANALYTICS_VIEW",
} as const;

export const AVAILABILITY_STATUS = {
  IN_STOCK: "IN_STOCK",
  LOW_STOCK: "LOW_STOCK",
  OUT_OF_STOCK: "OUT_OF_STOCK",
} as const;

export const PUBLISH_STATUS = {
  DRAFT: "DRAFT",
  REVIEW: "REVIEW",
  PUBLISHED: "PUBLISHED",
  ARCHIVED: "ARCHIVED",
} as const;

export const ORDER_STATUS = {
  PLACED: "PLACED",
  AWAITING_TRANSFER: "AWAITING_TRANSFER",
  CONFIRMED: "CONFIRMED",
  PACKED: "PACKED",
  SHIPPED: "SHIPPED",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
} as const;

export const PAYMENT_STATUS = {
  PENDING: "PENDING",
  AWAITING_VERIFICATION: "AWAITING_VERIFICATION",
  PAID: "PAID",
  FAILED: "FAILED",
} as const;

export const PAYMENT_METHOD = {
  COD: "COD",
  BANK_TRANSFER: "BANK_TRANSFER",
} as const;

export const CHECKOUT_ATTEMPT_STATUS = {
  STARTED: "STARTED",
  SHIPPING_INFO_CAPTURED: "SHIPPING_INFO_CAPTURED",
  PAYMENT_METHOD_SELECTED: "PAYMENT_METHOD_SELECTED",
  READY_TO_PLACE: "READY_TO_PLACE",
  COMPLETED: "COMPLETED",
  EXPIRED: "EXPIRED",
  ABANDONED: "ABANDONED",
} as const;

export const CONTENT_IMPORT_JOB_STATUS = {
  PENDING: "PENDING",
  RUNNING: "RUNNING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  PARTIAL_SUCCESS: "PARTIAL_SUCCESS",
} as const;

export const STAGED_BOOK_STATUS = {
  IMPORTED: "IMPORTED",
  IN_REVIEW: "IN_REVIEW",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  PUBLISHED: "PUBLISHED",
} as const;

export const ANALYTICS_DELIVERY_STATUS = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  DELIVERED: "DELIVERED",
  FAILED: "FAILED",
} as const;

export type CurrencyCode = (typeof CURRENCY)[keyof typeof CURRENCY];
export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];
export type AdminPermission = (typeof ADMIN_PERMISSIONS)[keyof typeof ADMIN_PERMISSIONS];
export type AvailabilityStatus = (typeof AVAILABILITY_STATUS)[keyof typeof AVAILABILITY_STATUS];
export type PublishStatus = (typeof PUBLISH_STATUS)[keyof typeof PUBLISH_STATUS];
export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];
export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];
export type PaymentMethodCode = (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD];
export type CheckoutAttemptStatus =
  (typeof CHECKOUT_ATTEMPT_STATUS)[keyof typeof CHECKOUT_ATTEMPT_STATUS];
export type ContentImportJobStatus =
  (typeof CONTENT_IMPORT_JOB_STATUS)[keyof typeof CONTENT_IMPORT_JOB_STATUS];
export type StagedBookStatus =
  (typeof STAGED_BOOK_STATUS)[keyof typeof STAGED_BOOK_STATUS];
export type AnalyticsDeliveryStatus =
  (typeof ANALYTICS_DELIVERY_STATUS)[keyof typeof ANALYTICS_DELIVERY_STATUS];
