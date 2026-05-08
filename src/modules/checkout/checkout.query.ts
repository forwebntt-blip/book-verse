import type { Request } from "express";
import { PAYMENT_METHOD, type PaymentMethodCode } from "../../shared/contracts";
import { AppError } from "../../shared/errors/app-error";
import type {
  ParsedCancelOrderPayload,
  ParsedCheckoutPaymentPayload,
  ParsedCheckoutShippingPayload,
  ParsedMarkBankTransferReceivedPayload,
  ParsedPlaceOrderPayload,
} from "./checkout.types";
import { validateAndNormalizeShippingInfo } from "./checkout.logic";

function getSingleValue(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    const candidate = value.find((item) => typeof item === "string");
    return typeof candidate === "string" ? candidate.trim() : undefined;
  }

  return typeof value === "string" ? value.trim() : undefined;
}

function optionalTrimmedString(
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
      code: "INVALID_CHECKOUT_PAYLOAD",
      message: `${fieldName} must be at most ${maxLength} characters.`,
    });
  }

  return normalized;
}

function optionalCheckoutAttemptId(body: Request["body"]): string | undefined {
  return optionalTrimmedString(body.checkoutAttemptId, "checkoutAttemptId", 100);
}

function parsePaymentMethod(value: unknown): PaymentMethodCode {
  const method = getSingleValue(value);

  if (!method) {
    throw new AppError({
      statusCode: 400,
      code: "INVALID_CHECKOUT_PAYLOAD",
      message: "paymentMethod is required.",
    });
  }

  if (method !== PAYMENT_METHOD.COD && method !== PAYMENT_METHOD.BANK_TRANSFER) {
    throw new AppError({
      statusCode: 400,
      code: "INVALID_CHECKOUT_PAYLOAD",
      message: "paymentMethod is invalid.",
    });
  }

  return method;
}

export function parseCheckoutShippingPayload(
  body: Request["body"],
): ParsedCheckoutShippingPayload {
  try {
    return {
      checkoutAttemptId: optionalCheckoutAttemptId(body),
      ...validateAndNormalizeShippingInfo({
        fullName: getSingleValue(body.fullName),
        phoneNumber: getSingleValue(body.phoneNumber),
        addressLine1: getSingleValue(body.addressLine1),
        ward: getSingleValue(body.ward),
        district: getSingleValue(body.district),
        province: getSingleValue(body.province),
        note: getSingleValue(body.note),
      }),
    };
  } catch (error) {
    throw new AppError({
      statusCode: 400,
      code: "INVALID_CHECKOUT_PAYLOAD",
      message: error instanceof Error ? error.message : "Shipping info is invalid.",
    });
  }
}

export function parseCheckoutPaymentPayload(body: Request["body"]): ParsedCheckoutPaymentPayload {
  return {
    checkoutAttemptId: optionalCheckoutAttemptId(body),
    paymentMethod: parsePaymentMethod(body.paymentMethod),
  };
}

export function parsePlaceOrderPayload(body: Request["body"]): ParsedPlaceOrderPayload {
  return {
    checkoutAttemptId: optionalCheckoutAttemptId(body),
    idempotencyKey: optionalTrimmedString(body.idempotencyKey, "idempotencyKey", 200),
  };
}

export function parseCancelOrderPayload(body: Request["body"]): ParsedCancelOrderPayload {
  return {
    reason: optionalTrimmedString(body.reason, "reason", 255),
  };
}

export function parseMarkBankTransferReceivedPayload(
  body: Request["body"],
): ParsedMarkBankTransferReceivedPayload {
  return {
    externalReference: optionalTrimmedString(
      body.externalReference,
      "externalReference",
      120,
    ),
    note: optionalTrimmedString(body.note, "note", 500),
  };
}
