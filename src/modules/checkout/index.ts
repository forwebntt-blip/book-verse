import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { requireAdminPermission } from "../../shared/security/rbac";
import { successResponse } from "../../shared/utils/api-response";
import { renderPage } from "../../shared/view/render";
import {
  parseCancelOrderPayload,
  parseCheckoutPaymentPayload,
  parseCheckoutShippingPayload,
  parseMarkBankTransferReceivedPayload,
  parsePlaceOrderPayload,
} from "./checkout.query";
import { CheckoutService } from "./checkout.service";

const checkoutService = new CheckoutService();

function getCheckoutIdentity(req: {
  session?: {
    cartId?: string;
    checkoutAttemptId?: string;
  };
  sessionID?: string;
  authContext?: { userId?: string | null };
}) {
  return {
    existingCartId: req.session?.cartId,
    existingCheckoutAttemptId: req.session?.checkoutAttemptId,
    sessionId: req.sessionID,
    userId: req.authContext?.userId,
  };
}

function buildRequestContext(req: {
  context: { requestId: string; sessionId?: string };
  authContext: { userId?: string | null };
}) {
  return {
    requestId: req.context.requestId,
    sessionId: req.context.sessionId,
    userId: req.authContext.userId,
  };
}

function syncCheckoutSession(req: { session: { checkoutAttemptId?: string } }, checkoutAttemptId: string) {
  req.session.checkoutAttemptId = checkoutAttemptId;
}

function syncOrderSession(
  req: { session: { lastPlacedOrderNumber?: string; checkoutAttemptId?: string } },
  orderNumber: string,
) {
  req.session.lastPlacedOrderNumber = orderNumber;
  req.session.checkoutAttemptId = undefined;
}

