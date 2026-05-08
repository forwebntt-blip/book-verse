import type {
  CheckoutAttemptStatus,
  MoneyDto,
  OrderStatus,
  PaymentMethodCode,
  PaymentStatus,
} from "../../shared/contracts";
import type { BankTransferInstruction, NormalizedCheckoutShippingInfo } from "./checkout.logic";

export interface CheckoutRequestContext {
  requestId: string;
  sessionId?: string;
  userId?: string | null;
}

export interface CheckoutIdentityInput {
  existingCartId?: string | null;
  sessionId?: string;
  userId?: string | null;
  existingCheckoutAttemptId?: string | null;
}

export interface ParsedCheckoutShippingPayload extends NormalizedCheckoutShippingInfo {
  checkoutAttemptId?: string;
}

export interface ParsedCheckoutPaymentPayload {
  checkoutAttemptId?: string;
  paymentMethod: PaymentMethodCode;
}

export interface ParsedPlaceOrderPayload {
  checkoutAttemptId?: string;
  idempotencyKey?: string;
}

export interface ParsedCancelOrderPayload {
  reason?: string;
}

export interface ParsedMarkBankTransferReceivedPayload {
  externalReference?: string;
  note?: string;
}

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

export interface CheckoutSummaryViewModel {
  itemCount: number;
  subtotal: MoneyDto;
  shippingFee: MoneyDto;
  total: MoneyDto;
}

export interface CheckoutAttemptViewModel {
  id: string;
  status: CheckoutAttemptStatus;
  paymentMethod: PaymentMethodCode | null;
  canPlaceOrder: boolean;
  isGuestCheckout: boolean;
  shipping: CheckoutShippingInfoViewModel;
  paymentOptions: CheckoutPaymentMethodOptionViewModel[];
  summary: CheckoutSummaryViewModel;
  warnings: CheckoutWarningViewModel[];
  expiresAt?: string | null;
  placeOrderIdempotencyKey: string;
}

export interface CheckoutPageModel {
  title: string;
  description: string;
  pageHeading: string;
  pageLead: string;
  cartHref: string;
  checkout: CheckoutAttemptViewModel;
  analytics: {
    context: Record<string, unknown>;
    events: Array<{
      eventName: string;
      payload?: Record<string, unknown>;
    }>;
  };
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

export interface OrderAddressViewModel {
  recipientName: string;
  phoneNumber: string;
  addressLine1: string;
  ward?: string | null;
  district: string;
  province: string;
  note?: string | null;
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
  summary: CheckoutSummaryViewModel;
  address: OrderAddressViewModel;
  items: OrderLineViewModel[];
  payments: PaymentRecordViewModel[];
  canCancel: boolean;
  bankTransferInstruction?: BankTransferInstruction;
}

export interface OrderSuccessPageModel {
  title: string;
  description: string;
  pageHeading: string;
  pageLead: string;
  continueShoppingHref: string;
  orderDetailHref: string;
  order: OrderViewModel;
  analytics: {
    context: Record<string, unknown>;
    events: Array<{
      eventName: string;
      payload?: Record<string, unknown>;
    }>;
  };
}

export interface OrderDetailPageModel {
  title: string;
  description: string;
  pageHeading: string;
  pageLead: string;
  continueShoppingHref: string;
  order: OrderViewModel;
  analytics: {
    context: Record<string, unknown>;
    events: Array<{
      eventName: string;
      payload?: Record<string, unknown>;
    }>;
  };
}
