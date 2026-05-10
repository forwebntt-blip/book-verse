import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import { env } from "../../src/config/env";
import { disconnectPrisma, getPrismaClient } from "../../src/infra/database/prisma";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

interface HttpSession {
  cookie: string;
}

interface CheckoutRunResult {
  sessionId: string;
  cartId: string;
  checkoutAttemptId: string;
  orderNumber: string;
  orderDetailPath: string;
}

function unwrapCookieValue(setCookie: string | null): string {
  if (!setCookie) {
    throw new Error("Expected Set-Cookie header.");
  }

  return setCookie.split(";")[0] ?? "";
}

function decodeSessionId(cookie: string): string {
  const match = cookie.match(/bookverse\.sid=([^;]+)/);
  if (!match) {
    throw new Error(`Could not extract session id from cookie: ${cookie}`);
  }

  const raw = decodeURIComponent(match[1]);
  if (raw.startsWith("s:")) {
    const withoutPrefix = raw.slice(2);
    return withoutPrefix.split(".")[0] ?? withoutPrefix;
  }

  return raw;
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

async function bootstrapSession(
  session: HttpSession,
  auth?: { userId: string; role: string; permissions?: string[] },
): Promise<string> {
  await fetchJson(session, "/csrf-token");

  if (auth) {
    const prisma = await getPrismaClient();
    await prisma.session.update({
      where: {
        sid: decodeSessionId(session.cookie),
      },
      data: {
        sess: {
          cookie: {
            originalMaxAge: env.SESSION_TTL_SECONDS * 1000,
            expires: new Date(Date.now() + env.SESSION_TTL_SECONDS * 1000).toISOString(),
            secure: false,
            httpOnly: true,
            path: "/",
            sameSite: "lax",
          },
          initializedAt: new Date().toISOString(),
          auth: {
            isAuthenticated: true,
            userId: auth.userId,
            role: auth.role,
            permissions: auth.permissions ?? [],
          },
        },
      },
    });
  }

  return decodeSessionId(session.cookie);
}

async function addBookToCart(session: HttpSession, slug: string, quantity = 1): Promise<string> {
  const book = await fetchJson<{
    data: {
      book: {
        id: string;
      };
    };
  }>(session, `/api/v1/books/${slug}`);

  const csrf = await fetchJson<{ data: { csrfToken: string } }>(session, "/csrf-token");
  const response = await fetchJson<{
    data: {
      id: string;
    };
  }>(session, "/api/v1/cart/items", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-csrf-token": csrf.data.csrfToken,
    },
    body: JSON.stringify({
      bookId: book.data.book.id,
      quantity,
    }),
  });

  return response.data.id;
}

async function runCheckoutFlow(params: {
  label: string;
  paymentMethod: "COD" | "BANK_TRANSFER";
  auth?: { userId: string; role: string; permissions?: string[] };
}): Promise<CheckoutRunResult> {
  const session: HttpSession = { cookie: "" };
  const sessionId = await bootstrapSession(session, params.auth);
  const cartId = await addBookToCart(session, "mat-biec", 1);

  const csrf = await fetchJson<{ data: { csrfToken: string } }>(session, "/csrf-token");

  const checkoutStart = await fetchJson<{
    data: {
      id: string;
      placeOrderIdempotencyKey: string;
    };
  }>(session, "/api/v1/checkout/start", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-csrf-token": csrf.data.csrfToken,
    },
    body: JSON.stringify({}),
  });

  const shippingSaved = await fetchJson<{
    data: {
      id: string;
      placeOrderIdempotencyKey: string;
    };
  }>(session, "/api/v1/checkout/shipping-info", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-csrf-token": csrf.data.csrfToken,
    },
    body: JSON.stringify({
      checkoutAttemptId: checkoutStart.data.id,
      fullName: `${params.label} User`,
      phoneNumber: "0901234567",
      addressLine1: "12 Nguyen Trai",
      ward: "Ben Thanh",
      district: "Quan 1",
      province: "Ho Chi Minh",
      note: `${params.label}-note`,
    }),
  });

  const paymentSaved = await fetchJson<{
    data: {
      id: string;
      placeOrderIdempotencyKey: string;
    };
  }>(session, "/api/v1/checkout/payment-method", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-csrf-token": csrf.data.csrfToken,
    },
    body: JSON.stringify({
      checkoutAttemptId: shippingSaved.data.id,
      paymentMethod: params.paymentMethod,
    }),
  });

  const placedOrder = await fetchJson<{
    data: {
      orderNumber: string;
    };
  }>(session, "/api/v1/orders", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-csrf-token": csrf.data.csrfToken,
    },
    body: JSON.stringify({
      checkoutAttemptId: paymentSaved.data.id,
      idempotencyKey: paymentSaved.data.placeOrderIdempotencyKey,
    }),
  });

  const orderNumber = placedOrder.data.orderNumber;
  const orderDetailPath = `/orders/${orderNumber}`;

  return {
    sessionId,
    cartId,
    checkoutAttemptId: paymentSaved.data.id,
    orderNumber,
    orderDetailPath,
  };
}

