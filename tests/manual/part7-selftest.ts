import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import { disconnectPrisma, getPrismaClient } from "../../src/infra/database/prisma";

const BASE_URL = "http://localhost:3000";
const SEEDED_CUSTOMER_EMAIL = "customer@bookverse.local";
const SEEDED_CUSTOMER_PASSWORD = "Customer@123456";
const SEEDED_ORDER_NUMBER = "ORD-20260504-0001";

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

async function bootstrapSession(session: HttpSession): Promise<void> {
  await getCsrfToken(session);
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

async function registerApi(
  session: HttpSession,
  payload: {
    email: string;
    fullName: string;
    password: string;
    phoneNumber?: string;
  },
): Promise<Response> {
  const csrfToken = await getCsrfToken(session);

  return request(session, "/api/v1/auth/register", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify(payload),
  });
}

async function loginApi(
  session: HttpSession,
  payload: {
    email: string;
    password: string;
  },
): Promise<Response> {
  const csrfToken = await getCsrfToken(session);

  return request(session, "/api/v1/auth/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify(payload),
  });
}

async function logoutApi(session: HttpSession): Promise<Response> {
  const csrfToken = await getCsrfToken(session);

  return request(session, "/api/v1/auth/logout", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({}),
  });
}

async function cancelOrderApi(
  session: HttpSession,
  orderNumber: string,
  reason: string,
): Promise<Response> {
  const csrfToken = await getCsrfToken(session);

  return request(session, `/api/v1/orders/${orderNumber}/cancel`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({
      reason,
    }),
  });
}

