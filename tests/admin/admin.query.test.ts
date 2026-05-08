import test from "node:test";
import assert from "node:assert/strict";

import {
  parseBookPayload,
  parseCollectionPayload,
} from "../../src/modules/admin/admin.query";

test("parseBookPayload normalizes admin book form data", () => {
  const payload = parseBookPayload({
    slug: "",
    title: " Nha Gia Kim ",
    subtitle: " Hanh trinh ",
    shortDescription: " Truyen ngan ",
    description: " Ban dac biet ",
    coverImageUrl: " https://example.com/nha-gia-kim.jpg ",
    authorId: "author-1",
    publisherId: "publisher-1",
    publishStatus: "published",
    availabilityStatus: "low_stock",
    priceAmount: "120000",
    compareAtAmount: "150000",
    shippingFeeAmount: "25000",
    pageCount: "240",
    languageCode: " vi ",
    isbn: " 9786041234567 ",
    publishedAt: "2026-05-01",
    inventoryQuantity: "5",
    isFeatured: "on",
    isBestseller: "true",
    isRecommended: "1",
    sortWeight: "42",
    keywords: "truyen, van hoc, truyen",
    categoryIds: ["cat-1", "cat-2"],
    primaryCategoryId: "cat-2",
    metadata: '{"audience":"teen","edition":2}',
  });

  assert.deepEqual(payload, {
    slug: "nha-gia-kim",
    title: "Nha Gia Kim",
    subtitle: "Hanh trinh",
    shortDescription: "Truyen ngan",
    description: "Ban dac biet",
    coverImageUrl: "https://example.com/nha-gia-kim.jpg",
    authorId: "author-1",
    publisherId: "publisher-1",
    publishStatus: "PUBLISHED",
    availabilityStatus: "LOW_STOCK",
    priceAmount: 120000,
    compareAtAmount: 150000,
    shippingFeeAmount: 25000,
    pageCount: 240,
    languageCode: "vi",
    isbn: "9786041234567",
    publishedAt: "2026-05-01T00:00:00.000Z",
    inventoryQuantity: 5,
    isFeatured: true,
    isBestseller: true,
    isRecommended: true,
    sortWeight: 42,
    keywords: ["truyen", "van hoc"],
    categoryIds: ["cat-1", "cat-2"],
    primaryCategoryId: "cat-2",
    metadata: {
      audience: "teen",
      edition: 2,
    },
  });
});

test("parseBookPayload rejects invalid metadata json", () => {
  assert.throws(
    () =>
      parseBookPayload({
        title: "Sach loi",
        authorId: "author-1",
        publisherId: "publisher-1",
        priceAmount: "1000",
        shippingFeeAmount: "0",
        inventoryQuantity: "0",
        metadata: "{invalid json}",
      }),
    /metadata must be valid json/i,
  );
});

test("parseCollectionPayload keeps unique book ids and normalizes publish status", () => {
  const payload = parseCollectionPayload({
    name: " Tua sach moi ",
    slug: "",
    description: " bo suu tap ",
    coverImageUrl: "https://example.com/collection.jpg",
    publishStatus: "review",
    isFeatured: "false",
    sortOrder: "7",
    bookIds: "book-1, book-2, book-1",
  });

  assert.deepEqual(payload, {
    slug: "tua-sach-moi",
    name: "Tua sach moi",
    description: "bo suu tap",
    coverImageUrl: "https://example.com/collection.jpg",
    publishStatus: "REVIEW",
    isFeatured: false,
    sortOrder: 7,
    bookIds: ["book-1", "book-2"],
  });
});

test("parseBookPayload prepends primary category when it is missing from selected list", () => {
  const payload = parseBookPayload({
    title: "Sach moi",
    authorId: "author-1",
    publisherId: "publisher-1",
    priceAmount: 1000,
    shippingFeeAmount: 0,
    inventoryQuantity: 1,
    categoryIds: ["cat-2"],
    primaryCategoryId: "cat-1",
  });

  assert.deepEqual(payload.categoryIds, ["cat-1", "cat-2"]);
  assert.equal(payload.primaryCategoryId, "cat-1");
});

test("parseBookPayload accepts multi-select array keywords and category ids", () => {
  const payload = parseBookPayload({
    title: "Sach moi",
    authorId: "author-1",
    publisherId: "publisher-1",
    priceAmount: 1000,
    shippingFeeAmount: 0,
    inventoryQuantity: 1,
    categoryIds: ["cat-1", "cat-2"],
    keywords: ["van hoc", "thieu nhi"],
  });

  assert.deepEqual(payload.categoryIds, ["cat-1", "cat-2"]);
  assert.deepEqual(payload.keywords, ["van hoc", "thieu nhi"]);
});
