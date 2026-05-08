import type { Request } from "express";
import { AppError } from "../../shared/errors/app-error";
import type { ParsedLoginPayload, ParsedRegisterPayload } from "./auth.types";

function getSingleValue(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    const candidate = value.find((item) => typeof item === "string");
    return typeof candidate === "string" ? candidate.trim() : undefined;
  }

  return typeof value === "string" ? value.trim() : undefined;
}

function requireTrimmedString(
  value: unknown,
  fieldName: string,
  options: {
    maxLength: number;
  },
): string {
  const normalized = getSingleValue(value);

  if (!normalized) {
    throw new AppError({
      statusCode: 400,
      code: "INVALID_AUTH_PAYLOAD",
      message: `${fieldName} is required.`,
    });
  }

  if (normalized.length > options.maxLength) {
    throw new AppError({
      statusCode: 400,
      code: "INVALID_AUTH_PAYLOAD",
      message: `${fieldName} must be at most ${options.maxLength} characters.`,
    });
  }

  return normalized;
}

function normalizeEmail(value: unknown): string {
  const email = requireTrimmedString(value, "email", { maxLength: 120 }).toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError({
      statusCode: 400,
      code: "INVALID_AUTH_PAYLOAD",
      message: "email is invalid.",
    });
  }

  return email;
}

function normalizePassword(value: unknown): string {
  const password = requireTrimmedString(value, "password", { maxLength: 100 });

  if (password.length < 8) {
    throw new AppError({
      statusCode: 400,
      code: "INVALID_AUTH_PAYLOAD",
      message: "password must be at least 8 characters.",
    });
  }

  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new AppError({
      statusCode: 400,
      code: "INVALID_AUTH_PAYLOAD",
      message: "password must include at least one letter and one number.",
    });
  }

  return password;
}

function normalizeOptionalPhoneNumber(value: unknown): string | undefined {
  const phoneNumber = getSingleValue(value);

  if (!phoneNumber) {
    return undefined;
  }

  if (!/^\d{9,15}$/.test(phoneNumber)) {
    throw new AppError({
      statusCode: 400,
      code: "INVALID_AUTH_PAYLOAD",
      message: "phoneNumber is invalid.",
    });
  }

  return phoneNumber;
}

export function buildSafeAuthReturnToPath(input: unknown): string {
  const returnTo = getSingleValue(input);

  if (!returnTo || !returnTo.startsWith("/") || returnTo.startsWith("//")) {
    return "/account";
  }

  return returnTo;
}

export function parseRegisterPayload(body: Request["body"]): ParsedRegisterPayload {
  return {
    email: normalizeEmail(body.email),
    fullName: requireTrimmedString(body.fullName, "fullName", { maxLength: 120 }),
    password: normalizePassword(body.password),
    phoneNumber: normalizeOptionalPhoneNumber(body.phoneNumber),
    returnTo: buildSafeAuthReturnToPath(body.returnTo),
  };
}

export function parseLoginPayload(body: Request["body"]): ParsedLoginPayload {
  return {
    email: normalizeEmail(body.email),
    password: requireTrimmedString(body.password, "password", { maxLength: 100 }),
    returnTo: buildSafeAuthReturnToPath(body.returnTo),
  };
}
