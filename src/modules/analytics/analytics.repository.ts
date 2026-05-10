import type { Prisma } from "../../generated/prisma/client.js";
import { AnalyticsDeliveryStatus } from "../../generated/prisma/enums.js";
import { getPrismaClient } from "../../infra/database/prisma";

async function getDb() {
  return getPrismaClient();
}

export class AnalyticsRepository {
  async createOutboxEvents(events: Prisma.AnalyticsEventOutboxCreateManyInput[]): Promise<void> {
    if (events.length === 0) {
      return;
    }

    const prisma = await getDb();
    await prisma.analyticsEventOutbox.createMany({
      data: events,
      skipDuplicates: true,
    });
  }

  async upsertSessionFact(input: {
    sessionId: string;
    userId?: string | null;
    isLoggedIn: boolean;
    deviceType?: string;
    landingPath?: string;
    referrer?: string;
    incrementPageView?: number;
    incrementSearch?: number;
    incrementCart?: number;
    incrementCheckout?: number;
    incrementPurchase?: number;
    occurredAt: Date;
  }): Promise<void> {
    const prisma = await getDb();

    await prisma.factSession.upsert({
      where: {
        sessionId: input.sessionId,
      },
      create: {
        sessionId: input.sessionId,
        userId: input.userId ?? undefined,
        isLoggedIn: input.isLoggedIn,
        deviceType: input.deviceType,
        landingPath: input.landingPath,
        referrer: input.referrer,
        startedAt: input.occurredAt,
        lastSeenAt: input.occurredAt,
        pageViewCount: input.incrementPageView ?? 0,
        searchCount: input.incrementSearch ?? 0,
        cartEventCount: input.incrementCart ?? 0,
        checkoutCount: input.incrementCheckout ?? 0,
        purchaseCount: input.incrementPurchase ?? 0,
      },
      update: {
        userId: input.userId ?? undefined,
        isLoggedIn: input.isLoggedIn,
        deviceType: input.deviceType ?? undefined,
        landingPath: input.landingPath ?? undefined,
        referrer: input.referrer ?? undefined,
        lastSeenAt: input.occurredAt,
        pageViewCount: { increment: input.incrementPageView ?? 0 },
        searchCount: { increment: input.incrementSearch ?? 0 },
        cartEventCount: { increment: input.incrementCart ?? 0 },
        checkoutCount: { increment: input.incrementCheckout ?? 0 },
        purchaseCount: { increment: input.incrementPurchase ?? 0 },
      },
    });
  }

  async createFactProductView(input: {
    sessionId?: string;
    userId?: string | null;
    bookId: string;
    categoryId?: string;
    collectionId?: string;
    sourceContext?: string;
    occurredAt: Date;
  }): Promise<void> {
    const prisma = await getDb();
    await prisma.factProductView.create({
      data: {
        sessionId: input.sessionId,
        userId: input.userId ?? undefined,
        bookId: input.bookId,
        categoryId: input.categoryId,
        collectionId: input.collectionId,
        sourceContext: input.sourceContext,
        occurredAt: input.occurredAt,
      },
    });
  }

  async createFactCartEvent(input: {
    sessionId?: string;
    userId?: string | null;
    cartId?: string;
    bookId?: string;
    eventName: Prisma.FactCartEventCreateInput["eventName"];
    quantity?: number;
    subtotalAmount?: number;
    totalAmount?: number;
    occurredAt: Date;
  }): Promise<void> {
    const prisma = await getDb();
    await prisma.factCartEvent.create({
      data: {
        sessionId: input.sessionId,
        userId: input.userId ?? undefined,
        cartId: input.cartId,
        bookId: input.bookId,
        eventName: input.eventName,
        quantity: input.quantity,
        subtotalAmount: input.subtotalAmount,
        totalAmount: input.totalAmount,
        occurredAt: input.occurredAt,
      },
    });
  }

  async listPendingCriticalEvents(limit = 50) {
    const prisma = await getDb();
    return prisma.analyticsEventOutbox.findMany({
      where: {
        isCritical: true,
        deliveryStatus: {
          in: [AnalyticsDeliveryStatus.PENDING, AnalyticsDeliveryStatus.FAILED],
        },
      },
      orderBy: [{ occurredAt: "asc" }],
      take: limit,
    });
  }