async function placeOrderApiTwiceWithSameIdempotency(params: {
  paymentMethod: "COD" | "BANK_TRANSFER";
}): Promise<{
  firstOrderNumber: string;
  secondOrderNumber: string;
  ownerSession: HttpSession;
  ownerSessionId: string;
}> {
  const session: HttpSession = { cookie: "" };
  const ownerSessionId = await bootstrapSession(session);
  await addBookToCart(session, "atomic-habits", 1);

  const csrf = await fetchJson<{ data: { csrfToken: string } }>(session, "/csrf-token");
  const checkoutStart = await fetchJson<{
    data: {
      id: string;
      placeOrderIdempotencyKey: string;
    };
  }>(session, "/api/v1/checkout/start", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-csrf-token": csrf.data.csrfToken,
    },
    body: JSON.stringify({}),
  });

  const shippingSaved = await fetchJson<{
    data: {
      id: string;
      placeOrderIdempotencyKey: string;
    };
  }>(session, "/api/v1/checkout/shipping-info", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-csrf-token": csrf.data.csrfToken,
    },
    body: JSON.stringify({
      checkoutAttemptId: checkoutStart.data.id,
      fullName: "Idempotency Test",
      phoneNumber: "0901234567",
      addressLine1: "45 Le Loi",
      ward: "Ben Nghe",
      district: "Quan 1",
      province: "Ho Chi Minh",
      note: "idem",
    }),
  });

  const paymentSaved = await fetchJson<{
    data: {
      id: string;
      placeOrderIdempotencyKey: string;
    };
  }>(session, "/api/v1/checkout/payment-method", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-csrf-token": csrf.data.csrfToken,
    },
    body: JSON.stringify({
      checkoutAttemptId: shippingSaved.data.id,
      paymentMethod: params.paymentMethod,
    }),
  });

  const body = JSON.stringify({
    checkoutAttemptId: paymentSaved.data.id,
    idempotencyKey: paymentSaved.data.placeOrderIdempotencyKey,
  });

  const first = await request(session, "/api/v1/orders", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-csrf-token": csrf.data.csrfToken,
    },
    body,
  });
  const second = await request(session, "/api/v1/orders", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-csrf-token": csrf.data.csrfToken,
    },
    body,
  });

  assert.equal(first.status, 200, "First idempotent order request should succeed");
  assert.equal(second.status, 200, "Second idempotent order request should succeed");

  const firstJson = (await first.json()) as { data: { orderNumber: string } };
  const secondJson = (await second.json()) as { data: { orderNumber: string } };

  return {
    firstOrderNumber: firstJson.data.orderNumber,
    secondOrderNumber: secondJson.data.orderNumber,
    ownerSession: session,
    ownerSessionId,
  };
}

