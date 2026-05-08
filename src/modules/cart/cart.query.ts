import type { Request } from "express";
import { AppError } from "../../shared/errors/app-error";
import type {
  ParsedCartItemMutationInput,
  ParsedCartItemUpdateInput,
  ParsedCartMergeInput,
} from "./cart.types";

function getSingleValue(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    const firstValue = value.find((item) => typeof item === "string");
    return typeof firstValue === "string" ? firstValue.trim() : undefined;
  }

  return typeof value === "string" ? value.trim() : undefined;
}

function parseInteger(value: unknown, fieldName: string): number {
  const raw =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? value.trim()
        : getSingleValue(value);

  if (raw === "" || typeof raw === "undefined" || raw === null) {
    throw new AppError({
      statusCode: 400,
      code: "INVALID_CART_PAYLOAD",
      message: `Missing required field: ${fieldName}.`,
    });
  }

  const parsed = Number(raw);

  if (!Number.isInteger(parsed)) {
    throw new AppError({
      statusCode: 400,
      code: "INVALID_CART_PAYLOAD",
      message: `${fieldName} must be an integer.`,
    });
  }

  if (parsed < 1) {
    throw new AppError({
      statusCode: 400,
      code: "INVALID_CART_PAYLOAD",
      message: `${fieldName} must be at least 1.`,
    });
  }

  return parsed;
}

export function parseCartItemMutationInput(body: Request["body"]): ParsedCartItemMutationInput {
  const bookId = getSingleValue(body.bookId);

  if (!bookId) {
    throw new AppError({
      statusCode: 400,
      code: "INVALID_CART_PAYLOAD",
      message: "bookId is required.",
    });
  }

  return {
    bookId,
    quantity: parseInteger(body.quantity, "quantity"),
  };
}

export function parseCartItemUpdateInput(
  itemId: string,
  body: Request["body"],
): ParsedCartItemUpdateInput {
  if (!itemId) {
    throw new AppError({
      statusCode: 400,
      code: "INVALID_CART_PAYLOAD",
      message: "itemId is required.",
    });
  }

  return {
    itemId,
    quantity: parseInteger(body.quantity, "quantity"),
  };
}

export function parseCartMergeInput(body: Request["body"]): ParsedCartMergeInput {
  return {
    sourceCartId: getSingleValue(body.sourceCartId),
  };
}

export function buildReturnToPath(input: unknown): string {
  const value = getSingleValue(input);

  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/cart";
  }

  return value;
}
