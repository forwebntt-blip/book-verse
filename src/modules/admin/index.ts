import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import { hasAdminRole, requireAdminPermission } from "../../shared/security/rbac";
import { successResponse } from "../../shared/utils/api-response";
import { renderPage } from "../../shared/view/render";
import { AppError } from "../../shared/errors/app-error";
import { ContentOpsService } from "../content-ops/content-ops.service";
import {
  parseAdminListQuery,
  parseAdminOrderCancelPayload,
  parseAdminOrderNotePayload,
  parseAdminOrderPaymentPayload,
  parseAdminOrderStatusPayload,
  parseAuthorPayload,
  parseBookPayload,
  parseBookStatusPayload,
  parseCategoryPayload,
  parseCollectionPayload,
  parseImportJobPayload,
  parsePublisherPayload,
} from "./admin.query";
import { AdminService } from "./admin.service";

const adminService = new AdminService();
const contentOpsService = new ContentOpsService();

function getRouteParam(req: Request, name: string): string {
  const value = req.params[name];

  if (typeof value !== "string" || !value.trim()) {
    throw new AppError({
      statusCode: 400,
      code: "INVALID_ROUTE_PARAM",
      message: `${name} route param is invalid.`,
    });
  }

  return value;
}

function getActorUserId(req: Request): string {
  if (!req.authContext.userId) {
    throw new AppError({
      statusCode: 401,
      code: "AUTH_REQUIRED",
      message: "Authentication is required to access this resource.",
    });
  }

  return req.authContext.userId;
}

function requireCatalogManage() {
  return requireAdminPermission("CATALOG_MANAGE");
}

function requireContentReview() {
  return requireAdminPermission("CONTENT_REVIEW");
}

function requireOrderManage() {
  return requireAdminPermission("ORDER_MANAGE");
}

function requireAdminStorefrontAccess(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.authContext.isAuthenticated || !req.authContext.userId) {
    req.session.flash = {
      type: "warning",
      message: "Hay dang nhap de vao khu vuc admin.",
    };
    res.redirect(`/login?returnTo=${encodeURIComponent(req.originalUrl)}`);
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

  next();
}

