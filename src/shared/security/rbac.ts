import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/app-error";
import { USER_ROLES, type AdminPermission, type UserRole } from "../contracts";

const adminRoles: ReadonlySet<UserRole> = new Set([
  USER_ROLES.ADMIN,
  USER_ROLES.CONTENT_EDITOR,
  USER_ROLES.OPS,
]);

export function hasAdminRole(role?: UserRole | null): boolean {
  return Boolean(role && adminRoles.has(role));
}

export function requireAuthenticatedUser(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (!req.authContext.isAuthenticated) {
    next(
      new AppError({
        statusCode: 401,
        code: "AUTH_REQUIRED",
        message: "Authentication is required to access this resource.",
      }),
    );
    return;
  }

  next();
}

export function requireAdminPermission(permission?: AdminPermission) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.authContext.isAuthenticated || !req.authContext.role) {
      next(
        new AppError({
          statusCode: 401,
          code: "AUTH_REQUIRED",
          message: "Authentication is required to access this resource.",
        }),
      );
      return;
    }

    if (!hasAdminRole(req.authContext.role)) {
      next(
        new AppError({
          statusCode: 403,
          code: "ADMIN_REQUIRED",
          message: "Admin access is required to access this resource.",
        }),
      );
      return;
    }

    if (permission && !req.authContext.permissions.includes(permission)) {
      next(
        new AppError({
          statusCode: 403,
          code: "PERMISSION_DENIED",
          message: "You do not have permission to access this resource.",
        }),
      );
      return;
    }

    next();
  };
}
