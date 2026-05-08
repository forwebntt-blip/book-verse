import type { Express } from "express";
import { Router } from "express";
import { createAdminModuleRouter } from "./admin";
import { createAnalyticsModuleRouter } from "./analytics";
import { createAuthModuleRouter } from "./auth";
import { createCartModuleRouter } from "./cart";
import { createCatalogModuleRouter } from "./catalog";
import { createCheckoutModuleRouter } from "./checkout";
import { createContentOpsModuleRouter } from "./content-ops";
import { createSearchModuleRouter } from "./search";

export function registerModuleRoutes(app: Express): void {
  const apiRouter = Router();

  apiRouter.use("/", createCatalogModuleRouter());
  apiRouter.use("/search", createSearchModuleRouter());
  apiRouter.use("/cart", createCartModuleRouter());
  apiRouter.use("/", createCheckoutModuleRouter());
  apiRouter.use("/", createAuthModuleRouter());
  apiRouter.use("/analytics", createAnalyticsModuleRouter());
  apiRouter.use("/content-ops", createContentOpsModuleRouter());
  apiRouter.use("/admin", createAdminModuleRouter());

  app.use("/api/v1", apiRouter);
}
