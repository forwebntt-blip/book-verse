import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import { disconnectPrisma, getPrismaClient } from "../../src/infra/database/prisma";

const BASE_URL = "http://localhost:3000";
const ADMIN_EMAIL = "admin@bookverse.local";
const ADMIN_PASSWORD = "Admin@123456";

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

async function fetchText(
  session: HttpSession,
  path: string,
  options: RequestInit = {},
): Promise<{ response: Response; text: string }> {
  const response = await request(session, path, options);
  const text = await response.text();
  return { response, text };
}

async function getCsrfToken(session: HttpSession): Promise<string> {
  const response = await fetchJson<{ data: { csrfToken: string } }>(session, "/csrf-token");
  return response.data.csrfToken;
}

async function loginAdmin(session: HttpSession): Promise<void> {
  const csrfToken = await getCsrfToken(session);
  const response = await request(session, "/api/v1/auth/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    }),
  });

  const body = await response.json() as { data?: { user?: { email: string } } };
  assert.equal(response.status, 200, "Admin login should succeed.");
  assert.equal(body.data?.user?.email, ADMIN_EMAIL);
}

async function main() {
  const prisma = await getPrismaClient();
  const guestSession: HttpSession = { cookie: "" };
  const adminSession: HttpSession = { cookie: "" };
  const suffix = randomUUID().slice(0, 8);

  const guestAdminRedirect = await request(guestSession, "/admin");
  assert.equal(guestAdminRedirect.status, 302, "Guest should be redirected to login for admin.");
  assert.match(
    guestAdminRedirect.headers.get("location") ?? "",
    /\/login\?returnTo=%2Fadmin/,
  );

  await loginAdmin(adminSession);

  const adminDashboard = await fetchText(adminSession, "/admin");
  assert.equal(adminDashboard.response.status, 200, "Admin dashboard should render.");
  assert.match(adminDashboard.text, /200|admin/i);

  const adminCatalogPage = await fetchText(adminSession, "/admin/catalog");
  assert.equal(adminCatalogPage.response.status, 200, "Admin catalog should render.");
  assert.match(adminCatalogPage.text, /200|catalog/i);

  const adminContentOpsPage = await fetchText(adminSession, "/admin/content-ops");
  assert.equal(adminContentOpsPage.response.status, 200, "Admin content ops should render.");
  assert.match(adminContentOpsPage.text, /200|content/i);

  const adminApiBooks = await fetchJson<{
    data: Array<{ id: string; title: string }>;
  }>(adminSession, "/api/v1/admin/books");
  assert.ok(adminApiBooks.data.length > 0, "Admin books API should return seeded books.");

  const createAuthorToken = await getCsrfToken(adminSession);
  const createAuthorResponse = await request(adminSession, "/api/v1/admin/authors", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-csrf-token": createAuthorToken,
    },
    body: JSON.stringify({
      name: `Tac Gia Smoke Part 8 ${suffix}`,
      biography: "Tac gia tao trong smoke test.",
    }),
  });
  assert.equal(createAuthorResponse.status, 201, "Author create API should succeed.");
  const createdAuthor = await createAuthorResponse.json() as { data: { id: string; slug: string } };
  assert.match(createdAuthor.data.slug, /tac-gia-smoke-part-8/);

  const publishers = await fetchJson<{
    data: Array<{ id: string; name: string }>;
  }>(adminSession, "/api/v1/admin/publishers");
  const categories = await fetchJson<{
    data: Array<{ id: string; name: string }>;
  }>(adminSession, "/api/v1/admin/categories");
  assert.ok(publishers.data.length > 0, "Publishers API should return data.");
  assert.ok(categories.data.length > 0, "Categories API should return data.");

  const createBookToken = await getCsrfToken(adminSession);
  const createBookResponse = await request(adminSession, "/api/v1/admin/books", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-csrf-token": createBookToken,
    },
    body: JSON.stringify({
      title: `Smoke Test Book Part 8 ${suffix}`,
      authorId: createdAuthor.data.id,
      publisherId: publishers.data[0]?.id,
      priceAmount: 111000,
      shippingFeeAmount: 30000,
      inventoryQuantity: 7,
      publishStatus: "REVIEW",
      availabilityStatus: "IN_STOCK",
      categoryIds: [categories.data[0]?.id],
      primaryCategoryId: categories.data[0]?.id,
      keywords: "smoke,admin",
      metadata: JSON.stringify({ source: "manual-smoke" }),
    }),
  });
  assert.equal(createBookResponse.status, 201, "Book create API should succeed.");
  const createdBook = await createBookResponse.json() as { data: { id: string; slug: string } };
  assert.match(createdBook.data.slug, /smoke-test-book-part-8/);

  const importToken = await getCsrfToken(adminSession);
  const importResponse = await request(adminSession, "/api/v1/admin/import-jobs", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-csrf-token": importToken,
    },
    body: JSON.stringify({
      source: "smoke-test",
      sourceReference: "part8-smoke",
      records: [
        {
          sourceRecordId: `part8-staged-${suffix}`,
          title: `Staged Smoke Book Part 8 ${suffix}`,
          authorName: "Staged Author",
          publisherName: "Staged Publisher",
          priceAmount: 125000,
          keywords: ["crawl", "staging"],
          rawPayload: {
            source: "smoke-test",
          },
        },
      ],
    }),
  });
  assert.equal(importResponse.status, 201, "Import job API should succeed.");

  const stagedBooks = await fetchJson<{
    data: Array<{ id: string; title: string; status: string }>;
  }>(adminSession, "/api/v1/admin/staged-books");
  const smokeStagedBook = stagedBooks.data.find(
    (item) => item.title === `Staged Smoke Book Part 8 ${suffix}`,
  );
  assert.ok(smokeStagedBook, "Imported staged book should exist.");

  const normalizeToken = await getCsrfToken(adminSession);
  const normalizeResponse = await request(
    adminSession,
    `/api/v1/admin/staged-books/${smokeStagedBook?.id}/normalize`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": normalizeToken,
      },
      body: JSON.stringify({}),
    },
  );
  assert.equal(normalizeResponse.status, 200, "Normalize staged book should succeed.");

  const approveToken = await getCsrfToken(adminSession);
  const approveResponse = await request(
    adminSession,
    `/api/v1/admin/staged-books/${smokeStagedBook?.id}/approve`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": approveToken,
      },
      body: JSON.stringify({}),
    },
  );
  assert.equal(approveResponse.status, 200, "Approve staged book should succeed.");

  const publishToken = await getCsrfToken(adminSession);
  const publishResponse = await request(
    adminSession,
    `/api/v1/admin/staged-books/${smokeStagedBook?.id}/publish`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": publishToken,
      },
      body: JSON.stringify({}),
    },
  );
  assert.equal(publishResponse.status, 200, "Publish staged book should succeed.");

  const publishedStagedPayload = await publishResponse.json() as {
    data: { status: string; mappedBookId?: string | null };
  };
  assert.equal(publishedStagedPayload.data.status, "PUBLISHED");
  assert.ok(publishedStagedPayload.data.mappedBookId, "Published staged book should map to a real book.");

  const publishedBook = await prisma.book.findUnique({
    where: {
      id: publishedStagedPayload.data.mappedBookId ?? "",
    },
    select: {
      id: true,
      title: true,
      publishStatus: true,
    },
  });
  assert.ok(publishedBook, "Mapped published book should exist in books table.");
  assert.equal(publishedBook?.publishStatus, "PUBLISHED");

  console.log(
    JSON.stringify(
      {
        passed: true,
        createdAuthorId: createdAuthor.data.id,
        createdBookId: createdBook.data.id,
        stagedBookId: smokeStagedBook?.id,
        mappedBookId: publishedStagedPayload.data.mappedBookId,
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