function getOrderNumberParam(req: { params?: Record<string, string | string[] | undefined> }): string {
  const value = req.params?.orderNumber;

  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export function createCheckoutStorefrontRouter(): Router {
  const router = Router();

  router.get("/checkout", async (req, res, next) => {
    try {
      const { attempt, warnings } = await checkoutService.startCheckout({
        identity: getCheckoutIdentity(req),
        requestContext: buildRequestContext(req),
      });

      syncCheckoutSession(req, attempt.id);
      renderPage(req, res, "pages/checkout", checkoutService.buildCheckoutPageModel(attempt, warnings));
    } catch (error) {
      next(error);
    }
  });

  router.post("/checkout/shipping-info", async (req, res, next) => {
    try {
      const attempt = await checkoutService.saveShippingInfo({
        identity: getCheckoutIdentity(req),
        payload: parseCheckoutShippingPayload(req.body),
        requestContext: buildRequestContext(req),
      });

      syncCheckoutSession(req, attempt.id);
      req.session.flash = {
        type: "success",
        message: "Da luu thong tin giao hang.",
      };
      res.redirect("/checkout");
    } catch (error) {
      next(error);
    }
  });

  router.post("/checkout/payment-method", async (req, res, next) => {
    try {
      const attempt = await checkoutService.savePaymentMethod({
        identity: getCheckoutIdentity(req),
        payload: parseCheckoutPaymentPayload(req.body),
        requestContext: buildRequestContext(req),
      });

      syncCheckoutSession(req, attempt.id);
      req.session.flash = {
        type: "success",
        message: "Da luu phuong thuc thanh toan.",
      };
      res.redirect("/checkout");
    } catch (error) {
      next(error);
    }
  });

  router.post("/orders", async (req, res, next) => {
    try {
      const order = await checkoutService.placeOrder({
        identity: getCheckoutIdentity(req),
        payload: parsePlaceOrderPayload(req.body),
        requestContext: buildRequestContext(req),
      });

      syncOrderSession(req, order.orderNumber);
      req.session.cartId = undefined;
      req.session.cartItemCount = 0;
      req.session.flash = {
        type: "success",
        message: `Da tao don hang ${order.orderNumber}.`,
      };
      res.redirect(`/orders/${order.orderNumber}/success`);
    } catch (error) {
      next(error);
    }
  });

  router.get("/orders/:orderNumber/success", async (req, res, next) => {
    try {
      const order = await checkoutService.getOrderForViewer({
        orderNumber: getOrderNumberParam(req),
        viewerUserId: req.authContext.userId,
        viewerRole: req.authContext.role,
        viewerSessionId: req.sessionID,
      });
      renderPage(req, res, "pages/order-success", checkoutService.buildOrderSuccessPageModel(order));
    } catch (error) {
      next(error);
    }
  });

  router.get("/orders/:orderNumber", async (req, res, next) => {
    try {
      const order = await checkoutService.getOrderForViewer({
        orderNumber: getOrderNumberParam(req),
        viewerUserId: req.authContext.userId,
        viewerRole: req.authContext.role,
        viewerSessionId: req.sessionID,
      });
      renderPage(req, res, "pages/order-detail", {
        ...checkoutService.buildOrderDetailPageModel(order),
        continueActionLabel: "Tiep tuc mua sach",
        cancelActionHref: `/orders/${order.orderNumber}/cancel`,
        cancelReturnTo: `/orders/${order.orderNumber}`,
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/orders/:orderNumber/cancel", async (req, res, next) => {
    try {
      const orderNumber = getOrderNumberParam(req);
      const order = await checkoutService.cancelOrderForViewer({
        orderNumber,
        reason: parseCancelOrderPayload(req.body).reason,
        requestContext: buildRequestContext(req),
        viewerUserId: req.authContext.userId,
        viewerRole: req.authContext.role,
        viewerSessionId: req.sessionID,
      });

      req.session.flash = {
        type: "success",
        message: `Da huy don ${order.orderNumber}.`,
      };
      res.redirect(typeof req.body?.returnTo === "string" ? req.body.returnTo : `/orders/${order.orderNumber}`);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export function createCheckoutModuleRouter(): Router {
  const router = Router();

  const postStart = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { attempt, warnings } = await checkoutService.startCheckout({
        identity: getCheckoutIdentity(req),
        requestContext: buildRequestContext(req),
      });

      syncCheckoutSession(req, attempt.id);
      res.json(
        successResponse(checkoutService.buildCheckoutPageModel(attempt, warnings).checkout, {
          warnings,
        }),
      );
    } catch (error) {
      next(error);
    }
  };

  const postShippingInfo = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const attempt = await checkoutService.saveShippingInfo({
        identity: getCheckoutIdentity(req),
        payload: parseCheckoutShippingPayload(req.body),
        requestContext: buildRequestContext(req),
      });

      syncCheckoutSession(req, attempt.id);
      res.json(successResponse(checkoutService.buildCheckoutPageModel(attempt).checkout));
    } catch (error) {
      next(error);
    }
  };

  const postPaymentMethod = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const attempt = await checkoutService.savePaymentMethod({
        identity: getCheckoutIdentity(req),
        payload: parseCheckoutPaymentPayload(req.body),
        requestContext: buildRequestContext(req),
      });

      syncCheckoutSession(req, attempt.id);
      res.json(successResponse(checkoutService.buildCheckoutPageModel(attempt).checkout));
    } catch (error) {
      next(error);
    }
  };

  const getSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { attempt, warnings } = await checkoutService.getCheckoutSummary({
        identity: getCheckoutIdentity(req),
        requestContext: buildRequestContext(req),
      });

      syncCheckoutSession(req, attempt.id);
      res.json(
        successResponse(checkoutService.buildCheckoutPageModel(attempt, warnings).checkout, {
          warnings,
        }),
      );
    } catch (error) {
      next(error);
    }
  };

  router.post("/start", postStart);
  router.post("/checkout/start", postStart);

  router.post("/shipping-info", postShippingInfo);
  router.post("/checkout/shipping-info", postShippingInfo);

  router.post("/payment-method", postPaymentMethod);
  router.post("/checkout/payment-method", postPaymentMethod);

  router.get("/summary", getSummary);
  router.get("/checkout/summary", getSummary);

  router.post("/orders", async (req, res, next) => {
    try {
      const order = await checkoutService.placeOrder({
        identity: getCheckoutIdentity(req),
        payload: parsePlaceOrderPayload(req.body),
        requestContext: buildRequestContext(req),
      });

      syncOrderSession(req, order.orderNumber);
      req.session.cartId = undefined;
      req.session.cartItemCount = 0;
      res.json(successResponse(checkoutService.buildOrderSuccessPageModel(order).order));
    } catch (error) {
      next(error);
    }
  });

  router.get("/orders/:orderNumber", async (req, res, next) => {
    try {
      const order = await checkoutService.getOrderForViewer({
        orderNumber: getOrderNumberParam(req),
        viewerUserId: req.authContext.userId,
        viewerRole: req.authContext.role,
        viewerSessionId: req.sessionID,
      });
      res.json(successResponse(checkoutService.buildOrderDetailPageModel(order).order));
    } catch (error) {
      next(error);
    }
  });

  router.post("/orders/:orderNumber/cancel", async (req, res, next) => {
    try {
      const order = await checkoutService.cancelOrderForViewer({
        orderNumber: getOrderNumberParam(req),
        reason: parseCancelOrderPayload(req.body).reason,
        requestContext: buildRequestContext(req),
        viewerUserId: req.authContext.userId,
        viewerRole: req.authContext.role,
        viewerSessionId: req.sessionID,
      });
      res.json(successResponse(checkoutService.buildOrderDetailPageModel(order).order));
    } catch (error) {
      next(error);
    }
  });

  router.post(
    "/orders/:orderNumber/bank-transfer/mark-received",
    requireAdminPermission(),
    async (req, res, next) => {
      try {
        const payload = parseMarkBankTransferReceivedPayload(req.body);
        const order = await checkoutService.markBankTransferReceived({
          orderNumber: getOrderNumberParam(req),
          externalReference: payload.externalReference,
          note: payload.note,
          requestContext: buildRequestContext(req),
        });

        res.json(successResponse(checkoutService.buildOrderDetailPageModel(order).order));
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