export function createAdminModuleRouter(): Router {
  const router = Router();

  router.get("/_placeholder", requireAdminPermission(), (_req, res) => {
    res.json({
      success: true,
      data: {
        module: "admin",
        status: "ready-for-parts-8-9-10",
      },
    });
  });

  router.get("/dashboard", requireAdminPermission(), async (_req, res, next) => {
    try {
      res.json(successResponse(await adminService.buildDashboardPageModel()));
    } catch (error) {
      next(error);
    }
  });

  router.get("/authors", requireCatalogManage(), async (_req, res, next) => {
    try {
      const page = await adminService.buildCatalogPageModel({
        page: 1,
        pageSize: 20,
      });
      res.json(successResponse(page.entities.authors));
    } catch (error) {
      next(error);
    }
  });

  router.post("/authors", requireCatalogManage(), async (req, res, next) => {
    try {
      const author = await adminService.createAuthor(
        parseAuthorPayload(req.body),
        getActorUserId(req),
      );
      res.status(201).json(successResponse(author));
    } catch (error) {
      next(error);
    }
  });

  router.post("/authors/:id", requireCatalogManage(), async (req, res, next) => {
    try {
      const author = await adminService.updateAuthor(
        getRouteParam(req, "id"),
        parseAuthorPayload(req.body),
        getActorUserId(req),
      );
      res.json(successResponse(author));
    } catch (error) {
      next(error);
    }
  });

  router.patch("/authors/:id", requireCatalogManage(), async (req, res, next) => {
    try {
      const author = await adminService.updateAuthor(
        getRouteParam(req, "id"),
        parseAuthorPayload(req.body),
        getActorUserId(req),
      );
      res.json(successResponse(author));
    } catch (error) {
      next(error);
    }
  });

  router.post("/authors/:id/delete", requireCatalogManage(), async (req, res, next) => {
    try {
      await adminService.deleteAuthor(getRouteParam(req, "id"), getActorUserId(req));
      res.json(successResponse({ deleted: true }));
    } catch (error) {
      next(error);
    }
  });

  router.delete("/authors/:id", requireCatalogManage(), async (req, res, next) => {
    try {
      await adminService.deleteAuthor(getRouteParam(req, "id"), getActorUserId(req));
      res.json(successResponse({ deleted: true }));
    } catch (error) {
      next(error);
    }
  });

  router.get("/publishers", requireCatalogManage(), async (_req, res, next) => {
    try {
      const page = await adminService.buildCatalogPageModel({
        page: 1,
        pageSize: 20,
      });
      res.json(successResponse(page.entities.publishers));
    } catch (error) {
      next(error);
    }
  });

  router.post("/publishers", requireCatalogManage(), async (req, res, next) => {
    try {
      const publisher = await adminService.createPublisher(
        parsePublisherPayload(req.body),
        getActorUserId(req),
      );
      res.status(201).json(successResponse(publisher));
    } catch (error) {
      next(error);
    }
  });

  router.post("/publishers/:id", requireCatalogManage(), async (req, res, next) => {
    try {
      const publisher = await adminService.updatePublisher(
        getRouteParam(req, "id"),
        parsePublisherPayload(req.body),
        getActorUserId(req),
      );
      res.json(successResponse(publisher));
    } catch (error) {
      next(error);
    }
  });

  router.post("/publishers/:id/delete", requireCatalogManage(), async (req, res, next) => {
    try {
      await adminService.deletePublisher(getRouteParam(req, "id"), getActorUserId(req));
      res.json(successResponse({ deleted: true }));
    } catch (error) {
      next(error);
    }
  });

  router.get("/categories", requireCatalogManage(), async (_req, res, next) => {
    try {
      const page = await adminService.buildCatalogPageModel({
        page: 1,
        pageSize: 20,
      });
      res.json(successResponse(page.entities.categories));
    } catch (error) {
      next(error);
    }
  });

  router.post("/categories", requireCatalogManage(), async (req, res, next) => {
    try {
      const category = await adminService.createCategory(
        parseCategoryPayload(req.body),
        getActorUserId(req),
      );
      res.status(201).json(successResponse(category));
    } catch (error) {
      next(error);
    }
  });

  router.post("/categories/:id", requireCatalogManage(), async (req, res, next) => {
    try {
      const category = await adminService.updateCategory(
        getRouteParam(req, "id"),
        parseCategoryPayload(req.body),
        getActorUserId(req),
      );
      res.json(successResponse(category));
    } catch (error) {
      next(error);
    }
  });

  router.post("/categories/:id/delete", requireCatalogManage(), async (req, res, next) => {
    try {
      await adminService.deleteCategory(getRouteParam(req, "id"), getActorUserId(req));
      res.json(successResponse({ deleted: true }));
    } catch (error) {
      next(error);
    }
  });

  router.get("/books", requireCatalogManage(), async (req, res, next) => {
    try {
      const page = await adminService.buildCatalogPageModel(parseAdminListQuery(req.query));
      res.json(successResponse(page.entities.books));
    } catch (error) {
      next(error);
    }
  });

  router.post("/books", requireCatalogManage(), async (req, res, next) => {
    try {
      const book = await adminService.createBook(
        parseBookPayload(req.body),
        getActorUserId(req),
      );
      res.status(201).json(successResponse(book));
    } catch (error) {
      next(error);
    }
  });

  router.post("/books/:id", requireCatalogManage(), async (req, res, next) => {
    try {
      const book = await adminService.updateBook(
        getRouteParam(req, "id"),
        parseBookPayload(req.body),
        getActorUserId(req),
      );
      res.json(successResponse(book));
    } catch (error) {
      next(error);
    }
  });

  router.post("/books/:id/status", requireCatalogManage(), async (req, res, next) => {
    try {
      const book = await adminService.updateBookStatus(
        getRouteParam(req, "id"),
        parseBookStatusPayload(req.body),
        getActorUserId(req),
      );
      res.json(successResponse(book));
    } catch (error) {
      next(error);
    }
  });

  router.post("/books/:id/delete", requireCatalogManage(), async (req, res, next) => {
    try {
      await adminService.deleteBook(getRouteParam(req, "id"), getActorUserId(req));
      res.json(successResponse({ deleted: true }));
    } catch (error) {
      next(error);
    }
  });

  router.get("/collections", requireCatalogManage(), async (_req, res, next) => {
    try {
      const page = await adminService.buildCatalogPageModel({
        page: 1,
        pageSize: 20,
      });
      res.json(successResponse(page.entities.collections));
    } catch (error) {
      next(error);
    }
  });

  router.post("/collections", requireCatalogManage(), async (req, res, next) => {
    try {
      const collection = await adminService.createCollection(
        parseCollectionPayload(req.body),
        getActorUserId(req),
      );
      res.status(201).json(successResponse(collection));
    } catch (error) {
      next(error);
    }
  });

  router.post("/collections/:id", requireCatalogManage(), async (req, res, next) => {
    try {
      const collection = await adminService.updateCollection(
        getRouteParam(req, "id"),
        parseCollectionPayload(req.body),
        getActorUserId(req),
      );
      res.json(successResponse(collection));
    } catch (error) {
      next(error);
    }
  });

  router.post("/collections/:id/delete", requireCatalogManage(), async (req, res, next) => {
    try {
      await adminService.deleteCollection(getRouteParam(req, "id"), getActorUserId(req));
      res.json(successResponse({ deleted: true }));
    } catch (error) {
      next(error);
    }
  });

  router.get("/import-jobs", requireContentReview(), async (_req, res, next) => {
    try {
      const overview = await contentOpsService.listContentOpsOverview();
      res.json(successResponse(overview.jobs));
    } catch (error) {
      next(error);
    }
  });

  router.post("/import-jobs", requireContentReview(), async (req, res, next) => {
    try {
      const job = await contentOpsService.importStagedBooks({
        triggeredByUserId: getActorUserId(req),
        payload: parseImportJobPayload(req.body),
      });
      res.status(201).json(successResponse(job));
    } catch (error) {
      next(error);
    }
  });

  router.get("/staged-books", requireContentReview(), async (_req, res, next) => {
    try {
      const query = parseAdminListQuery(_req.query);
      const overview = await contentOpsService.listFilteredContentOpsOverview({
        q: query.q,
        stagedStatus: query.stagedStatus,
      });
      res.json(successResponse(overview.stagedBooks));
    } catch (error) {
      next(error);
    }
  });

  router.post("/staged-books/:id/normalize", requireContentReview(), async (req, res, next) => {
    try {
      const record = await contentOpsService.normalizeStagedBook({
        stagedBookId: getRouteParam(req, "id"),
        reviewerUserId: getActorUserId(req),
      });
      res.json(successResponse(record));
    } catch (error) {
      next(error);
    }
  });

  router.post("/staged-books/:id/approve", requireContentReview(), async (req, res, next) => {
    try {
      const record = await contentOpsService.approveStagedBook({
        stagedBookId: getRouteParam(req, "id"),
        reviewerUserId: getActorUserId(req),
      });
      res.json(successResponse(record));
    } catch (error) {
      next(error);
    }
  });

  router.post("/staged-books/:id/reject", requireContentReview(), async (req, res, next) => {
    try {
      const reason =
        typeof req.body.reason === "string" && req.body.reason.trim()
          ? req.body.reason.trim()
          : "Rejected from admin review";
      const record = await contentOpsService.rejectStagedBook({
        stagedBookId: getRouteParam(req, "id"),
        reviewerUserId: getActorUserId(req),
        reason,
      });
      res.json(successResponse(record));
    } catch (error) {
      next(error);
    }
  });

  router.post("/staged-books/:id/publish", requireContentReview(), async (req, res, next) => {
    try {
      const record = await contentOpsService.publishStagedBook({
        stagedBookId: getRouteParam(req, "id"),
        reviewerUserId: getActorUserId(req),
      });
      res.json(successResponse(record));
    } catch (error) {
      next(error);
    }
  });

  router.get("/orders", requireOrderManage(), async (req, res, next) => {
    try {
      const orders = await adminService.listOrders(parseAdminListQuery(req.query));
      res.json(successResponse(orders));
    } catch (error) {
      next(error);
    }
  });

  router.get("/orders/:orderNumber", requireOrderManage(), async (req, res, next) => {
    try {
      const order = await adminService.getOrder(getRouteParam(req, "orderNumber"));
      res.json(successResponse(order));
    } catch (error) {
      next(error);
    }
  });

  router.post("/orders/:orderNumber/status", requireOrderManage(), async (req, res, next) => {
    try {
      const order = await adminService.updateOrderStatus(
        getRouteParam(req, "orderNumber"),
        parseAdminOrderStatusPayload(req.body),
        getActorUserId(req),
      );
      res.json(successResponse(order));
    } catch (error) {
      next(error);
    }
  });

  router.post("/orders/:orderNumber/cancel", requireOrderManage(), async (req, res, next) => {
    try {
      const order = await adminService.cancelOrder(
        getRouteParam(req, "orderNumber"),
        parseAdminOrderCancelPayload(req.body),
        getActorUserId(req),
      );
      res.json(successResponse(order));
    } catch (error) {
      next(error);
    }
  });

  router.post(
    "/orders/:orderNumber/bank-transfer/mark-received",
    requireOrderManage(),
    async (req, res, next) => {
      try {
        const order = await adminService.markBankTransferReceived(
          getRouteParam(req, "orderNumber"),
          parseAdminOrderPaymentPayload(req.body),
          getActorUserId(req),
        );
        res.json(successResponse(order));
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch("/orders/:orderNumber/internal-note", requireOrderManage(), async (req, res, next) => {
    try {
      const order = await adminService.updateOrderInternalNote(
        getRouteParam(req, "orderNumber"),
        parseAdminOrderNotePayload(req.body),
        getActorUserId(req),
      );
      res.json(successResponse(order));
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export function createAdminStorefrontRouter(): Router {
  const router = Router();

  router.use("/admin", requireAdminStorefrontAccess);

  router.get("/admin", async (req, res, next) => {
    try {
      renderPage(req, res, "pages/admin", await adminService.buildDashboardPageModel());
    } catch (error) {
      next(error);
    }
  });

  router.get("/admin/catalog", requireCatalogManage(), async (req, res, next) => {
    try {
      renderPage(
        req,
        res,
        "pages/admin-catalog",
        await adminService.buildCatalogPageModel(parseAdminListQuery(req.query), {
          editAuthorId:
            typeof req.query.editAuthorId === "string" ? req.query.editAuthorId : undefined,
          editPublisherId:
            typeof req.query.editPublisherId === "string" ? req.query.editPublisherId : undefined,
          editCategoryId:
            typeof req.query.editCategoryId === "string" ? req.query.editCategoryId : undefined,
          editBookId:
            typeof req.query.editBookId === "string" ? req.query.editBookId : undefined,
          editCollectionId:
            typeof req.query.editCollectionId === "string"
              ? req.query.editCollectionId
              : undefined,
        }),
      );
    } catch (error) {
      next(error);
    }
  });

  router.get("/admin/content-ops", requireContentReview(), async (req, res, next) => {
    try {
      const query = parseAdminListQuery(req.query);
      renderPage(
        req,
        res,
        "pages/admin-content-ops",
        await contentOpsService.buildContentOpsPageModel({
          q: query.q,
          stagedStatus: query.stagedStatus,
        }),
      );
    } catch (error) {
      next(error);
    }
  });

  router.post("/admin/books", requireCatalogManage(), async (req, res, next) => {
    try {
      await adminService.createBook(parseBookPayload(req.body), getActorUserId(req));
      req.session.flash = {
        type: "success",
        message: "Da tao sach moi trong catalog.",
      };
      res.redirect("/admin/catalog");
    } catch (error) {
      next(error);
    }
  });

  router.post("/admin/books/:id", requireCatalogManage(), async (req, res, next) => {
    try {
      await adminService.updateBook(getRouteParam(req, "id"), parseBookPayload(req.body), getActorUserId(req));
      req.session.flash = {
        type: "success",
        message: "Da cap nhat sach.",
      };
      res.redirect("/admin/catalog");
    } catch (error) {
      next(error);
    }
  });

  router.post("/admin/books/:id/status", requireCatalogManage(), async (req, res, next) => {
    try {
      await adminService.updateBookStatus(
        getRouteParam(req, "id"),
        parseBookStatusPayload(req.body),
        getActorUserId(req),
      );
      req.session.flash = {
        type: "success",
        message: "Da cap nhat status sach.",
      };
      res.redirect("/admin/catalog");
    } catch (error) {
      next(error);
    }
  });

  router.post("/admin/books/:id/delete", requireCatalogManage(), async (req, res, next) => {
    try {
      await adminService.deleteBook(getRouteParam(req, "id"), getActorUserId(req));
      req.session.flash = {
        type: "success",
        message: "Da xoa sach khoi catalog.",
      };
      res.redirect("/admin/catalog");
    } catch (error) {
      next(error);
    }
  });

  router.post("/admin/authors", requireCatalogManage(), async (req, res, next) => {
    try {
      await adminService.createAuthor(parseAuthorPayload(req.body), getActorUserId(req));
      req.session.flash = {
        type: "success",
        message: "Da tao tac gia moi.",
      };
      res.redirect("/admin/catalog");
    } catch (error) {
      next(error);
    }
  });

  router.post("/admin/authors/:id", requireCatalogManage(), async (req, res, next) => {
    try {
      await adminService.updateAuthor(
        getRouteParam(req, "id"),
        parseAuthorPayload(req.body),
        getActorUserId(req),
      );
      req.session.flash = {
        type: "success",
        message: "Da cap nhat tac gia.",
      };
      res.redirect("/admin/catalog");
    } catch (error) {
      next(error);
    }
  });

  router.post("/admin/authors/:id/delete", requireCatalogManage(), async (req, res, next) => {
    try {
      await adminService.deleteAuthor(getRouteParam(req, "id"), getActorUserId(req));
      req.session.flash = {
        type: "success",
        message: "Da xoa tac gia.",
      };
      res.redirect("/admin/catalog");
    } catch (error) {
      next(error);
    }
  });

  router.post("/admin/publishers", requireCatalogManage(), async (req, res, next) => {
    try {
      await adminService.createPublisher(parsePublisherPayload(req.body), getActorUserId(req));
      req.session.flash = {
        type: "success",
        message: "Da tao nha xuat ban moi.",
      };
      res.redirect("/admin/catalog");
    } catch (error) {
      next(error);
    }
  });

  router.post("/admin/publishers/:id", requireCatalogManage(), async (req, res, next) => {
    try {
      await adminService.updatePublisher(
        getRouteParam(req, "id"),
        parsePublisherPayload(req.body),
        getActorUserId(req),
      );
      req.session.flash = {
        type: "success",
        message: "Da cap nhat nha xuat ban.",
      };
      res.redirect("/admin/catalog");
    } catch (error) {
      next(error);
    }
  });

  router.post("/admin/publishers/:id/delete", requireCatalogManage(), async (req, res, next) => {
    try {
      await adminService.deletePublisher(getRouteParam(req, "id"), getActorUserId(req));
      req.session.flash = {
        type: "success",
        message: "Da xoa nha xuat ban.",
      };
      res.redirect("/admin/catalog");
    } catch (error) {
      next(error);
    }
  });

  router.post("/admin/categories", requireCatalogManage(), async (req, res, next) => {
    try {
      await adminService.createCategory(parseCategoryPayload(req.body), getActorUserId(req));
      req.session.flash = {
        type: "success",
        message: "Da tao category moi.",
      };
      res.redirect("/admin/catalog");
    } catch (error) {
      next(error);
    }
  });

  router.post("/admin/categories/:id", requireCatalogManage(), async (req, res, next) => {
    try {
      await adminService.updateCategory(
        getRouteParam(req, "id"),
        parseCategoryPayload(req.body),
        getActorUserId(req),
      );
      req.session.flash = {
        type: "success",
        message: "Da cap nhat danh muc.",
      };
      res.redirect("/admin/catalog");
    } catch (error) {
      next(error);
    }
  });

  router.post("/admin/categories/:id/delete", requireCatalogManage(), async (req, res, next) => {
    try {
      await adminService.deleteCategory(getRouteParam(req, "id"), getActorUserId(req));
      req.session.flash = {
        type: "success",
        message: "Da xoa danh muc.",
      };
      res.redirect("/admin/catalog");
    } catch (error) {
      next(error);
    }
  });

  router.post("/admin/collections", requireCatalogManage(), async (req, res, next) => {
    try {
      await adminService.createCollection(
        parseCollectionPayload(req.body),
        getActorUserId(req),
      );
      req.session.flash = {
        type: "success",
        message: "Da tao collection moi.",
      };
      res.redirect("/admin/catalog");
    } catch (error) {
      next(error);
    }
  });

  router.post("/admin/collections/:id", requireCatalogManage(), async (req, res, next) => {
    try {
      await adminService.updateCollection(
        getRouteParam(req, "id"),
        parseCollectionPayload(req.body),
        getActorUserId(req),
      );
      req.session.flash = {
        type: "success",
        message: "Da cap nhat collection.",
      };
      res.redirect("/admin/catalog");
    } catch (error) {
      next(error);
    }
  });

  router.post("/admin/collections/:id/delete", requireCatalogManage(), async (req, res, next) => {
    try {
      await adminService.deleteCollection(getRouteParam(req, "id"), getActorUserId(req));
      req.session.flash = {
        type: "success",
        message: "Da xoa bo suu tap.",
      };
      res.redirect("/admin/catalog");
    } catch (error) {
      next(error);
    }
  });

  router.post("/admin/import-jobs", requireContentReview(), async (req, res, next) => {
    try {
      await contentOpsService.importStagedBooks({
        triggeredByUserId: getActorUserId(req),
        payload: parseImportJobPayload(req.body),
      });
      req.session.flash = {
        type: "success",
        message: "Da import du lieu vao staging.",
      };
      res.redirect("/admin/content-ops");
    } catch (error) {
      next(error);
    }
  });

  router.post(
    "/admin/staged-books/:id/normalize",
    requireContentReview(),
    async (req, res, next) => {
      try {
        await contentOpsService.normalizeStagedBook({
          stagedBookId: getRouteParam(req, "id"),
          reviewerUserId: getActorUserId(req),
        });
        req.session.flash = {
          type: "success",
          message: "Da normalize ban ghi staging.",
        };
        res.redirect("/admin/content-ops");
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/admin/staged-books/:id/approve",
    requireContentReview(),
    async (req, res, next) => {
      try {
        await contentOpsService.approveStagedBook({
          stagedBookId: getRouteParam(req, "id"),
          reviewerUserId: getActorUserId(req),
        });
        req.session.flash = {
          type: "success",
          message: "Da approve ban ghi staging.",
        };
        res.redirect("/admin/content-ops");
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/admin/staged-books/:id/reject",
    requireContentReview(),
    async (req, res, next) => {
      try {
        const reason =
          typeof req.body.reason === "string" && req.body.reason.trim()
            ? req.body.reason.trim()
            : "Rejected from admin review";
        await contentOpsService.rejectStagedBook({
          stagedBookId: getRouteParam(req, "id"),
          reviewerUserId: getActorUserId(req),
          reason,
        });
        req.session.flash = {
          type: "success",
          message: "Da reject ban ghi staging.",
        };
        res.redirect("/admin/content-ops");
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/admin/staged-books/:id/publish",
    requireContentReview(),
    async (req, res, next) => {
      try {
        await contentOpsService.publishStagedBook({
          stagedBookId: getRouteParam(req, "id"),
          reviewerUserId: getActorUserId(req),
        });
        req.session.flash = {
          type: "success",
          message: "Da publish ban ghi staging vao catalog.",
        };
        res.redirect("/admin/content-ops");
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
