import type { Request } from "express";
import { Router } from "express";
import { successResponse } from "../../shared/utils/api-response";
import { renderPage } from "../../shared/view/render";
import { parseSearchSelectionQuery } from "../search/search.query";
import { SearchRepository } from "../search/search.repository";
import { SearchService } from "../search/search.service";
import { parseCatalogQuery } from "./catalog.query";
import { CatalogRepository } from "./catalog.repository";
import { CatalogService } from "./catalog.service";

const catalogRepository = new CatalogRepository();
const catalogService = new CatalogService(catalogRepository);
const searchService = new SearchService(catalogRepository, new SearchRepository());

async function captureSearchSelectionFromRequest(
  req: Request,
  book: {
    id: string;
    slug: string;
    title: string;
  },
): Promise<void> {
  const selectionQuery = parseSearchSelectionQuery(req.query);

  if (!selectionQuery.searchLogId || !selectionQuery.searchRank) {
    return;
  }

  await searchService.captureSearchSelection({
    requestId: req.context.requestId,
    sessionId: req.context.sessionId,
    userId: req.authContext.userId,
    searchLogId: selectionQuery.searchLogId,
    selectedRank: selectionQuery.searchRank,
    searchSource: selectionQuery.searchSource,
    bookId: book.id,
    bookSlug: book.slug,
    title: book.title,
  });
}

export function createCatalogStorefrontRouter(): Router {
  const router = Router();

  router.get("/", async (req, res, next) => {
    try {
      const page = await catalogService.getHomePageData();
      renderPage(req, res, "pages/home", page);
    } catch (error) {
      next(error);
    }
  });

  router.get("/books", async (req, res, next) => {
    try {
      const page = await catalogService.getListingPageData(
        { type: "all" },
        parseCatalogQuery(req.query),
      );
      renderPage(req, res, "pages/catalog-listing", page);
    } catch (error) {
      next(error);
    }
  });

  router.get("/categories/:slug", async (req, res, next) => {
    try {
      const page = await catalogService.getListingPageData(
        { type: "category", slug: req.params.slug },
        parseCatalogQuery(req.query),
      );
      renderPage(req, res, "pages/catalog-listing", page);
    } catch (error) {
      next(error);
    }
  });

  router.get("/collections/:slug", async (req, res, next) => {
    try {
      const page = await catalogService.getListingPageData(
        { type: "collection", slug: req.params.slug },
        parseCatalogQuery(req.query),
      );
      renderPage(req, res, "pages/catalog-listing", page);
    } catch (error) {
      next(error);
    }
  });

  router.get("/books/:slug", async (req, res, next) => {
    try {
      const page = await catalogService.getBookDetailPageData(req.params.slug);
      await captureSearchSelectionFromRequest(req, {
        id: page.book.id,
        slug: page.book.slug,
        title: page.book.title,
      });
      renderPage(req, res, "pages/book-detail", page);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export function createCatalogModuleRouter(): Router {
  const router = Router();

  router.get("/catalog/_placeholder", (_req, res) => {
    res.json(
      successResponse({
        module: "catalog",
        status: "ready-for-part-3",
      }),
    );
  });

  router.get("/home", async (_req, res, next) => {
    try {
      res.json(successResponse(await catalogService.getHomePageData()));
    } catch (error) {
      next(error);
    }
  });

  router.get("/books", async (req, res, next) => {
    try {
      const page = await catalogService.getListingPageData(
        { type: "all" },
        parseCatalogQuery(req.query),
      );
      res.json(successResponse(page));
    } catch (error) {
      next(error);
    }
  });

  router.get("/books/:slug", async (req, res, next) => {
    try {
      const page = await catalogService.getBookDetailPageData(req.params.slug);
      await captureSearchSelectionFromRequest(req, {
        id: page.book.id,
        slug: page.book.slug,
        title: page.book.title,
      });
      res.json(successResponse(page));
    } catch (error) {
      next(error);
    }
  });

  router.get("/categories", async (_req, res, next) => {
    try {
      res.json(successResponse(await catalogService.getCategoriesSummary()));
    } catch (error) {
      next(error);
    }
  });

  router.get("/categories/:slug", async (req, res, next) => {
    try {
      const page = await catalogService.getListingPageData(
        { type: "category", slug: req.params.slug },
        parseCatalogQuery(req.query),
      );
      res.json(successResponse(page));
    } catch (error) {
      next(error);
    }
  });

  router.get("/collections/:slug", async (req, res, next) => {
    try {
      const page = await catalogService.getListingPageData(
        { type: "collection", slug: req.params.slug },
        parseCatalogQuery(req.query),
      );
      res.json(successResponse(page));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
