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
  const adminSession: HttpSession = { cookie: "" };
  await loginAdmin(adminSession);

  const adminOrdersPage = await fetchText(adminSession, "/admin/orders");
  assert.equal(adminOrdersPage.response.status, 200, "Admin orders page should render.");
  assert.match(adminOrdersPage.text, /data-storefront-root|BookStore|root/i);

  const orders = await fetchJson<{
    data: Array<{
      orderNumber: string;
      status: string;
      paymentStatus: string;
      paymentMethod: string;
    }>;
  }>(adminSession, "/api/v1/admin/orders");

  assert.ok(orders.data.length > 0, "Admin orders API should return seeded or test orders.");

  const seededTransferOrder = orders.data.find(
    (order) => order.paymentMethod === "BANK_TRANSFER" && order.paymentStatus !== "PAID",
  ) ?? orders.data[0];
  assert.ok(seededTransferOrder, "Expected an order to inspect.");

  const detail = await fetchJson<{
    data: {
      orderNumber: string;
      items: unknown[];
      payments: unknown[];
    };
  }>(adminSession, `/api/v1/admin/orders/${seededTransferOrder.orderNumber}`);
  assert.equal(detail.data.orderNumber, seededTransferOrder.orderNumber, "Order detail should match list item.");
  assert.ok(detail.data.items.length > 0, "Order detail should include items.");

  const csrf = await getCsrfToken(adminSession);
  const transitionTarget =
    seededTransferOrder.status === "CONFIRMED" ? "PACKED" : "CONFIRMED";

  const statusUpdateResponse = await request(
    adminSession,
    `/api/v1/admin/orders/${seededTransferOrder.orderNumber}/status`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": csrf,
      },
      body: JSON.stringify({
        status: transitionTarget,
      }),
    },
  );

  if (seededTransferOrder.paymentMethod === "BANK_TRANSFER" && transitionTarget === "CONFIRMED") {
    assert.equal(statusUpdateResponse.status, 409, "Bank transfer order should block CONFIRMED before payment verification.");
  } else {
    assert.equal(statusUpdateResponse.status, 200, "Valid status transition should succeed.");
  }

  const noteValue = `ops-note-${randomUUID().slice(0, 8)}`;
  const noteResponse = await request(
    adminSession,
    `/api/v1/admin/orders/${seededTransferOrder.orderNumber}/internal-note`,
    {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": csrf,
      },
      body: JSON.stringify({
        internalNote: noteValue,
      }),
    },
  );
  assert.equal(noteResponse.status, 200, "Updating internal note should succeed.");

  const notePayload = await noteResponse.json() as { data: { internalNote?: string | null } };
  assert.equal(notePayload.data.internalNote, noteValue);

  const markTransferOrder = orders.data.find(
    (order) => order.paymentMethod === "BANK_TRANSFER" && order.paymentStatus !== "PAID",
  );

  let verifiedOrderNumber: string | null = null;
  if (markTransferOrder) {
    const markResponse = await request(
      adminSession,
      `/api/v1/admin/orders/${markTransferOrder.orderNumber}/bank-transfer/mark-received`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrf,
        },
        body: JSON.stringify({
          externalReference: `OPS-${randomUUID().slice(0, 6)}`,
          note: "part9 verification",
          proofUrl: "https://example.com/proof.png",
        }),
      },
    );
    assert.equal(markResponse.status, 200, "Bank transfer verification should succeed.");
    verifiedOrderNumber = markTransferOrder.orderNumber;
  }

  const codOrder = await prisma.order.create({
    data: {
      orderNumber: `ORD-PART9-${randomUUID().slice(0, 8).toUpperCase()}`,
      paymentMethod: "COD",
      paymentStatus: "PENDING",
      status: "PLACED",
      currency: "VND",
      itemCount: 1,
      subtotalAmount: 100000,
      shippingFeeAmount: 30000,
      totalAmount: 130000,
      customerFullName: "Part 9 Ops",
      customerPhoneNumber: "0901234567",
      customerEmail: "part9@bookverse.local",
      address: {
        create: {
          recipientName: "Part 9 Ops",
          phoneNumber: "0901234567",
          addressLine1: "123 Test Street",
          district: "Quan 1",
          province: "Ho Chi Minh",
        },
      },
      items: {
        create: {
          bookSlug: "manual-part9",
          bookTitle: "Manual Part 9",
          authorName: "Test Author",
          publisherName: "Test Publisher",
          quantity: 1,
          unitPriceAmount: 100000,
          lineSubtotalAmount: 100000,
          lineTotalAmount: 130000,
          shippingFeeAmount: 30000,
          currency: "VND",
        },
      },
      paymentRecords: {
        create: {
          status: "PENDING",
          method: "COD",
          amount: 130000,
          currency: "VND",
          attemptNumber: 1,
        },
      },
    },
  });

  const cancelResponse = await request(
    adminSession,
    `/api/v1/admin/orders/${codOrder.orderNumber}/cancel`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": csrf,
      },
      body: JSON.stringify({
        reason: "part9 cancel verification",
      }),
    },
  );
  assert.equal(cancelResponse.status, 200, "Admin cancel should succeed.");

  const cancelledOrder = await prisma.order.findUniqueOrThrow({
    where: { orderNumber: codOrder.orderNumber },
    select: {
      status: true,
      cancellationReason: true,
    },
  });
  assert.equal(cancelledOrder.status, "CANCELLED");
  assert.equal(cancelledOrder.cancellationReason, "part9 cancel verification");

  console.log(
    JSON.stringify(
      {
        passed: true,
        listedOrders: orders.data.length,
        inspectedOrderNumber: seededTransferOrder.orderNumber,
        verifiedOrderNumber,
        cancelledOrderNumber: codOrder.orderNumber,
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
