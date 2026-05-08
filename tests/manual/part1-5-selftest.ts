import { strict as assert } from "node:assert";
import { disconnectPrisma, getPrismaClient } from "../../src/infra/database/prisma";

const BASE_URL = "http://localhost:3000";

interface HttpSession {
  cookie: string;
}

function unwrapCookieValue(setCookie: string | null): string {
  if (!setCookie) {
    throw new Error("Expected Set-Cookie header.");
  }

  return setCookie.split(";")[0] ?? "";
}

async function request(
  session: HttpSession,
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(options.headers ?? {});

  if (session.cookie) {
    headers.set("cookie", session.cookie);
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    redirect: "manual",
  });

  const nextCookie = response.headers.get("set-cookie");
  if (nextCookie) {
    session.cookie = unwrapCookieValue(nextCookie);
  }

  return response;
}

async function fetchJson<T>(
  session: HttpSession,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await request(session, path, options);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Request ${path} failed with ${response.status}: ${text}`);
  }

  return JSON.parse(text) as T;
}

async function getCsrfToken(session: HttpSession): Promise<string> {
  const response = await fetchJson<{ data: { csrfToken: string } }>(session, "/csrf-token");
  return response.data.csrfToken;
}

async function addBookToCart(session: HttpSession, slug: string, quantity = 1): Promise<void> {
  const book = await fetchJson<{
    data: {
      book: {
        id: string;
      };
    };
  }>(session, `/api/v1/books/${slug}`);

  const csrfToken = await getCsrfToken(session);
  const response = await request(session, "/api/v1/cart/items", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({
      bookId: book.data.book.id,
      quantity,
    }),
  });

  assert.equal(response.status, 200, `Expected add-to-cart for ${slug} to succeed.`);
}

async function main() {
  const prisma = await getPrismaClient();
  const session: HttpSession = { cookie: "" };

  const health = await fetchJson<{
    success: boolean;
    data: {
      status: string;
      app: string;
      env: string;
    };
  }>(session, "/health");
  assert.equal(health.success, true);
  assert.equal(health.data.status, "ok");

  const csrfToken = await getCsrfToken(session);
  assert.ok(csrfToken.length > 10, "Expected csrf token to be generated.");

  const categories = await fetchJson<{
    data: Array<{ slug: string; name: string; bookCount: number }>;
  }>(session, "/api/v1/categories");
  assert.ok(categories.data.length >= 2, "Expected seeded storefront categories.");
  assert.ok(categories.data.some((item) => item.slug === "van-hoc"));

  const homepage = await fetchJson<{
    data: {
      featuredBooks: Array<unknown>;
      bestsellerBooks: Array<unknown>;
      categorySections: Array<unknown>;
      collectionSections: Array<unknown>;
    };
  }>(session, "/api/v1/home");
  assert.ok(homepage.data.featuredBooks.length > 0, "Homepage should expose featured books.");
  assert.ok(homepage.data.bestsellerBooks.length > 0, "Homepage should expose bestseller books.");

  const listing = await fetchJson<{
    data: {
      books: Array<{ slug: string }>;
      filters: {
        authorOptions: Array<unknown>;
        publisherOptions: Array<unknown>;
      };
      pagination: {
        page: number;
        totalPages: number;
      } | null;
    };
  }>(session, "/api/v1/books?sort=featured");
  assert.ok(listing.data.books.length > 0, "Listing should return books.");
  assert.ok(listing.data.filters.authorOptions.length > 0, "Listing should expose author filters.");
  assert.ok(listing.data.filters.publisherOptions.length > 0, "Listing should expose publisher filters.");
  assert.ok(
    listing.data.pagination === null || listing.data.pagination.page >= 1,
    "Listing pagination should be valid.",
  );

  const categoryListing = await fetchJson<{
    data: {
      pageHeading: string;
      books: Array<{ slug: string }>;
    };
  }>(session, "/api/v1/categories/van-hoc");
  assert.ok(categoryListing.data.books.length > 0, "Category listing should return books.");

  const collectionListing = await fetchJson<{
    data: {
      pageHeading: string;
      books: Array<{ slug: string }>;
    };
  }>(session, "/api/v1/collections/tuan-le-doc-sach");
  assert.ok(collectionListing.data.books.length > 0, "Collection listing should return books.");

  const bookDetail = await fetchJson<{
    data: {
      book: {
        slug: string;
        title: string;
        price: { formatted: string };
        shippingFee: { formatted: string };
        availabilityStatus: string;
      };
      relatedBooks: Array<unknown>;
    };
  }>(session, "/api/v1/books/mat-biec");
  assert.equal(bookDetail.data.book.slug, "mat-biec");
  assert.ok(bookDetail.data.book.price.formatted.length > 0);
  assert.ok(bookDetail.data.book.shippingFee.formatted.length > 0);

  const searchByTitle = await fetchJson<{
    data: {
      searchQuery: string;
      books: Array<{ slug: string }>;
    };
  }>(session, "/api/v1/search?q=mat%20biec");
  assert.equal(searchByTitle.data.searchQuery.toLowerCase(), "mat biec");
  assert.ok(
    searchByTitle.data.books.some((item) => item.slug === "mat-biec"),
    "Search by title should return Mat Biec.",
  );

  const searchByAuthor = await fetchJson<{
    data: {
      books: Array<{ slug: string }>;
    };
  }>(session, "/api/v1/search?q=nguyen%20nhat%20anh");
  assert.ok(searchByAuthor.data.books.length > 0, "Search by author should return results.");

  const searchByPublisher = await fetchJson<{
    data: {
      books: Array<{ slug: string }>;
    };
  }>(session, "/api/v1/search?q=nha%20nam");
  assert.ok(searchByPublisher.data.books.length > 0, "Search by publisher should return results.");

  const noResultSearch = await fetchJson<{
    data: {
      books: Array<unknown>;
      emptyState: { title: string } | null;
      suggestionSection: { books: Array<unknown> } | null;
    };
  }>(session, "/api/v1/search?q=zzzz-khong-ton-tai");
  assert.equal(noResultSearch.data.books.length, 0, "No-result query should return zero books.");
  assert.ok(noResultSearch.data.emptyState, "No-result query should expose empty state.");
  assert.ok(
    noResultSearch.data.suggestionSection?.books.length,
    "No-result query should expose fallback suggestions.",
  );

  const suggestions = await fetchJson<{
    data: {
      query: string;
      queries: Array<unknown>;
      books: Array<unknown>;
      topics: Array<unknown>;
    };
  }>(session, "/api/v1/search/suggestions?q=mat");
  assert.equal(suggestions.data.query, "mat");
  assert.ok(
    suggestions.data.queries.length > 0 ||
      suggestions.data.books.length > 0 ||
      suggestions.data.topics.length > 0,
    "Search suggestions should return data.",
  );

  await addBookToCart(session, "mat-biec", 1);
  let cart = await fetchJson<{
    data: {
      id: string;
      itemCount: number;
      isGuestCart: boolean;
      items: Array<{
        id: string;
        slug: string;
        quantity: number;
      }>;
      summary: {
        subtotal: { amount: number };
        shippingFee: { amount: number };
        total: { amount: number };
      };
    };
  }>(session, "/api/v1/cart");
  assert.equal(cart.data.isGuestCart, true, "Guest cart should be marked as guest.");
  assert.equal(cart.data.itemCount, 1);
  assert.equal(cart.data.summary.total.amount, cart.data.summary.subtotal.amount + cart.data.summary.shippingFee.amount);

  const cartItemId = cart.data.items[0]?.id;
  assert.ok(cartItemId, "Cart item id should exist.");

  let csrf = await getCsrfToken(session);
  let response = await request(session, `/api/v1/cart/items/${cartItemId}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      "x-csrf-token": csrf,
    },
    body: JSON.stringify({
      quantity: 2,
    }),
  });
  assert.equal(response.status, 200, "Update quantity should succeed.");

  cart = await fetchJson(session, "/api/v1/cart");
  assert.equal(cart.data.items[0]?.quantity, 2, "Quantity should update to 2.");

  csrf = await getCsrfToken(session);
  response = await request(session, "/api/v1/cart/recalculate", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-csrf-token": csrf,
    },
    body: JSON.stringify({}),
  });
  assert.equal(response.status, 200, "Cart recalculate should succeed.");

  csrf = await getCsrfToken(session);
  response = await request(session, `/api/v1/cart/items/${cartItemId}`, {
    method: "DELETE",
    headers: {
      "content-type": "application/json",
      "x-csrf-token": csrf,
    },
  });
  assert.equal(response.status, 200, "Delete cart item should succeed.");

  cart = await fetchJson(session, "/api/v1/cart");
  assert.equal(cart.data.itemCount, 0, "Cart should become empty after removal.");

  const analyticsRows = await prisma.analyticsEventOutbox.findMany({
    where: {
      sessionId: {
        not: null,
      },
      eventName: {
        in: [
          "VIEW_HOMEPAGE",
          "VIEW_CATEGORY",
          "VIEW_COLLECTION",
          "VIEW_ITEM",
          "SEARCH",
          "SEARCH_NO_RESULT",
          "ADD_TO_CART",
          "REMOVE_FROM_CART",
          "UPDATE_CART_QUANTITY",
          "VIEW_CART",
        ],
      },
    },
    select: {
      eventName: true,
    },
  });
  const eventNames = new Set(analyticsRows.map((item) => item.eventName));
  assert.ok(eventNames.has("SEARCH"), "Expected SEARCH analytics event to be stored.");
  assert.ok(eventNames.has("SEARCH_NO_RESULT"), "Expected SEARCH_NO_RESULT analytics event to be stored.");
  assert.ok(eventNames.has("ADD_TO_CART"), "Expected ADD_TO_CART analytics event to be stored.");
  assert.ok(eventNames.has("VIEW_CART"), "Expected VIEW_CART analytics event to be stored.");

  console.log(
    JSON.stringify(
      {
        passed: true,
        checkedParts: [1, 2, 3, 4, 5],
        sampleCategory: categories.data[0]?.slug,
        sampleBook: bookDetail.data.book.slug,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrisma();
  });
