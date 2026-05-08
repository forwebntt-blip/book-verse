import test from "node:test";
import assert from "node:assert/strict";

import { USER_ROLES } from "../../src/shared/contracts";
import { AppError } from "../../src/shared/errors/app-error";
import { CheckoutService } from "../../src/modules/checkout/checkout.service";

function makeOrderRecord(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "order-1",
    orderNumber: "ORD-20260504-ABC123",
    userId: "user-1",
    sessionId: "guest-session-1",
    sourceCartId: "cart-1",
    checkoutAttemptId: "checkout-1",
    paymentMethod: "COD",
    paymentStatus: "PENDING",
    status: "PLACED",
    totalAmount: 252000,
    ...overrides,
  };
}

test("getOrderForViewer allows the owning logged-in user and blocks other users", async () => {
  const service = new CheckoutService(
    {
      findOrderByOrderNumber: async () => makeOrderRecord(),
    } as never,
    {} as never,
  );

  const ownedOrder = await service.getOrderForViewer({
    orderNumber: "ORD-20260504-ABC123",
    viewerUserId: "user-1",
    viewerRole: USER_ROLES.CUSTOMER,
    viewerSessionId: "guest-session-2",
  });

  assert.equal(ownedOrder.orderNumber, "ORD-20260504-ABC123");

  await assert.rejects(
    () =>
      service.getOrderForViewer({
        orderNumber: "ORD-20260504-ABC123",
        viewerUserId: "user-2",
        viewerRole: USER_ROLES.CUSTOMER,
        viewerSessionId: "guest-session-2",
      }),
    (error: unknown) =>
      error instanceof AppError && error.code === "ORDER_ACCESS_DENIED",
  );
});

test("getOrderForViewer allows guest self-service only when the session matches the guest order", async () => {
  const service = new CheckoutService(
    {
      findOrderByOrderNumber: async () =>
        makeOrderRecord({
          userId: null,
          sessionId: "guest-session-1",
        }),
    } as never,
    {} as never,
  );

  const guestOrder = await service.getOrderForViewer({
    orderNumber: "ORD-20260504-ABC123",
    viewerSessionId: "guest-session-1",
  });

  assert.equal(guestOrder.sessionId, "guest-session-1");

  await assert.rejects(
    () =>
      service.getOrderForViewer({
        orderNumber: "ORD-20260504-ABC123",
        viewerSessionId: "guest-session-999",
      }),
    (error: unknown) =>
      error instanceof AppError && error.code === "ORDER_ACCESS_DENIED",
  );
});

test("cancelOrderForViewer delegates cancellation only for viewers allowed to access that order", async () => {
  let cancelCalled = false;
  const service = new CheckoutService(
    {
      findOrderByOrderNumber: async () => makeOrderRecord(),
      cancelOrder: async () => {
        cancelCalled = true;
        return makeOrderRecord({
          status: "CANCELLED",
        });
      },
      createCheckoutAnalytics: async () => undefined,
    } as never,
    {} as never,
  );

  const cancelledOrder = await service.cancelOrderForViewer({
    orderNumber: "ORD-20260504-ABC123",
    reason: "Thay doi nhu cau",
    requestContext: {
      requestId: "req-1",
      sessionId: "guest-session-2",
      userId: "user-1",
    },
    viewerUserId: "user-1",
    viewerRole: USER_ROLES.CUSTOMER,
    viewerSessionId: "guest-session-2",
  });

  assert.equal(cancelCalled, true);
  assert.equal(cancelledOrder.status, "CANCELLED");
});
