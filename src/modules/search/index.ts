import { Router } from "express";
import { successResponse } from "../../shared/utils/api-response";
import { renderPage } from "../../shared/view/render";
import { CatalogRepository } from "../catalog/catalog.repository";
import { parseSearchQuery } from "./search.query";
import { SearchRepository } from "./search.repository";
import { SearchService } from "./search.service";

const catalogRepository = new CatalogRepository();
const searchService = new SearchService(catalogRepository, new SearchRepository());

export function createSearchStorefrontRouter(): Router {
  const router = Router();

  router.get("/search", async (req, res, next) => {
    try {
      const page = await searchService.getSearchPageData(parseSearchQuery(req.query), {
        requestId: req.context.requestId,
        sessionId: req.context.sessionId,
        userId: req.authContext.userId,
      });

      renderPage(req, res, "pages/search-results", page);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export function createSearchModuleRouter(): Router {
  const router = Router();

  router.get("/_placeholder", (_req, res) => {
    res.json(
      successResponse({
        module: "search",
        status: "implemented",
      }),
    );
  });

  router.get("/suggestions", async (req, res, next) => {
    try {
      const query = typeof req.query.q === "string" ? req.query.q : "";
      res.json(successResponse(await searchService.getSearchSuggestions(query)));
    } catch (error) {
      next(error);
    }
  });

  router.get("/", async (req, res, next) => {
    try {
      res.json(
        successResponse(
          await searchService.getSearchPageData(parseSearchQuery(req.query), {
            requestId: req.context.requestId,
            sessionId: req.context.sessionId,
            userId: req.authContext.userId,
          }),
        ),
      );
    } catch (error) {
      next(error);
    }
  });

  return router;
}
