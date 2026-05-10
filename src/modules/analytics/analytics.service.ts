import type { Prisma } from "../../generated/prisma/client.js";
import { AnalyticsEventName, PublishStatus } from "../../generated/prisma/enums.js";
import { env } from "../../config/env";
import { ANALYTICS_EVENTS, type AnalyticsEventName as SharedAnalyticsEventName } from "../../shared/contracts";
import { CatalogRepository } from "../catalog/catalog.repository";
import { AppError } from "../../shared/errors/app-error";
import { logger } from "../../shared/utils/logger";
import { AnalyticsRepository } from "./analytics.repository";
import type {
  AnalyticsDashboardViewModel,
  AnalyticsRecommendationSnapshot,
  ParsedAnalyticsEventPayload,
  ParsedAnalyticsIdentifyPayload,
} from "./analytics.types";

const SESSION_EVENT_NAMES = new Set<SharedAnalyticsEventName>([
  ANALYTICS_EVENTS.PAGE_VIEW,
  ANALYTICS_EVENTS.SESSION_START,
  ANALYTICS_EVENTS.VIEW_HOMEPAGE,
  ANALYTICS_EVENTS.VIEW_LANDING_PAGE,
  ANALYTICS_EVENTS.VIEW_CATEGORY,
  ANALYTICS_EVENTS.VIEW_COLLECTION,
  ANALYTICS_EVENTS.VIEW_SEARCH_RESULTS,
  ANALYTICS_EVENTS.VIEW_ITEM,
]);

const CART_EVENT_NAMES = new Set<SharedAnalyticsEventName>([
  ANALYTICS_EVENTS.ADD_TO_CART,
  ANALYTICS_EVENTS.REMOVE_FROM_CART,
  ANALYTICS_EVENTS.UPDATE_CART_QUANTITY,
  ANALYTICS_EVENTS.VIEW_CART,
]);

const CHECKOUT_EVENT_NAMES = new Set<SharedAnalyticsEventName>([
  ANALYTICS_EVENTS.BEGIN_CHECKOUT,
  ANALYTICS_EVENTS.ADD_SHIPPING_INFO,
  ANALYTICS_EVENTS.SELECT_PAYMENT_METHOD,
  ANALYTICS_EVENTS.CHECKOUT_ERROR,
  ANALYTICS_EVENTS.PURCHASE,
  ANALYTICS_EVENTS.PAYMENT_SUCCESS,
  ANALYTICS_EVENTS.PAYMENT_FAILED,
]);

