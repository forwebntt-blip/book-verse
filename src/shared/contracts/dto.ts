import type { AnalyticsEventName } from "./analytics";
import type {
  AdminPermission,
  CurrencyCode,
  PaymentMethodCode,
  UserRole,
} from "./domain";

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface MoneyDto {
  amount: number;
  currency: CurrencyCode;
  formatted: string;
}

export interface AuthenticatedUserDto {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  permissions: AdminPermission[];
}

export interface AnalyticsEventDto {
  eventName: AnalyticsEventName;
  occurredAt: string;
  payload: Record<string, unknown>;
  sessionId?: string;
  cartId?: string;
  orderId?: string;
}

export interface PaymentInstructionDto {
  method: PaymentMethodCode;
  label: string;
  description: string;
}