  async markOutboxDelivered(ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    const prisma = await getDb();
    await prisma.analyticsEventOutbox.updateMany({
      where: {
        id: {
          in: ids,
        },
      },
      data: {
        deliveryStatus: AnalyticsDeliveryStatus.DELIVERED,
        deliveredAt: new Date(),
        lastAttemptAt: new Date(),
        attemptCount: {
          increment: 1,
        } as never,
        failureReason: null,
      },
    });
  }

  async markOutboxFailed(ids: string[], reason: string): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    const prisma = await getDb();
    await prisma.analyticsEventOutbox.updateMany({
      where: {
        id: {
          in: ids,
        },
      },
      data: {
        deliveryStatus: AnalyticsDeliveryStatus.FAILED,
        failedAt: new Date(),
        lastAttemptAt: new Date(),
        failureReason: reason,
        attemptCount: {
          increment: 1,
        } as never,
      },
    });
  }

  async countSessions(): Promise<number> {
    const prisma = await getDb();
    return prisma.factSession.count();
  }

  async countPurchases(): Promise<number> {
    const prisma = await getDb();
    return prisma.factCheckoutEvent.count({
      where: {
        eventName: "PURCHASE",
      },
    });
  }

  async aggregateRevenueByPeriod(): Promise<Array<{ label: string; revenue: number; orders: number }>> {
    const prisma = await getDb();
    const rows = await prisma.factOrder.groupBy({
      by: ["orderedAt"],
      _sum: {
        totalAmount: true,
      },
      _count: {
        orderId: true,
      },
      orderBy: {
        orderedAt: "asc",
      },
    });

    return rows.map((row) => ({
      label: row.orderedAt.toISOString().slice(0, 10),
      revenue: row._sum.totalAmount ?? 0,
      orders: row._count.orderId ?? 0,
    }));
  }

  async groupCheckoutEvents() {
    const prisma = await getDb();
    return prisma.factCheckoutEvent.groupBy({
      by: ["eventName"],
      _count: {
        id: true,
      },
    });
  }

  async groupSessionsByLogin() {
    const prisma = await getDb();
    return prisma.factSession.groupBy({
      by: ["isLoggedIn"],
      _count: {
        id: true,
      },
    });
  }

  async groupSessionsByDevice() {
    const prisma = await getDb();
    return prisma.factSession.groupBy({
      by: ["deviceType"],
      _count: {
        id: true,
      },
    });
  }

  async groupOrdersByPaymentMethod() {
    const prisma = await getDb();
    return prisma.factOrder.groupBy({
      by: ["paymentMethod"],
      _count: {
        id: true,
      },
    });
  }

  async groupOrdersByCategory() {
    const prisma = await getDb();
    return prisma.factOrder.groupBy({
      by: ["categoryId"],
      _sum: {
        quantity: true,
      },
    });
  }

  async groupTopBooks(limit = 10) {
    const prisma = await getDb();
    return prisma.factOrder.groupBy({
      by: ["bookId"],
      _sum: {
        quantity: true,
      },
      orderBy: {
        _sum: {
          quantity: "desc",
        },
      },
      take: limit,
    });
  }

  async findBooksByIds(ids: string[]) {
    if (ids.length === 0) {
      return [];
    }

    const prisma = await getDb();
    return prisma.book.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      select: {
        id: true,
        title: true,
        slug: true,
        authorId: true,
        publisherId: true,
        bookCategories: {
          select: {
            categoryId: true,
          },
        },
      },
    });
  }

  async findCategoriesByIds(ids: string[]) {
    if (ids.length === 0) {
      return [];
    }

    const prisma = await getDb();
    return prisma.category.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });
  }

  async topSearchTerms(limit = 10) {
    const prisma = await getDb();
    return prisma.factSearch.groupBy({
      by: ["normalizedQuery"],
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: limit,
    });
  }

  async topNoResultTerms(limit = 10) {
    const prisma = await getDb();
    return prisma.factSearch.groupBy({
      by: ["normalizedQuery"],
      where: {
        noResult: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: limit,
    });
  }

  async topViewedBooks(limit = 20) {
    const prisma = await getDb();
    return prisma.factProductView.groupBy({
      by: ["bookId"],
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: limit,
    });
  }
}
