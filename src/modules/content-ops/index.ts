import { Router } from "express";
import { requireAdminPermission } from "../../shared/security/rbac";
import { successResponse } from "../../shared/utils/api-response";
import { ContentOpsService } from "./content-ops.service";
import { parseAdminListQuery } from "../admin/admin.query";

const contentOpsService = new ContentOpsService();

export function createContentOpsModuleRouter(): Router {
  const router = Router();

  router.get("/_placeholder", (_req, res) => {
    res.json({
      success: true,
      data: {
        module: "content-ops",
        status: "ready-for-part-8",
      },
    });
  });

  router.get("/overview", requireAdminPermission("CONTENT_REVIEW"), async (req, res, next) => {
    try {
      const query = parseAdminListQuery(req.query);
      res.json(
        successResponse(
          await contentOpsService.listFilteredContentOpsOverview({
            q: query.q,
            stagedStatus: query.stagedStatus,
          }),
        ),
      );
    } catch (error) {
      next(error);
    }
  });

  return router;
}
