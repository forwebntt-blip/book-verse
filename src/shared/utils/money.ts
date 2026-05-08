import { CURRENCY, type CurrencyCode } from "../contracts";

const DEFAULT_LOCALE = "vi-VN";

export function assertVndIntegerAmount(amount: number): void {
  if (!Number.isInteger(amount)) {
    throw new Error("Money amount must be stored as an integer.");
  }

  if (amount < 0) {
    throw new Error("Money amount cannot be negative.");
  }
}

export function formatMoney(amount: number, currency: CurrencyCode = CURRENCY.VND): string {
  assertVndIntegerAmount(amount);

  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function makeMoney(amount: number, currency: CurrencyCode = CURRENCY.VND) {
  assertVndIntegerAmount(amount);

  return {
    amount,
    currency,
    formatted: formatMoney(amount, currency),
  };
}
