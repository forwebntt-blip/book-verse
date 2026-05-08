import test from "node:test";
import assert from "node:assert/strict";

import {
  buildBankTransferInstruction,
  buildOrderIdempotencyKey,
  getInitialOrderState,
  resolveCheckoutAttemptStatus,
  validateAndNormalizeShippingInfo,
} from "../../src/modules/checkout/checkout.logic";

test("validateAndNormalizeShippingInfo trims required fields and preserves optional note", () => {
  const shipping = validateAndNormalizeShippingInfo({
    fullName: "  Nguyen Van A  ",
    phoneNumber: " 0901234567 ",
    addressLine1: " 12 Nguyen Trai ",
    ward: " Phuong Ben Thanh ",
    district: " Quan 1 ",
    province: " Ho Chi Minh ",
    note: " Goi truoc khi giao ",
  });

  assert.deepEqual(shipping, {
    fullName: "Nguyen Van A",
    phoneNumber: "0901234567",
    addressLine1: "12 Nguyen Trai",
    ward: "Phuong Ben Thanh",
    district: "Quan 1",
    province: "Ho Chi Minh",
    note: "Goi truoc khi giao",
  });
});

test("validateAndNormalizeShippingInfo rejects missing and malformed shipping fields", () => {
  assert.throws(
    () =>
      validateAndNormalizeShippingInfo({
        fullName: "",
        phoneNumber: "0901234567",
        addressLine1: "12 Nguyen Trai",
        ward: "",
        district: "Quan 1",
        province: "Ho Chi Minh",
      }),
    /fullName is required/i,
  );

  assert.throws(
    () =>
      validateAndNormalizeShippingInfo({
        fullName: "Nguyen Van A",
        phoneNumber: "09A1234567",
        addressLine1: "12 Nguyen Trai",
        ward: "Phuong Ben Thanh",
        district: "Quan 1",
        province: "Ho Chi Minh",
      }),
    /phoneNumber is invalid/i,
  );
});

test("resolveCheckoutAttemptStatus promotes status only when shipping and payment are both ready", () => {
  assert.equal(
    resolveCheckoutAttemptStatus({
      hasShippingInfo: false,
      paymentMethod: null,
      isCompleted: false,
    }),
    "STARTED",
  );

  assert.equal(
    resolveCheckoutAttemptStatus({
      hasShippingInfo: true,
      paymentMethod: null,
      isCompleted: false,
    }),
    "SHIPPING_INFO_CAPTURED",
  );

  assert.equal(
    resolveCheckoutAttemptStatus({
      hasShippingInfo: false,
      paymentMethod: "COD",
      isCompleted: false,
    }),
    "PAYMENT_METHOD_SELECTED",
  );

  assert.equal(
    resolveCheckoutAttemptStatus({
      hasShippingInfo: true,
      paymentMethod: "BANK_TRANSFER",
      isCompleted: false,
    }),
    "READY_TO_PLACE",
  );

  assert.equal(
    resolveCheckoutAttemptStatus({
      hasShippingInfo: true,
      paymentMethod: "COD",
      isCompleted: true,
    }),
    "COMPLETED",
  );
});

test("getInitialOrderState maps COD and bank transfer into the expected order and payment statuses", () => {
  assert.deepEqual(getInitialOrderState("COD"), {
    orderStatus: "PLACED",
    paymentStatus: "PENDING",
    paymentRecordStatus: "PENDING",
  });

  assert.deepEqual(getInitialOrderState("BANK_TRANSFER"), {
    orderStatus: "AWAITING_TRANSFER",
    paymentStatus: "AWAITING_VERIFICATION",
    paymentRecordStatus: "AWAITING_VERIFICATION",
  });
});

test("buildOrderIdempotencyKey falls back to a stable checkout-attempt scoped key", () => {
  assert.equal(
    buildOrderIdempotencyKey({
      checkoutAttemptId: "attempt-123",
      providedKey: "  custom-key-1  ",
    }),
    "custom-key-1",
  );

  assert.equal(
    buildOrderIdempotencyKey({
      checkoutAttemptId: "attempt-123",
      providedKey: "",
    }),
    "checkout-attempt:attempt-123",
  );
});

test("buildBankTransferInstruction includes account details and order-specific transfer content", () => {
  const instruction = buildBankTransferInstruction({
    orderNumber: "ORD-20260504-AB12CD",
    totalAmount: 252000,
    bankName: "Vietcombank",
    accountNumber: "1234567890",
    accountName: "BOOKVERSE JSC",
    notePrefix: "BOOKVERSE",
  });

  assert.equal(instruction.bankName, "Vietcombank");
  assert.equal(instruction.accountNumber, "1234567890");
  assert.equal(instruction.accountName, "BOOKVERSE JSC");
  assert.equal(instruction.transferContent, "BOOKVERSE ORD-20260504-AB12CD");
  assert.match(instruction.description, /252\.000/);
});