async function main() {
  const prisma = await getPrismaClient();
  const seededCustomer = await prisma.user.findUnique({
    where: {
      email: SEEDED_CUSTOMER_EMAIL,
    },
    select: {
      id: true,
      email: true,
    },
  });

  assert.ok(seededCustomer, "Seeded customer account is required for part 7 self-test.");

  const anonymousSession: HttpSession = { cookie: "" };
  await bootstrapSession(anonymousSession);

  const loginPage = await fetchText(anonymousSession, "/login");
  assert.equal(loginPage.response.status, 200, "Login page should render.");
  assert.match(loginPage.text, /<form/i);

  const registerPage = await fetchText(anonymousSession, "/register");
  assert.equal(registerPage.response.status, 200, "Register page should render.");
  assert.match(registerPage.text, /<form/i);

  const guestMe = await fetchJson<{
    data: {
      isAuthenticated: boolean;
      user: null;
    };
  }>(anonymousSession, "/api/v1/auth/me");
  assert.equal(guestMe.data.isAuthenticated, false, "Guest session should not be authenticated.");
  assert.equal(guestMe.data.user, null, "Guest session should not have a user payload.");

  const guestOrdersResponse = await request(anonymousSession, "/api/v1/account/orders");
  assert.equal(guestOrdersResponse.status, 401, "Guest must not access account order API.");

  const uniqueSuffix = randomUUID().slice(0, 8);
  const tempCredentials = {
    email: `reader-${uniqueSuffix}@bookverse.local`,
    fullName: `Reader ${uniqueSuffix}`,
    password: "Reader@123456",
    phoneNumber: "0901234567",
  };

  const registerResponse = await registerApi(anonymousSession, tempCredentials);
  assert.equal(registerResponse.status, 201, "API register should create a new account.");
  const registerJson = (await registerResponse.json()) as {
    data: {
      user: {
        id: string;
        email: string;
      };
    };
  };
  assert.equal(registerJson.data.user.email, tempCredentials.email);

  const registerMe = await fetchJson<{
    data: {
      isAuthenticated: boolean;
      user: {
        id: string;
        email: string;
        fullName: string;
      };
    };
  }>(anonymousSession, "/api/v1/auth/me");
  assert.equal(registerMe.data.isAuthenticated, true, "Newly registered session should be logged in.");
  assert.equal(registerMe.data.user.email, tempCredentials.email);

  const registerAccountPage = await fetchText(anonymousSession, "/account");
  assert.equal(registerAccountPage.response.status, 200, "Authenticated account page should render.");
  assert.match(registerAccountPage.text, new RegExp(tempCredentials.fullName));

  const registerAccountOrders = await fetchJson<{
    data: {
      orders: Array<unknown>;
    };
  }>(anonymousSession, "/api/v1/account/orders");
  assert.equal(registerAccountOrders.data.orders.length, 0, "Fresh account should not have orders yet.");

  const logoutResponse = await logoutApi(anonymousSession);
  assert.equal(logoutResponse.status, 200, "Auth logout API should succeed.");

  const afterLogoutMe = await fetchJson<{
    data: {
      isAuthenticated: boolean;
      user: null;
    };
  }>(anonymousSession, "/api/v1/auth/me");
  assert.equal(afterLogoutMe.data.isAuthenticated, false, "Session should be anonymous after logout.");

  const accountRedirect = await request(anonymousSession, "/account");
  assert.equal(accountRedirect.status, 302, "Guest should be redirected away from account page.");
  assert.match(accountRedirect.headers.get("location") ?? "", /\/login\?returnTo=%2Faccount/);

  const duplicateRegisterSession: HttpSession = { cookie: "" };
  await bootstrapSession(duplicateRegisterSession);
  const duplicateRegisterResponse = await registerApi(duplicateRegisterSession, tempCredentials);
  assert.equal(duplicateRegisterResponse.status, 409, "Duplicate registration must be rejected.");
  const duplicateRegisterJson = (await duplicateRegisterResponse.json()) as {
    error: {
      code: string;
    };
  };
  assert.equal(duplicateRegisterJson.error.code, "EMAIL_ALREADY_IN_USE");

  const invalidLoginSession: HttpSession = { cookie: "" };
  await bootstrapSession(invalidLoginSession);
  const invalidLoginResponse = await loginApi(invalidLoginSession, {
    email: tempCredentials.email,
    password: "WrongPassword@123",
  });
  assert.equal(invalidLoginResponse.status, 401, "Invalid login must return 401.");
  const invalidLoginJson = (await invalidLoginResponse.json()) as {
    error: {
      code: string;
    };
  };
  assert.equal(invalidLoginJson.error.code, "INVALID_CREDENTIALS");

  const mergeSession: HttpSession = { cookie: "" };
  await bootstrapSession(mergeSession);
  await addBookToCart(mergeSession, "atomic-habits", 1);

  const mergeLoginResponse = await loginApi(mergeSession, {
    email: tempCredentials.email,
    password: tempCredentials.password,
  });
  assert.equal(mergeLoginResponse.status, 200, "Login should succeed for merge-cart scenario.");

  const mergedCart = await fetchJson<{
    data: {
      id: string;
      itemCount: number;
      isGuestCart: boolean;
      items: Array<{
        slug: string;
        quantity: number;
      }>;
    };
  }>(mergeSession, "/api/v1/cart");
  assert.equal(mergedCart.data.isGuestCart, false, "Merged cart should belong to authenticated user.");
  assert.ok(mergedCart.data.itemCount >= 1, "Merged cart should keep at least one item.");
  assert.ok(
    mergedCart.data.items.some((item) => item.slug === "atomic-habits" && item.quantity >= 1),
    "Merged cart should contain the guest-added item after login.",
  );

  const seededCustomerSession: HttpSession = { cookie: "" };
  await bootstrapSession(seededCustomerSession);
  const seededCustomerLoginResponse = await loginApi(seededCustomerSession, {
    email: SEEDED_CUSTOMER_EMAIL,
    password: SEEDED_CUSTOMER_PASSWORD,
  });
  assert.equal(seededCustomerLoginResponse.status, 200, "Seeded customer login should succeed.");

  const seededCustomerOrdersApi = await fetchJson<{
    data: {
      orders: Array<{
        orderNumber: string;
      }>;
    };
  }>(seededCustomerSession, "/api/v1/account/orders");
  assert.ok(
    seededCustomerOrdersApi.data.orders.some((order) => order.orderNumber === SEEDED_ORDER_NUMBER),
    "Seeded customer must see the seeded order in account order API.",
  );

  const seededCustomerOrdersPage = await fetchText(seededCustomerSession, "/account/orders");
  assert.equal(seededCustomerOrdersPage.response.status, 200, "Account orders page should render.");
  assert.match(seededCustomerOrdersPage.text, new RegExp(SEEDED_ORDER_NUMBER));

  const seededCustomerOrderDetailPage = await fetchText(
    seededCustomerSession,
    `/account/orders/${SEEDED_ORDER_NUMBER}`,
  );
  assert.equal(
    seededCustomerOrderDetailPage.response.status,
    200,
    "Owner should access account order detail page.",
  );
  assert.match(seededCustomerOrderDetailPage.text, new RegExp(SEEDED_ORDER_NUMBER));

  const seededCustomerOrderDetailApi = await request(
    seededCustomerSession,
    `/api/v1/orders/${SEEDED_ORDER_NUMBER}`,
  );
  assert.equal(seededCustomerOrderDetailApi.status, 200, "Owner should access API order detail.");

  const outsiderSession: HttpSession = { cookie: "" };
  await bootstrapSession(outsiderSession);
  const outsiderLoginResponse = await loginApi(outsiderSession, {
    email: tempCredentials.email,
    password: tempCredentials.password,
  });
  assert.equal(outsiderLoginResponse.status, 200, "Temp user login should succeed for outsider checks.");

  const outsiderOrderDetailPage = await fetchText(
    outsiderSession,
    `/account/orders/${SEEDED_ORDER_NUMBER}`,
  );
  assert.equal(
    outsiderOrderDetailPage.response.status,
    403,
    "Another logged-in user must not access someone else's order page.",
  );

  const outsiderOrderDetailApi = await request(outsiderSession, `/api/v1/orders/${SEEDED_ORDER_NUMBER}`);
  assert.equal(
    outsiderOrderDetailApi.status,
    403,
    "Another logged-in user must not access someone else's order API detail.",
  );
  const outsiderOrderDetailJson = (await outsiderOrderDetailApi.json()) as {
    error: {
      code: string;
    };
  };
  assert.equal(outsiderOrderDetailJson.error.code, "ORDER_ACCESS_DENIED");

  const outsiderCancelResponse = await cancelOrderApi(
    outsiderSession,
    SEEDED_ORDER_NUMBER,
    "unauthorized cancel attempt",
  );
  assert.equal(
    outsiderCancelResponse.status,
    403,
    "Another logged-in user must not cancel someone else's order.",
  );
  const outsiderCancelJson = (await outsiderCancelResponse.json()) as {
    error: {
      code: string;
    };
  };
  assert.equal(outsiderCancelJson.error.code, "ORDER_ACCESS_DENIED");

  console.log(
    JSON.stringify(
      {
        passed: true,
        tempUserEmail: tempCredentials.email,
        seededCustomerEmail: SEEDED_CUSTOMER_EMAIL,
        verifiedOrderNumber: SEEDED_ORDER_NUMBER,
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
