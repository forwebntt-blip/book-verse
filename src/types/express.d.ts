import type { CsrfToken } from "../shared/security/csrf";
import type { RequestContext } from "../shared/middleware/request-context";
import type { AuthContext } from "../shared/security/auth-context";

declare module "express-session" {
  interface SessionData {
    csrfToken?: string;
    cartId?: string;
    cartItemCount?: number;
    initializedAt?: string;
    auth?: AuthContext;
    checkoutAttemptId?: string;
    lastPlacedOrderNumber?: string;
    flash?: {
      type: "success" | "danger" | "warning" | "info";
      message: string;
    } | null;
  }
}

declare global {
  namespace Express {
    interface Request {
      context: RequestContext;
      authContext: AuthContext;
      csrfToken: (overwrite?: boolean) => string;
    }

    interface Locals {
      appName: string;
      appBaseUrl: string;
      env: string;
      requestId: string;
      csrfToken: CsrfToken;
      currentPath: string;
      currentUrl: string;
      auth: AuthContext;
      cartItemCount: number;
      flash?: {
        type: "success" | "danger" | "warning" | "info";
        message: string;
      } | null;
    }
  }
}

export {};
