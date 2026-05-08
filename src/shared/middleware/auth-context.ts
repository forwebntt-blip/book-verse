import type { NextFunction, Request, Response } from "express";
import {
  getAnonymousAuthContext,
  type AuthContext,
} from "../security/auth-context";

export function authContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const auth = (req.session?.auth as AuthContext | undefined) ?? getAnonymousAuthContext();

  req.authContext = auth;
  res.locals.auth = auth;

  next();
}
