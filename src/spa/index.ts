import fs from "node:fs/promises";
import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import { paths } from "../config/paths";

const STOREFRONT_ROUTES = [
  "/",
  "/books",
  "/collections",
  "/login",
  "/register",
  "/account",
  "/account/orders",
  "/account/orders/:orderNumber",
  "/admin",
  "/admin/catalog",
  "/admin/orders",
  "/admin/analytics",
  "/checkout",
  "/orders/:orderNumber",
  "/orders/:orderNumber/success",
  "/books/:slug",
  "/categories/:slug",
  "/collections/:slug",
] as const;

async function sendSpaShell(_req: Request, res: Response, next: NextFunction) {
  try {
    const html = await fs.readFile(paths.clientIndex, "utf8");
    res.status(200).type("html").send(html);
  } catch (error) {
    next(error);
  }
}

export function createSpaStorefrontRouter(): Router {
  const router = Router();

  for (const route of STOREFRONT_ROUTES) {
    router.get(route, sendSpaShell);
  }

  return router;
}