async function main() {
  const prisma = await getPrismaClient();
  const customer = await prisma.user.findUnique({
    where: {
      email: "customer@bookverse.local",
    },
    select: {
      id: true,
      role: true,
    },
  });
  const admin = await prisma.user.findUnique({
    where: {
      email: "admin@bookverse.local",
    },
    select: {
      id: true,
      role: true,
      permissions: true,
    },
  });

  assert.ok(customer, "Seeded customer user is required");
  assert.ok(admin, "Seeded admin user is required");

  const codRun = await runCheckoutFlow({
    label: "Guest COD",
    paymentMethod: "COD",
  });

  const bankTransferRun = await runCheckoutFlow({
    label: "Guest Bank Transfer",
    paymentMethod: "BANK_TRANSFER",
  });

  const loggedInRun = await runCheckoutFlow({
    label: "Logged In COD",
    paymentMethod: "COD",
    auth: {
      userId: customer.id,
      role: customer.role,
    },
  });

  const codOrder = await prisma.order.findUniqueOrThrow({
    where: { orderNumber: codRun.orderNumber },
    include: {
      address: true,
      items: true,
      paymentRecords: true,
    },
  });
  const bankOrder = await prisma.order.findUniqueOrThrow({
    where: { orderNumber: bankTransferRun.orderNumber },
    include: {
      address: true,
      items: true,
      paymentRecords: true,
    },
  });
  const loggedInOrder = await prisma.order.findUniqueOrThrow({
    where: { orderNumber: loggedInRun.orderNumber },
    include: {
      paymentRecords: true,
    },
  });

  assert.equal(codOrder.status, "PLACED");
  assert.equal(codOrder.paymentStatus, "PENDING");
  assert.equal(codOrder.paymentMethod, "COD");
  assert.ok(codOrder.address);
  assert.ok(codOrder.items.length > 0);
  assert.equal(codOrder.paymentRecords[0]?.status, "PENDING");

  assert.equal(bankOrder.status, "AWAITING_TRANSFER");
  assert.equal(bankOrder.paymentStatus, "AWAITING_VERIFICATION");
  assert.equal(bankOrder.paymentMethod, "BANK_TRANSFER");
  assert.equal(bankOrder.paymentRecords[0]?.status, "AWAITING_VERIFICATION");

  assert.equal(loggedInOrder.userId, customer.id);
  assert.equal(loggedInOrder.paymentMethod, "COD");

  const idempotency = await placeOrderApiTwiceWithSameIdempotency({
    paymentMethod: "COD",
  });
  assert.equal(
    idempotency.firstOrderNumber,
    idempotency.secondOrderNumber,
    "Same idempotency key should not create duplicate orders",
  );

  const bankTransferMarkSession: HttpSession = { cookie: "" };
  await bootstrapSession(bankTransferMarkSession, {
    userId: admin.id,
    role: admin.role,
    permissions: admin.permissions,
  });
  const adminCsrf = await fetchJson<{ data: { csrfToken: string } }>(
    bankTransferMarkSession,
    "/csrf-token",
  );
  const markReceivedResponse = await request(
    bankTransferMarkSession,
    `/api/v1/orders/${bankTransferRun.orderNumber}/bank-transfer/mark-received`,
    {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        _csrf: adminCsrf.data.csrfToken,
        externalReference: `BANK-${randomUUID()}`,
        note: "admin verified",
      }).toString(),
    },
  );
  assert.equal(markReceivedResponse.status, 200, "Admin should mark transfer received successfully");

  const markedBankOrder = await prisma.order.findUniqueOrThrow({
    where: { orderNumber: bankTransferRun.orderNumber },
    include: { paymentRecords: true },
  });
  assert.equal(markedBankOrder.status, "CONFIRMED");
  assert.equal(markedBankOrder.paymentStatus, "PAID");
  assert.equal(markedBankOrder.paymentRecords[0]?.status, "PAID");

  const ownerCancelCsrf = await fetchJson<{ data: { csrfToken: string } }>(
    idempotency.ownerSession,
    "/csrf-token",
  );
  const ownerCancelResponse = await request(
    idempotency.ownerSession,
    `/api/v1/orders/${idempotency.firstOrderNumber}/cancel`,
    {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        _csrf: ownerCancelCsrf.data.csrfToken,
        reason: "self-test cancel",
      }).toString(),
    },
  );
  assert.equal(ownerCancelResponse.status, 200, "Owner session should cancel order successfully");

  const outsiderCancelSession: HttpSession = { cookie: "" };
  await bootstrapSession(outsiderCancelSession);
  const outsiderCancelCsrf = await fetchJson<{ data: { csrfToken: string } }>(
    outsiderCancelSession,
    "/csrf-token",
  );
  const outsiderCancelResponse = await request(
    outsiderCancelSession,
    `/api/v1/orders/${bankTransferRun.orderNumber}/cancel`,
    {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        _csrf: outsiderCancelCsrf.data.csrfToken,
        reason: "unauthorized cancel attempt",
      }).toString(),
    },
  );
  assert.equal(
    outsiderCancelResponse.status,
    403,
    "Foreign guest session must not cancel another guest order",
  );

  const cancelledOrder = await prisma.order.findUniqueOrThrow({
    where: { orderNumber: idempotency.firstOrderNumber },
    include: { paymentRecords: true },
  });
  assert.equal(cancelledOrder.status, "CANCELLED");

  const codEventNames = await prisma.analyticsEventOutbox.findMany({
    where: {
      orderId: codOrder.id,
    },
    select: {
      eventName: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
  const codSessionEventNames = await prisma.analyticsEventOutbox.findMany({
    where: {
      sessionId: codRun.sessionId,
    },
    select: {
      eventName: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
  const bankSessionEventNames = await prisma.analyticsEventOutbox.findMany({
    where: {
      sessionId: bankTransferRun.sessionId,
    },
    select: {
      eventName: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const codSessionSet = new Set(codSessionEventNames.map((item) => item.eventName));
  const bankSessionSet = new Set(bankSessionEventNames.map((item) => item.eventName));
  const codOrderSet = new Set(codEventNames.map((item) => item.eventName));

  assert.ok(codSessionSet.has("BEGIN_CHECKOUT"));
  assert.ok(codSessionSet.has("ADD_SHIPPING_INFO"));
  assert.ok(codSessionSet.has("SELECT_PAYMENT_METHOD"));
  assert.ok(codSessionSet.has("PURCHASE"));
  assert.ok(codSessionSet.has("PAYMENT_SUCCESS"));
  assert.ok(codOrderSet.has("PURCHASE"));
  assert.ok(bankSessionSet.has("BEGIN_CHECKOUT"));
  assert.ok(bankSessionSet.has("ADD_SHIPPING_INFO"));
  assert.ok(bankSessionSet.has("SELECT_PAYMENT_METHOD"));
  assert.ok(bankSessionSet.has("PURCHASE"));
  assert.ok(bankSessionSet.has("PAYMENT_SUCCESS"));

  const factCheckoutRows = await prisma.factCheckoutEvent.findMany({
    where: {
      OR: [
        { orderId: codOrder.id },
        { orderId: markedBankOrder.id },
      ],
    },
    select: {
      eventName: true,
      orderId: true,
    },
  });
  assert.ok(factCheckoutRows.some((row) => row.orderId === codOrder.id && row.eventName === "PURCHASE"));
  assert.ok(
    factCheckoutRows.some(
      (row) => row.orderId === markedBankOrder.id && row.eventName === "PAYMENT_SUCCESS",
    ),
  );

  console.log(
    JSON.stringify(
      {
        passed: true,
        codOrderNumber: codRun.orderNumber,
        bankTransferOrderNumber: bankTransferRun.orderNumber,
        loggedInOrderNumber: loggedInRun.orderNumber,
        idempotentOrderNumber: idempotency.firstOrderNumber,
        idempotentOwnerSessionId: idempotency.ownerSessionId,
        verifiedBankTransferOrderNumber: markedBankOrder.orderNumber,
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
