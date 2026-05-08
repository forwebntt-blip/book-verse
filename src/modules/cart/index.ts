import { Router } from "express";
import { successResponse } from "../../shared/utils/api-response";
import { renderPage } from "../../shared/view/render";
import {
  buildReturnToPath,
  parseCartItemMutationInput,
  parseCartItemUpdateInput,
  parseCartMergeInput,
} from "./cart.query";
import { CartService } from "./cart.service";

const cartService = new CartService();

function getCartIdentity(req: {
  session?: { cartId?: string };
  sessionID?: string;
  authContext?: { userId?: string | null };
  context?: { requestId: string; sessionId?: string };
}) {
  return {
    existingCartId: req.session?.cartId,
    sessionId: req.sessionID,
    userId: req.authContext?.userId,
  };
}

function syncCartSessionState(
  req: {
    session: {
      cartId?: string;
      cartItemCount?: number;
      flash?: {
        type: "success" | "danger" | "warning" | "info";
        message: string;
      } | null;
    };
  },
  cart: { id: string; itemCount: number },
) {
  req.session.cartId = cart.id;
  req.session.cartItemCount = cart.itemCount;
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

export function createCartStorefrontRouter(): Router {
  const router = Router();

  router.get("/cart", async (req, res, next) => {
    try {
      const { cart, page } = await cartService.getCartPageModel({
        ...getCartIdentity(req),
        requestContext: buildRequestContext(req),
      });

      syncCartSessionState(req, cart);
      renderPage(req, res, "pages/cart", page);
    } catch (error) {
      next(error);
    }
  });

  router.post("/cart/items", async (req, res, next) => {
    try {
      const result = await cartService.addItem({
        ...getCartIdentity(req),
        payload: parseCartItemMutationInput(req.body),
        requestContext: buildRequestContext(req),
      });

      syncCartSessionState(req, result.cart);
      req.session.flash = {
        type: result.warnings.length > 0 ? "warning" : "success",
        message:
          result.warnings.length > 0
            ? result.warnings[0].message
            : "Da them sach vao gio hang.",
      };

      res.redirect(buildReturnToPath(req.body.returnTo));
    } catch (error) {
      next(error);
    }
  });

  router.post("/cart/items/:itemId", async (req, res, next) => {
    try {
      const result = await cartService.updateItemQuantity({
        ...getCartIdentity(req),
        payload: parseCartItemUpdateInput(req.params.itemId, req.body),
        requestContext: buildRequestContext(req),
      });

      syncCartSessionState(req, result.cart);
      req.session.flash = {
        type: result.warnings.length > 0 ? "warning" : "success",
        message:
          result.warnings.length > 0
            ? result.warnings[0].message
            : "Da cap nhat so luong trong gio hang.",
      };

      res.redirect(buildReturnToPath(req.body.returnTo));
    } catch (error) {
      next(error);
    }
  });

  router.post("/cart/items/:itemId/delete", async (req, res, next) => {
    try {
      const cart = await cartService.removeItem({
        ...getCartIdentity(req),
        itemId: req.params.itemId,
        requestContext: buildRequestContext(req),
      });

      syncCartSessionState(req, cart);
      req.session.flash = {
        type: "success",
        message: "Da xoa sach khoi gio hang.",
      };

      res.redirect(buildReturnToPath(req.body.returnTo));
    } catch (error) {
      next(error);
    }
  });

  router.post("/cart/recalculate", async (req, res, next) => {
    try {
      const result = await cartService.recalculate({
        ...getCartIdentity(req),
        requestContext: buildRequestContext(req),
      });

      syncCartSessionState(req, result.cart);
      req.session.flash = {
        type: result.warnings.length > 0 ? "warning" : "success",
        message:
          result.warnings.length > 0
            ? result.warnings[0].message
            : "Da tinh lai gio hang theo du lieu moi nhat.",
      };

      res.redirect(buildReturnToPath(req.body.returnTo));
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export function createCartModuleRouter(): Router {
  const router = Router();

  router.get("/", async (req, res, next) => {
    try {
      const { cart, view } = await cartService.getCartView({
        ...getCartIdentity(req),
        requestContext: buildRequestContext(req),
      });

      syncCartSessionState(req, cart);
      res.json(successResponse(view));
    } catch (error) {
      next(error);
    }
  });

  router.post("/items", async (req, res, next) => {
    try {
      const result = await cartService.addItem({
        ...getCartIdentity(req),
        payload: parseCartItemMutationInput(req.body),
        requestContext: buildRequestContext(req),
      });

      syncCartSessionState(req, result.cart);
      res.json(
        successResponse(cartService.buildCartViewModel(result.cart, result.warnings), {
          warnings: result.warnings,
        }),
      );
    } catch (error) {
      next(error);
    }
  });

  router.patch("/items/:itemId", async (req, res, next) => {
    try {
      const result = await cartService.updateItemQuantity({
        ...getCartIdentity(req),
        payload: parseCartItemUpdateInput(req.params.itemId, req.body),
        requestContext: buildRequestContext(req),
      });

      syncCartSessionState(req, result.cart);
      res.json(
        successResponse(cartService.buildCartViewModel(result.cart, result.warnings), {
          warnings: result.warnings,
        }),
      );
    } catch (error) {
      next(error);
    }
  });

  router.delete("/items/:itemId", async (req, res, next) => {
    try {
      const cart = await cartService.removeItem({
        ...getCartIdentity(req),
        itemId: req.params.itemId,
        requestContext: buildRequestContext(req),
      });

      syncCartSessionState(req, cart);
      res.json(successResponse(cartService.buildCartViewModel(cart)));
    } catch (error) {
      next(error);
    }
  });

  router.post("/recalculate", async (req, res, next) => {
    try {
      const result = await cartService.recalculate({
        ...getCartIdentity(req),
        requestContext: buildRequestContext(req),
      });

      syncCartSessionState(req, result.cart);
      res.json(
        successResponse(cartService.buildCartViewModel(result.cart, result.warnings), {
          warnings: result.warnings,
        }),
      );
    } catch (error) {
      next(error);
    }
  });

  router.post("/merge", async (req, res, next) => {
    try {
      const { sourceCartId } = parseCartMergeInput(req.body);
      const userId = req.authContext.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: "AUTH_REQUIRED",
            message: "Authentication is required to merge carts.",
          },
        });
        return;
      }

      const result = await cartService.mergeCarts({
        ...getCartIdentity(req),
        userId,
        sourceCartId,
        requestContext: buildRequestContext(req),
      });

      syncCartSessionState(req, result.cart);
      res.json(
        successResponse(cartService.buildCartViewModel(result.cart, result.warnings), {
          warnings: result.warnings,
        }),
      );
    } catch (error) {
      next(error);
    }
  });

  return router;
}
