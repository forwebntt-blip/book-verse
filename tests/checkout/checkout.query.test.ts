import test from "node:test";
import assert from "node:assert/strict";

import {
  parseCheckoutPaymentPayload,
  parseCheckoutShippingPayload,
  parsePlaceOrderPayload,
} from "../../src/modules/checkout/checkout.query";

test("parseCheckoutShippingPayload validates and normalizes form body", () => {
  const payload = parseCheckoutShippingPayload({
    checkoutAttemptId: " attempt-1 ",
    fullName: " Nguyen Van A ",
    phoneNumber: " 0901234567 ",
    addressLine1: " 12 Nguyen Trai ",
    ward: " Ben Thanh ",
    district: " Quan 1 ",
    province: " Ho Chi Minh ",
    note: " Goi truoc ",
  });

  assert.deepEqual(payload, {
    checkoutAttemptId: "attempt-1",
    fullName: "Nguyen Van A",
    phoneNumber: "0901234567",
    addressLine1: "12 Nguyen Trai",
    ward: "Ben Thanh",
    district: "Quan 1",
    province: "Ho Chi Minh",
    note: "Goi truoc",
  });
});

test("parseCheckoutPaymentPayload only accepts supported methods", () => {
  assert.deepEqual(
    parseCheckoutPaymentPayload({
      checkoutAttemptId: "attempt-1",
      paymentMethod: "COD",
    }),
    {
      checkoutAttemptId: "attempt-1",
      paymentMethod: "COD",
    },
  );

  assert.throws(
    () =>
      parseCheckoutPaymentPayload({
        paymentMethod: "CARD",
      }),
    /paymentMethod is invalid/i,
  );
});

test("parsePlaceOrderPayload keeps an explicit idempotency key when provided", () => {
  assert.deepEqual(
    parsePlaceOrderPayload({
      checkoutAttemptId: "attempt-1",
      idempotencyKey: " order-submit-1 ",
    }),
    {
      checkoutAttemptId: "attempt-1",
      idempotencyKey: "order-submit-1",
    },
  );
});
