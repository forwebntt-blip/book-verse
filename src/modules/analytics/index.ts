import { Router } from "express";
import { requireAdminPermission } from "../../shared/security/rbac";
import { successResponse } from "../../shared/utils/api-response";
import { parseAnalyticsEventsPayload, parseAnalyticsIdentifyPayload } from "./analytics.query";
import { AnalyticsService } from "./analytics.service";

const analyticsService = new AnalyticsService();

export function createAnalyticsModuleRouter(): Router {
  const router = Router();

  router.get("/_placeholder", (_req, res) => {
    res.json({
      success: true,
      data: {
        module: "analytics",
        status: "ready-for-part-10",
      },
    });
  });

  router.post("/events", async (req, res, next) => {
    try {
      const result = await analyticsService.ingestEvents(parseAnalyticsEventsPayload(req.body), {
        requestId: req.context.requestId,
        sessionId: req.context.sessionId,
        userId: req.authContext.userId,
      });
      res.status(202).json(successResponse(result));
    } catch (error) {
      next(error);
    }
  });

  router.post("/identify", async (req, res, next) => {
    try {
      const result = await analyticsService.identifySession(parseAnalyticsIdentifyPayload(req.body), {
        sessionId: req.context.sessionId,
        userId: req.authContext.userId,
      });
      res.status(202).json(successResponse(result));
    } catch (error) {
      next(error);
    }
  });

  router.post("/flush-critical", requireAdminPermission("ANALYTICS_VIEW"), async (_req, res, next) => {
    try {
      res.json(successResponse(await analyticsService.flushCriticalEvents()));
    } catch (error) {
      next(error);
    }
  });

  router.get("/dashboard", requireAdminPermission("ANALYTICS_VIEW"), async (_req, res, next) => {
    try {
      res.json(successResponse(await analyticsService.buildDashboard()));
    } catch (error) {
      next(error);
    }
  });

  router.get("/recommendations", requireAdminPermission("ANALYTICS_VIEW"), async (_req, res, next) => {
    try {
      res.json(successResponse(await analyticsService.buildRecommendationSnapshot()));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
