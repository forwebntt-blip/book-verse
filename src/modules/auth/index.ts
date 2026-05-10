import type { Request, Response } from "express";
import { Router } from "express";
import { CartService } from "../cart/cart.service";
import { CheckoutService } from "../checkout/checkout.service";
import { successResponse } from "../../shared/utils/api-response";
import { renderPage } from "../../shared/view/render";
import { requireAuthenticatedUser } from "../../shared/security/rbac";
import { AppError } from "../../shared/errors/app-error";
import { makeMoney } from "../../shared/utils/money";
import {
  buildAccountOrdersPageModel,
  buildAccountPageModel,
  buildLoginPageModel,
  buildRegisterPageModel,
} from "./auth.page-models";
import { AuthService } from "./auth.service";
import {
  buildSafeAuthReturnToPath,
  parseAccountProfileUpdatePayload,
  parseLoginPayload,
  parseRegisterPayload,
} from "./auth.query";
import type { AccountProfileViewModel } from "./auth.types";

const authService = new AuthService();
const cartService = new CartService();
const checkoutService = new CheckoutService();

function getRequestContext(req: Request) {
  return {
    requestId: req.context.requestId,
    sessionId: req.sessionID,
    userId: req.authContext.userId,
  };
}

function getCurrentReturnTo(req: Request): string {
  return buildSafeAuthReturnToPath(req.query.returnTo);
}

function requireStorefrontAuthentication(req: Request, res: Response): boolean {
  if (req.authContext.isAuthenticated && req.authContext.userId) {
    return true;
  }

  req.session.flash = {
    type: "warning",
    message: "H?y ??ng nh?p ?? ti?p t?c.",
  };
  res.redirect(`/login?returnTo=${encodeURIComponent(req.originalUrl)}`);
  return false;
}

function regenerateSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function saveSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.save((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function syncAuthenticatedSession(
  req: Request,
  user: Awaited<ReturnType<AuthService["login"]>>,
  options: {
    previousCartId?: string;
  } = {},
): Promise<void> {
  req.session.auth = authService.buildAuthContext(user);

  if (!options.previousCartId) {
    req.session.cartId = undefined;
    req.session.cartItemCount = 0;
    return;
  }

  const merged = await cartService.mergeCarts({
    existingCartId: req.session.cartId,
    sessionId: req.sessionID,
    userId: user.id,
    sourceCartId: options.previousCartId,
    requestContext: {
      requestId: req.context.requestId,
      sessionId: req.sessionID,
      userId: user.id,
    },
  });

  req.session.cartId = merged.cart.id;
  req.session.cartItemCount = merged.cart.itemCount;
}

function buildOrderViewer(req: Request) {
  return {
    viewerUserId: req.authContext.userId ?? undefined,
    viewerRole: req.authContext.role ?? undefined,
    viewerSessionId: req.sessionID,
  };
}

function buildOrderReturnTo(req: Request, fallback: string): string {
  const value =
    typeof req.body?.returnTo === "string" ? req.body.returnTo.trim() : undefined;

  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}

export function createAuthStorefrontRouter(): Router {
  const router = Router();

  router.get("/login", (req, res) => {
    renderPage(req, res, "pages/auth-login", buildLoginPageModel(getCurrentReturnTo(req)));
  });

  router.post("/login", async (req, res, next) => {
    try {
      const payload = parseLoginPayload(req.body);
      const previousCartId = req.session.cartId;
      const user = await authService.login(payload);

      await regenerateSession(req);
      await syncAuthenticatedSession(req, user, {
        previousCartId,
      });

      req.session.flash = {
        type: "success",
        message: "??ng nh?p th?nh c?ng.",
      };
      await saveSession(req);
      res.redirect(
        user.role === "ADMIN" || user.role === "CONTENT_EDITOR" || user.role === "OPS"
          ? "/admin"
          : (payload.returnTo ?? "/account"),
      );
    } catch (error) {
      next(error);
    }
  });

  router.get("/register", (req, res) => {
    renderPage(req, res, "pages/auth-register", buildRegisterPageModel(getCurrentReturnTo(req)));
  });

  router.post("/register", async (req, res, next) => {
    try {
      const payload = parseRegisterPayload(req.body);
      const previousCartId = req.session.cartId;
      const registeredUser = await authService.register(payload);

      await regenerateSession(req);
      await syncAuthenticatedSession(req, registeredUser, {
        previousCartId,
      });

      req.session.flash = {
        type: "success",
        message: "?? t?o t?i kho?n v? ??ng nh?p th?nh c?ng.",
      };
      await saveSession(req);
      res.redirect(
        registeredUser.role === "ADMIN" ||
          registeredUser.role === "CONTENT_EDITOR" ||
          registeredUser.role === "OPS"
          ? "/admin"
          : (payload.returnTo ?? "/account"),
      );
    } catch (error) {
      next(error);
    }
  });

  router.post("/logout", async (req, res, next) => {
    try {
      await regenerateSession(req);
      req.session.flash = {
        type: "success",
        message: "?? ??ng xu?t kh?i t?i kho?n.",
      };
      await saveSession(req);
      res.redirect("/");
    } catch (error) {
      next(error);
    }
  });

  router.get("/account", async (req, res, next) => {
    try {
      if (!requireStorefrontAuthentication(req, res)) {
        return;
      }

      renderPage(req, res, "pages/account", await buildAccountPageModel(req.authContext.userId!));
    } catch (error) {
      next(error);
    }
  });

  router.get("/account/orders", async (req, res, next) => {
    try {
      if (!requireStorefrontAuthentication(req, res)) {
        return;
      }

      renderPage(req, res, "pages/account-orders", await buildAccountOrdersPageModel(req.authContext.userId!));
    } catch (error) {
      next(error);
    }
  });

  router.get("/account/orders/:orderNumber", async (req, res, next) => {
    try {
      if (!requireStorefrontAuthentication(req, res)) {
        return;
      }

      const order = await checkoutService.getOrderForViewer({
        orderNumber: req.params.orderNumber,
        ...buildOrderViewer(req),
      });

      renderPage(req, res, "pages/order-detail", {
        ...checkoutService.buildOrderDetailPageModel(order),
        continueShoppingHref: "/account/orders",
        continueActionLabel: "Quay l?i l?ch s? ??n",
        cancelActionHref: `/orders/${order.orderNumber}/cancel`,
        cancelReturnTo: `/account/orders/${order.orderNumber}`,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export function createAuthModuleRouter(): Router {
  const router = Router();

  router.post("/auth/register", async (req, res, next) => {
    try {
      const payload = parseRegisterPayload(req.body);
      const previousCartId = req.session.cartId;
      const user = await authService.register(payload);

      await regenerateSession(req);
      await syncAuthenticatedSession(req, user, {
        previousCartId,
      });

      await saveSession(req);
      res.status(201).json(
        successResponse({
          user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            permissions: user.permissions,
          },
        }),
      );
    } catch (error) {
      next(error);
    }
  });

  router.post("/auth/login", async (req, res, next) => {
    try {
      const payload = parseLoginPayload(req.body);
      const previousCartId = req.session.cartId;
      const user = await authService.login(payload);

      await regenerateSession(req);
      await syncAuthenticatedSession(req, user, {
        previousCartId,
      });

      await saveSession(req);
      res.json(
        successResponse({
          user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            permissions: user.permissions,
          },
        }),
      );
    } catch (error) {
      next(error);
    }
  });

  router.post("/auth/logout", async (req, res, next) => {
    try {
      await regenerateSession(req);
      await saveSession(req);
      res.json(successResponse({ loggedOut: true }));
    } catch (error) {
      next(error);
    }
  });

  router.get("/auth/me", async (req, res, next) => {
    try {
      res.json(successResponse(await authService.getMe(req.authContext)));
    } catch (error) {
      next(error);
    }
  });

  router.get("/account/orders", requireAuthenticatedUser, async (req, res, next) => {
    try {
      const userId = req.authContext.userId;

      if (!userId) {
        throw new AppError({
          statusCode: 401,
          code: "AUTH_REQUIRED",
          message: "B?n c?n ??ng nh?p ?? truy c?p t?i nguy?n n?y.",
        });
      }

      const orders = await checkoutService.listOrdersForUser(userId);
      res.json(
        successResponse({
          orders: orders.map((order) => ({
            orderNumber: order.orderNumber,
            status: order.status,
            paymentStatus: order.paymentStatus,
            paymentMethod: order.paymentMethod,
            itemCount: order.itemCount,
            total: makeMoney(order.totalAmount),
            placedAt: order.placedAt.toISOString(),
          })),
        }),
      );
    } catch (error) {
      next(error);
    }
  });

  router.get("/account/profile", requireAuthenticatedUser, async (req, res, next) => {
    try {
      const userId = req.authContext.userId;

      if (!userId) {
        throw new AppError({
          statusCode: 401,
          code: "AUTH_REQUIRED",
          message: "Ban can dang nhap de truy cap tai nguyen nay.",
        });
      }

      const profile = await authService.getProfile(userId);
      res.json(
        successResponse({
          profile: {
            id: profile.id,
            email: profile.email,
            fullName: profile.fullName,
            phoneNumber: profile.phoneNumber,
            role: profile.role,
          },
        }),
      );
    } catch (error) {
      next(error);
    }
  });

  router.patch("/account/profile", requireAuthenticatedUser, async (req, res, next) => {
    try {
      const userId = req.authContext.userId;

      if (!userId) {
        throw new AppError({
          statusCode: 401,
          code: "AUTH_REQUIRED",
          message: "Ban can dang nhap de truy cap tai nguyen nay.",
        });
      }

      const profile = await authService.updateProfile(
        userId,
        parseAccountProfileUpdatePayload(req.body),
      );

      res.json(
        successResponse({
          profile: {
            id: profile.id,
            email: profile.email,
            fullName: profile.fullName,
            phoneNumber: profile.phoneNumber,
            role: profile.role,
          },
        }),
      );
    } catch (error) {
      next(error);
    }
  });

  return router;
}