function parseOccurredAt(value?: string): Date {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function detectDeviceType(input?: string): string | undefined {
  if (!input) {
    return undefined;
  }

  const normalized = input.toLowerCase();
  if (normalized.includes("mobile")) return "mobile";
  if (normalized.includes("tablet")) return "tablet";
  if (normalized.includes("desktop")) return "desktop";
  return normalized.slice(0, 40);
}

function sumValues(rows: Array<{ value: number }>) {
  return rows.reduce((total, row) => total + row.value, 0);
}

function toPrismaJson(value: Record<string, unknown>): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function toPrismaAnalyticsEventName(eventName: SharedAnalyticsEventName): AnalyticsEventName {
  return eventName.toUpperCase() as AnalyticsEventName;
}

export class AnalyticsService {
  constructor(
    private readonly repository: AnalyticsRepository = new AnalyticsRepository(),
    private readonly catalogRepository: CatalogRepository = new CatalogRepository(),
  ) {}

  async identifySession(input: ParsedAnalyticsIdentifyPayload, context: {
    sessionId?: string;
    userId?: string | null;
  }) {
    if (!input.consentGranted) {
      return { accepted: false };
    }

    const sessionId = input.sessionId ?? context.sessionId;
    if (!sessionId) {
      throw new AppError({
        statusCode: 400,
        code: "ANALYTICS_SESSION_REQUIRED",
        message: "sessionId is required for analytics identify.",
      });
    }

    const occurredAt = new Date();
    await this.repository.upsertSessionFact({
      sessionId,
      userId: context.userId ?? undefined,
      isLoggedIn: input.isLoggedIn,
      deviceType: detectDeviceType(input.deviceType),
      landingPath: input.landingPath,
      referrer: input.referrer,
      occurredAt,
    });

    await this.repository.createOutboxEvents([
      {
        dedupeKey: `analytics:identify:${sessionId}:${occurredAt.toISOString()}`,
        eventName: AnalyticsEventName.SESSION_START,
        sourceModule: "analytics",
        sessionId,
        userId: context.userId ?? undefined,
        occurredAt,
        payload: {
          isLoggedIn: input.isLoggedIn,
          deviceType: detectDeviceType(input.deviceType),
          landingPath: input.landingPath ?? null,
        } as Prisma.InputJsonValue,
      },
    ]);

    return { accepted: true };
  }

  async ingestEvents(
    input: ParsedAnalyticsEventPayload,
    context: {
      requestId: string;
      sessionId?: string;
      userId?: string | null;
    },
  ) {
    if (!input.consentGranted) {
      return { accepted: false, storedEvents: 0 };
    }

    const sessionId = input.sessionId ?? context.sessionId;
    const userId = context.userId ?? undefined;

    const outboxEvents: Prisma.AnalyticsEventOutboxCreateManyInput[] = [];

    for (const event of input.events) {
      const occurredAt = parseOccurredAt(event.occurredAt);

      outboxEvents.push({
        dedupeKey: `analytics:${context.requestId}:${event.eventName}:${occurredAt.toISOString()}`,
        eventName: toPrismaAnalyticsEventName(event.eventName),
        sourceModule: "analytics",
        sessionId,
        cartId: input.cartId,
        orderId: input.orderId,
        userId,
        occurredAt,
        payload: toPrismaJson(event.payload),
      });

      if (sessionId && SESSION_EVENT_NAMES.has(event.eventName)) {
        await this.repository.upsertSessionFact({
          sessionId,
          userId,
          isLoggedIn: Boolean(userId),
          deviceType: detectDeviceType(input.deviceType),
          landingPath: input.pagePath,
          occurredAt,
          incrementPageView: event.eventName === ANALYTICS_EVENTS.PAGE_VIEW ? 1 : 0,
          incrementSearch: event.eventName === ANALYTICS_EVENTS.SEARCH ? 1 : 0,
          incrementCart: CART_EVENT_NAMES.has(event.eventName) ? 1 : 0,
          incrementCheckout: CHECKOUT_EVENT_NAMES.has(event.eventName) ? 1 : 0,
          incrementPurchase: event.eventName === ANALYTICS_EVENTS.PURCHASE ? 1 : 0,
        });
      }

      if (event.eventName === ANALYTICS_EVENTS.VIEW_ITEM && typeof event.payload.bookId === "string") {
        await this.repository.createFactProductView({
          sessionId,
          userId,
          bookId: event.payload.bookId,
          categoryId:
            typeof event.payload.primaryCategoryId === "string" ? event.payload.primaryCategoryId : undefined,
          collectionId:
            typeof event.payload.collectionId === "string" ? event.payload.collectionId : undefined,
          sourceContext:
            typeof event.payload.sourceContext === "string" ? event.payload.sourceContext : undefined,
          occurredAt,
        });
      }

      if (CART_EVENT_NAMES.has(event.eventName)) {
        await this.repository.createFactCartEvent({
          sessionId,
          userId,
          cartId: input.cartId,
          bookId: typeof event.payload.bookId === "string" ? event.payload.bookId : undefined,
          eventName: toPrismaAnalyticsEventName(event.eventName),
          quantity:
            typeof event.payload.quantity === "number" ? event.payload.quantity : undefined,
          subtotalAmount:
            typeof event.payload.subtotalAmount === "number" ? event.payload.subtotalAmount : undefined,
          totalAmount:
            typeof event.payload.totalAmount === "number" ? event.payload.totalAmount : undefined,
          occurredAt,
        });
      }
    }

    await this.repository.createOutboxEvents(outboxEvents);
    return { accepted: true, storedEvents: outboxEvents.length };
  }

  async flushCriticalEvents() {
    const pending = await this.repository.listPendingCriticalEvents();
    if (pending.length === 0) {
      return { delivered: 0, failed: 0, relayEnabled: env.ANALYTICS_RELAY_ENABLED };
    }

    if (!env.ANALYTICS_RELAY_ENABLED || !env.GA4_MEASUREMENT_ID || !env.GA4_API_SECRET) {
      await this.repository.markOutboxDelivered(pending.map((item) => item.id));
      return { delivered: pending.length, failed: 0, relayEnabled: false };
    }

    try {
      const endpoint = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(env.GA4_MEASUREMENT_ID)}&api_secret=${encodeURIComponent(env.GA4_API_SECRET)}`;

      for (const item of pending) {
        await fetch(endpoint, {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            client_id: item.sessionId ?? item.userId ?? item.id,
            events: [
              {
                name: String(item.eventName).toLowerCase(),
                params: item.payload,
              },
            ],
          }),
        });
      }

      await this.repository.markOutboxDelivered(pending.map((item) => item.id));
      return { delivered: pending.length, failed: 0, relayEnabled: true };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "analytics relay failed";
      await this.repository.markOutboxFailed(
        pending.map((item) => item.id),
        reason,
      );
      logger.error("Analytics flush failed", {
        module: "analytics",
        reason,
      });
      return { delivered: 0, failed: pending.length, relayEnabled: true };
    }
  }

  async buildDashboard(): Promise<AnalyticsDashboardViewModel> {
    const [
      sessions,
      purchases,
      revenueSeriesRaw,
      checkoutGroups,
      paymentGroups,
      deviceGroups,
      loginGroups,
      categoryGroups,
      topBooksGroups,
      topSearchTerms,
      noResultTerms,
    ] = await Promise.all([
      this.repository.countSessions(),
      this.repository.countPurchases(),
      this.repository.aggregateRevenueByPeriod(),
      this.repository.groupCheckoutEvents(),
      this.repository.groupOrdersByPaymentMethod(),
      this.repository.groupSessionsByDevice(),
      this.repository.groupSessionsByLogin(),
      this.repository.groupOrdersByCategory(),
      this.repository.groupTopBooks(),
      this.repository.topSearchTerms(),
      this.repository.topNoResultTerms(),
    ]);

    const revenue = revenueSeriesRaw.reduce((sum, row) => sum + row.revenue, 0);
    const conversionRate = sessions > 0 ? Number(((purchases / sessions) * 100).toFixed(2)) : 0;

    const checkoutLookup = new Map(checkoutGroups.map((row) => [row.eventName, row._count.id]));
    const categoryIds = categoryGroups.map((row) => row.categoryId).filter(Boolean) as string[];
    const categories = await this.repository.findCategoriesByIds(categoryIds);
    const categoryNameMap = new Map(categories.map((item) => [item.id, item.name]));

    const topBookIds = topBooksGroups.map((row) => row.bookId).filter(Boolean) as string[];
    const books = await this.repository.findBooksByIds(topBookIds);
    const bookNameMap = new Map(books.map((item) => [item.id, item.title]));

    return {
      overview: {
        sessions,
        purchases,
        revenue,
        conversionRate,
      },
      homepageFunnel: [
        { label: "Homepage views", value: checkoutLookup.get("VIEW_HOMEPAGE") ?? 0 },
        { label: "Product views", value: checkoutLookup.get("VIEW_ITEM") ?? 0 },
        { label: "Cart views", value: checkoutLookup.get("VIEW_CART") ?? 0 },
        { label: "Purchases", value: checkoutLookup.get("PURCHASE") ?? 0 },
      ],
      searchFunnel: [
        { label: "Search", value: checkoutLookup.get("SEARCH") ?? 0 },
        { label: "View results", value: checkoutLookup.get("VIEW_SEARCH_RESULTS") ?? 0 },
        { label: "Select result", value: checkoutLookup.get("SELECT_SEARCH_RESULT") ?? 0 },
        { label: "Purchases", value: checkoutLookup.get("PURCHASE") ?? 0 },
      ],
      checkoutFunnel: [
        { label: "Begin checkout", value: checkoutLookup.get("BEGIN_CHECKOUT") ?? 0 },
        { label: "Add shipping", value: checkoutLookup.get("ADD_SHIPPING_INFO") ?? 0 },
        { label: "Select payment", value: checkoutLookup.get("SELECT_PAYMENT_METHOD") ?? 0 },
        { label: "Purchase", value: checkoutLookup.get("PURCHASE") ?? 0 },
      ],
      revenueSeries: revenueSeriesRaw,
      paymentMethodBreakdown: paymentGroups.map((row) => ({
        label: row.paymentMethod,
        value: row._count.id,
      })),
      deviceBreakdown: deviceGroups.map((row) => ({
        label: row.deviceType ?? "unknown",
        value: row._count.id,
      })),
      categoryBreakdown: categoryGroups.map((row) => ({
        label: categoryNameMap.get(row.categoryId ?? "") ?? "Unknown category",
        value: row._sum.quantity ?? 0,
      })),
      topBooks: topBooksGroups.map((row) => ({
        label: bookNameMap.get(row.bookId ?? "") ?? "Unknown book",
        value: row._sum.quantity ?? 0,
      })),
      topSearchTerms: topSearchTerms.map((row) => ({
        label: row.normalizedQuery,
        value: row._count.id,
      })),
      noResultTerms: noResultTerms.map((row) => ({
        label: row.normalizedQuery,
        value: row._count.id,
      })),
      guestVsLoggedIn: loginGroups.map((row) => ({
        label: row.isLoggedIn ? "Logged-in" : "Guest",
        value: row._count.id,
      })),
    };
  }

  async buildRecommendationSnapshot(): Promise<AnalyticsRecommendationSnapshot> {
    const [topSold, topViewed] = await Promise.all([
      this.repository.groupTopBooks(12),
      this.repository.topViewedBooks(20),
    ]);

    const bestsellerBookIds = topSold
      .map((row) => row.bookId)
      .filter((value): value is string => Boolean(value));

    const allReferenceBookIds = Array.from(
      new Set([
        ...bestsellerBookIds,
        ...topViewed.map((row) => row.bookId).filter((value): value is string => Boolean(value)),
      ]),
    );

    const referenceBooks = await this.repository.findBooksByIds(allReferenceBookIds);
    const recommendedBookIdsByBookId: Record<string, string[]> = {};

    for (const book of referenceBooks) {
      const categoryIds = book.bookCategories.map((item) => item.categoryId);
      const candidates = await this.catalogRepository.findBooks({
        where: {
          publishStatus: PublishStatus.PUBLISHED,
          id: {
            not: book.id,
          },
          OR: [
            { authorId: book.authorId },
            { publisherId: book.publisherId },
            categoryIds.length > 0
              ? {
                  bookCategories: {
                    some: {
                      categoryId: {
                        in: categoryIds,
                      },
                    },
                  },
                }
              : undefined,
          ].filter(Boolean) as Prisma.BookWhereInput[],
        },
        orderBy: [
          { isBestseller: "desc" },
          { isRecommended: "desc" },
          { sortWeight: "desc" },
          { createdAt: "desc" },
        ],
        take: 4,
      });

      recommendedBookIdsByBookId[book.id] = candidates.map((candidate) => candidate.id);
    }

    return {
      bestsellerBookIds,
      recommendedBookIdsByBookId,
      topSearchTerms: (await this.repository.topSearchTerms(10)).map((row) => row.normalizedQuery),
    };
  }
}
