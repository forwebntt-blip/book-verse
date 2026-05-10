import { strict as assert } from "node:assert";
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

  const seededBook = await fetchJson<{
    data: {
      book: {
        id: string;
      };
    };
  }>(guestSession, "/api/v1/books/mat-biec");

  const identifyToken = await getCsrfToken(guestSession);
  const identifyResponse = await request(guestSession, "/api/v1/analytics/identify", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-csrf-token": identifyToken,
    },
    body: JSON.stringify({
      consentGranted: true,
      isLoggedIn: false,
      deviceType: "desktop",
      landingPath: "/",
      referrer: "https://example.test",
    }),
  });
  assert.equal(identifyResponse.status, 202, "Analytics identify should be accepted.");

  const eventsToken = await getCsrfToken(guestSession);
  const eventsResponse = await request(guestSession, "/api/v1/analytics/events", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-csrf-token": eventsToken,
    },
    body: JSON.stringify({
      consentGranted: true,
      pagePath: "/books/mat-biec",
      deviceType: "desktop",
      events: [
        {
          eventName: "view_item",
          occurredAt: new Date().toISOString(),
          payload: {
            bookId: seededBook.data.book.id,
            sourceContext: "manual-part10",
          },
        },
        {
          eventName: "add_to_cart",
          occurredAt: new Date().toISOString(),
          payload: {
            bookId: seededBook.data.book.id,
            quantity: 1,
            subtotalAmount: 100000,
            totalAmount: 130000,
          },
        },
      ],
    }),
  });
  assert.equal(eventsResponse.status, 202, "Analytics events ingestion should be accepted.");

  const latestOutbox = await prisma.analyticsEventOutbox.findMany({
    where: {
      sourceModule: "analytics",
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 5,
    select: {
      eventName: true,
      deliveryStatus: true,
    },
  });
  const outboxNames = new Set(latestOutbox.map((item) => item.eventName));
  assert.ok(outboxNames.has("VIEW_ITEM"), "Expected VIEW_ITEM in analytics outbox.");
  assert.ok(outboxNames.has("ADD_TO_CART"), "Expected ADD_TO_CART in analytics outbox.");

  await loginAdmin(adminSession);

  const analyticsPage = await request(adminSession, "/admin/analytics");
  assert.equal(analyticsPage.status, 200, "Admin analytics page should render.");

  const dashboard = await fetchJson<{
    data: {
      overview: {
        sessions: number;
      };
      homepageFunnel: unknown[];
      searchFunnel: unknown[];
      checkoutFunnel: unknown[];
      topBooks: unknown[];
      topSearchTerms: unknown[];
      noResultTerms: unknown[];
    };
  }>(adminSession, "/api/v1/analytics/dashboard");
  assert.ok(typeof dashboard.data.overview.sessions === "number");
  assert.ok(Array.isArray(dashboard.data.homepageFunnel));
  assert.ok(Array.isArray(dashboard.data.searchFunnel));
  assert.ok(Array.isArray(dashboard.data.checkoutFunnel));
  assert.ok(Array.isArray(dashboard.data.topBooks));
  assert.ok(Array.isArray(dashboard.data.topSearchTerms));
  assert.ok(Array.isArray(dashboard.data.noResultTerms));

  const flushToken = await getCsrfToken(adminSession);
  const flushResponse = await request(adminSession, "/api/v1/analytics/flush-critical", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-csrf-token": flushToken,
    },
    body: JSON.stringify({}),
  });
  assert.equal(flushResponse.status, 200, "Flush critical analytics should succeed.");
  const flushPayload = await flushResponse.json() as {
    data: { delivered: number; failed: number; relayEnabled: boolean };
  };
  assert.ok(typeof flushPayload.data.delivered === "number");

  console.log(
    JSON.stringify(
      {
        passed: true,
        overviewSessions: dashboard.data.overview.sessions,
        deliveredCriticalEvents: flushPayload.data.delivered,
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
