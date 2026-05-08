import {
  CHECKOUT_ATTEMPT_STATUS,
  CURRENCY,
  ORDER_STATUS,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  type CheckoutAttemptStatus,
  type PaymentMethodCode,
  type PaymentStatus,
} from "../../shared/contracts";
import { formatMoney } from "../../shared/utils/money";

export interface CheckoutShippingInfoInput {
  fullName?: string | null;
  phoneNumber?: string | null;
  addressLine1?: string | null;
  ward?: string | null;
  district?: string | null;
  province?: string | null;
  note?: string | null;
}

export interface NormalizedCheckoutShippingInfo {
  fullName: string;
  phoneNumber: string;
  addressLine1: string;
  ward: string;
  district: string;
  province: string;
  note: string | null;
}

export interface BankTransferInstruction {
  bankName: string;
  accountNumber: string;
  accountName: string;
  transferContent: string;
  description: string;
}

function normalizeText(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizePhoneNumber(value: string): string {
  return value.replace(/[\s().-]/g, "");
}

function requireField(value: string, fieldName: keyof CheckoutShippingInfoInput): string {
  if (!value) {
    throw new Error(`${fieldName} is required.`);
  }

  return value;
}

function validateLength(value: string, fieldName: string, maxLength: number): string {
  if (value.length > maxLength) {
    throw new Error(`${fieldName} must be at most ${maxLength} characters.`);
  }

  return value;
}

export function validateAndNormalizeShippingInfo(
  input: CheckoutShippingInfoInput,
): NormalizedCheckoutShippingInfo {
  const fullName = validateLength(
    requireField(normalizeText(input.fullName), "fullName"),
    "fullName",
    120,
  );
  const phoneNumber = sanitizePhoneNumber(
    requireField(normalizeText(input.phoneNumber), "phoneNumber"),
  );
  const addressLine1 = validateLength(
    requireField(normalizeText(input.addressLine1), "addressLine1"),
    "addressLine1",
    255,
  );
  const ward = validateLength(requireField(normalizeText(input.ward), "ward"), "ward", 120);
  const district = validateLength(
    requireField(normalizeText(input.district), "district"),
    "district",
    120,
  );
  const province = validateLength(
    requireField(normalizeText(input.province), "province"),
    "province",
    120,
  );
  const note = normalizeText(input.note);

  if (!/^(?:\+?\d){9,15}$/.test(phoneNumber)) {
    throw new Error("phoneNumber is invalid.");
  }

  return {
    fullName,
    phoneNumber,
    addressLine1,
    ward,
    district,
    province,
    note: note ? validateLength(note, "note", 500) : null,
  };
}

export function resolveCheckoutAttemptStatus(input: {
  hasShippingInfo: boolean;
  paymentMethod: PaymentMethodCode | null;
  isCompleted: boolean;
}): CheckoutAttemptStatus {
  if (input.isCompleted) {
    return CHECKOUT_ATTEMPT_STATUS.COMPLETED;
  }

  if (input.hasShippingInfo && input.paymentMethod) {
    return CHECKOUT_ATTEMPT_STATUS.READY_TO_PLACE;
  }

  if (input.paymentMethod) {
    return CHECKOUT_ATTEMPT_STATUS.PAYMENT_METHOD_SELECTED;
  }

  if (input.hasShippingInfo) {
    return CHECKOUT_ATTEMPT_STATUS.SHIPPING_INFO_CAPTURED;
  }

  return CHECKOUT_ATTEMPT_STATUS.STARTED;
}

export function getInitialOrderState(paymentMethod: PaymentMethodCode): {
  orderStatus: typeof ORDER_STATUS.PLACED | typeof ORDER_STATUS.AWAITING_TRANSFER;
  paymentStatus: PaymentStatus;
  paymentRecordStatus: PaymentStatus;
} {
  if (paymentMethod === PAYMENT_METHOD.BANK_TRANSFER) {
    return {
      orderStatus: ORDER_STATUS.AWAITING_TRANSFER,
      paymentStatus: PAYMENT_STATUS.AWAITING_VERIFICATION,
      paymentRecordStatus: PAYMENT_STATUS.AWAITING_VERIFICATION,
    };
  }

  return {
    orderStatus: ORDER_STATUS.PLACED,
    paymentStatus: PAYMENT_STATUS.PENDING,
    paymentRecordStatus: PAYMENT_STATUS.PENDING,
  };
}

export function buildOrderIdempotencyKey(input: {
  checkoutAttemptId: string;
  providedKey?: string | null;
}): string {
  const normalized = normalizeText(input.providedKey);
  return normalized || `checkout-attempt:${input.checkoutAttemptId}`;
}

export function buildBankTransferInstruction(input: {
  orderNumber: string;
  totalAmount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  notePrefix: string;
}): BankTransferInstruction {
  const transferContent = `${normalizeText(input.notePrefix) || "ORDER"} ${input.orderNumber}`.trim();

  return {
    bankName: input.bankName,
    accountNumber: input.accountNumber,
    accountName: input.accountName,
    transferContent,
    description: `Vui long chuyen ${formatMoney(input.totalAmount, CURRENCY.VND)} voi noi dung ${transferContent}.`,
  };
}
