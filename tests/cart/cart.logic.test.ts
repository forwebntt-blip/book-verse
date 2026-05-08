import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateCartTotals,
  mergeCartSnapshots,
  validateRequestedQuantity,
  type CartLinePricingInput,
} from "../../src/modules/cart/cart.logic";

test("calculateCartTotals sums line subtotals and applies highest shipping fee once", () => {
  const lines: CartLinePricingInput[] = [
    {
      bookId: "book-1",
      quantity: 2,
      unitPriceAmount: 98000,
      compareAtAmount: 115000,
      shippingFeeAmount: 30000,
      inventoryQuantity: 20,
      availabilityStatus: "IN_STOCK",
      title: "Mat Biec",
      slug: "mat-biec",
      authorName: "Nguyen Nhat Anh",
      coverImageUrl: null,
    },
    {
      bookId: "book-2",
      quantity: 1,
      unitPriceAmount: 91000,
      compareAtAmount: 105000,
      shippingFeeAmount: 25000,
      inventoryQuantity: 18,
      availabilityStatus: "IN_STOCK",
      title: "Cho Toi Xin Mot Ve Di Tuoi Tho",
      slug: "cho-toi-xin-mot-ve-di-tuoi-tho",
      authorName: "Nguyen Nhat Anh",
      coverImageUrl: null,
    },
  ];

  const summary = calculateCartTotals(lines);

  assert.equal(summary.itemCount, 3);
  assert.equal(summary.subtotalAmount, 287000);
  assert.equal(summary.shippingFeeAmount, 30000);
  assert.equal(summary.totalAmount, 317000);
  assert.equal(summary.items[0].lineSubtotalAmount, 196000);
  assert.equal(summary.items[0].lineTotalAmount, 196000);
  assert.equal(summary.items[1].lineSubtotalAmount, 91000);
  assert.equal(summary.items[1].lineTotalAmount, 91000);
});

test("mergeCartSnapshots combines duplicate books and caps quantity to available stock", () => {
  const merged = mergeCartSnapshots({
    baseItems: [
      {
        bookId: "book-1",
        title: "Atomic Habits",
        slug: "atomic-habits",
        authorName: "James Clear",
        coverImageUrl: null,
        quantity: 1,
        unitPriceAmount: 172000,
        compareAtAmount: 199000,
        shippingFeeAmount: 30000,
        inventoryQuantity: 3,
        availabilityStatus: "LOW_STOCK",
      },
    ],
    incomingItems: [
      {
        bookId: "book-1",
        title: "Atomic Habits",
        slug: "atomic-habits",
        authorName: "James Clear",
        coverImageUrl: null,
        quantity: 5,
        unitPriceAmount: 172000,
        compareAtAmount: 199000,
        shippingFeeAmount: 30000,
        inventoryQuantity: 3,
        availabilityStatus: "LOW_STOCK",
      },
      {
        bookId: "book-2",
        title: "Dac Nhan Tam",
        slug: "dac-nhan-tam",
        authorName: "Dale Carnegie",
        coverImageUrl: null,
        quantity: 2,
        unitPriceAmount: 149000,
        compareAtAmount: 165000,
        shippingFeeAmount: 30000,
        inventoryQuantity: 9,
        availabilityStatus: "IN_STOCK",
      },
    ],
  });

  assert.equal(merged.items.length, 2);
  assert.equal(merged.items[0].quantity, 3);
  assert.equal(merged.items[1].quantity, 2);
  assert.equal(merged.warnings.length, 1);
  assert.match(merged.warnings[0].message, /Atomic Habits/);
  assert.equal(merged.summary.itemCount, 5);
  assert.equal(merged.summary.subtotalAmount, 814000);
  assert.equal(merged.summary.shippingFeeAmount, 30000);
  assert.equal(merged.summary.totalAmount, 844000);
});

test("validateRequestedQuantity rejects zero, negative, and non-integer quantities", () => {
  assert.throws(() => validateRequestedQuantity(0), /Quantity must be at least 1/);
  assert.throws(() => validateRequestedQuantity(-1), /Quantity must be at least 1/);
  assert.throws(() => validateRequestedQuantity(1.5), /Quantity must be an integer/);
});
