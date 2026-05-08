import type { Prisma } from "../../generated/prisma/client.js";
import {
  AnalyticsEventName,
  CurrencyCode,
  PaymentStatus,
} from "../../generated/prisma/enums.js";
import { getPrismaClient } from "../../infra/database/prisma";
import type { DbClient } from "../../shared/database/repository";

const CHECKOUT_ATTEMPT_SELECT = {
  id: true,
  cartId: true,
  userId: true,
  sessionId: true,
  status: true,
  shippingFullName: true,
  shippingPhoneNumber: true,
  shippingAddressLine1: true,
  shippingWard: true,
  shippingDistrict: true,
  shippingProvince: true,
  shippingNote: true,
  paymentMethod: true,
  currency: true,
  subtotalAmount: true,
  shippingFeeAmount: true,
  totalAmount: true,
  lastErrorCode: true,
  lastErrorMessage: true,
  startedAt: true,
  shippingInfoSubmittedAt: true,
  paymentMethodSelectedAt: true,
  completedAt: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
  cart: {
    select: {
      id: true,
      userId: true,
      sessionId: true,
      currency: true,
      itemCount: true,
      subtotalAmount: true,
      shippingFeeAmount: true,
      totalAmount: true,
      isActive: true,
      checkedOutAt: true,
      items: {
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          bookId: true,
          quantity: true,
          unitPriceAmount: true,
          compareAtAmount: true,
          shippingFeeAmount: true,
          lineSubtotalAmount: true,
          lineTotalAmount: true,
          currency: true,
          book: {
            select: {
              id: true,
              slug: true,
              title: true,
              coverImageUrl: true,
              publishStatus: true,
              availabilityStatus: true,
              inventoryQuantity: true,
              priceAmount: true,
              compareAtAmount: true,
              shippingFeeAmount: true,
              currency: true,
              keywords: true,
              author: {
                select: {
                  name: true,
                },
              },
              publisher: {
                select: {
                  name: true,
                },
              },
              bookCategories: {
                orderBy: {
                  position: "asc",
                },
                select: {
                  isPrimary: true,
                  category: {
                    select: {
                      id: true,
                      slug: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.CheckoutAttemptSelect;

const ORDER_SELECT = {
  id: true,
  orderNumber: true,
  idempotencyKey: true,
  userId: true,
  sourceCartId: true,
  checkoutAttemptId: true,
  sessionId: true,
  status: true,
  paymentStatus: true,
  paymentMethod: true,
  currency: true,
  itemCount: true,
  subtotalAmount: true,
  shippingFeeAmount: true,
  totalAmount: true,
  customerEmail: true,
  customerFullName: true,
  customerPhoneNumber: true,
  internalNote: true,
  cancellationReason: true,
  placedAt: true,
  confirmedAt: true,
  packedAt: true,
  shippedAt: true,
  deliveredAt: true,
  cancelledAt: true,
  createdAt: true,
  updatedAt: true,
  address: {
    select: {
      recipientName: true,
      phoneNumber: true,
      addressLine1: true,
      ward: true,
      district: true,
      province: true,
      note: true,
    },
  },
  items: {
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      bookId: true,
      bookSlug: true,
      bookTitle: true,
      authorName: true,
      publisherName: true,
      coverImageUrl: true,
      quantity: true,
      unitPriceAmount: true,
      compareAtAmount: true,
      shippingFeeAmount: true,
      lineSubtotalAmount: true,
      lineTotalAmount: true,
      currency: true,
      snapshotMetadata: true,
      createdAt: true,
    },
  },
  paymentRecords: {
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      status: true,
      method: true,
      amount: true,
      currency: true,
      attemptNumber: true,
      externalReference: true,
      proofUrl: true,
      note: true,
      rawPayload: true,
      paidAt: true,
      verifiedAt: true,
      failedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.OrderSelect;

export type CheckoutAttemptRecord = Prisma.CheckoutAttemptGetPayload<{
  select: typeof CHECKOUT_ATTEMPT_SELECT;
}>;

export type OrderRecord = Prisma.OrderGetPayload<{
  select: typeof ORDER_SELECT;
}>;

async function getDb(db?: DbClient) {
  return db ?? getPrismaClient();
}

export class CheckoutRepository {
  async findOrdersByUserId(userId: string, db?: DbClient): Promise<OrderRecord[]> {
    const client = await getDb(db);

    return client.order.findMany({
      where: {
        userId,
      },
      orderBy: {
        placedAt: "desc",
      },
      select: ORDER_SELECT,
    });
  }

  async findActiveCheckoutAttemptById(
    checkoutAttemptId: string,
    db?: DbClient,
  ): Promise<CheckoutAttemptRecord | null> {
    const client = await getDb(db);

    return client.checkoutAttempt.findFirst({
      where: {
        id: checkoutAttemptId,
      },
      select: CHECKOUT_ATTEMPT_SELECT,
    });
  }

  async findLatestCheckoutAttemptForCart(
    input: {
      cartId: string;
      userId?: string | null;
      sessionId?: string;
    },
    db?: DbClient,
  ): Promise<CheckoutAttemptRecord | null> {
    const client = await getDb(db);

    return client.checkoutAttempt.findFirst({
      where: {
        cartId: input.cartId,
        ...(input.userId
          ? {
              OR: [{ userId: input.userId }, { sessionId: input.sessionId ?? undefined }],
            }
          : { sessionId: input.sessionId ?? undefined }),
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: CHECKOUT_ATTEMPT_SELECT,
    });
  }

  async createCheckoutAttempt(
    input: {
      cartId: string;
      userId?: string | null;
      sessionId?: string;
      subtotalAmount: number;
      shippingFeeAmount: number;
      totalAmount: number;
      expiresAt?: Date | null;
    },
    db?: DbClient,
  ): Promise<CheckoutAttemptRecord> {
    const client = await getDb(db);

    return client.checkoutAttempt.create({
      data: {
        cartId: input.cartId,
        userId: input.userId ?? undefined,
        sessionId: input.sessionId,
        currency: CurrencyCode.VND,
        subtotalAmount: input.subtotalAmount,
        shippingFeeAmount: input.shippingFeeAmount,
        totalAmount: input.totalAmount,
        expiresAt: input.expiresAt ?? undefined,
      },
      select: CHECKOUT_ATTEMPT_SELECT,
    });
  }

  async updateCheckoutAttempt(
    checkoutAttemptId: string,
    data: Prisma.CheckoutAttemptUpdateInput,
    db?: DbClient,
  ): Promise<CheckoutAttemptRecord> {
    const client = await getDb(db);

    return client.checkoutAttempt.update({
      where: {
        id: checkoutAttemptId,
      },
      data,
      select: CHECKOUT_ATTEMPT_SELECT,
    });
  }

  async findOrderByOrderNumber(orderNumber: string, db?: DbClient): Promise<OrderRecord | null> {
    const client = await getDb(db);

    return client.order.findUnique({
      where: {
        orderNumber,
      },
      select: ORDER_SELECT,
    });
  }

  async findOrderByIdempotencyKey(
    idempotencyKey: string,
    db?: DbClient,
  ): Promise<OrderRecord | null> {
    const client = await getDb(db);

    return client.order.findUnique({
      where: {
        idempotencyKey,
      },
      select: ORDER_SELECT,
    });
  }

  async createOrderFromCheckout(
    input: {
      orderNumber: string;
      idempotencyKey: string;
      checkoutAttempt: CheckoutAttemptRecord;
      customerEmail?: string | null;
      orderStatus: Prisma.OrderCreateInput["status"];
      paymentStatus: Prisma.OrderCreateInput["paymentStatus"];
      paymentRecordStatus: PaymentStatus;
    },
    db?: DbClient,
  ): Promise<OrderRecord> {
    const client = await getDb(db);

    const order = await client.order.create({
      data: {
        orderNumber: input.orderNumber,
        idempotencyKey: input.idempotencyKey,
        userId: input.checkoutAttempt.userId ?? undefined,
        sourceCartId: input.checkoutAttempt.cartId,
        checkoutAttemptId: input.checkoutAttempt.id,
        sessionId: input.checkoutAttempt.sessionId ?? undefined,
        status: input.orderStatus,
        paymentStatus: input.paymentStatus,
        paymentMethod: input.checkoutAttempt.paymentMethod!,
        currency: CurrencyCode.VND,
        itemCount: input.checkoutAttempt.cart.itemCount,
        subtotalAmount: input.checkoutAttempt.totalAmount - input.checkoutAttempt.shippingFeeAmount,
        shippingFeeAmount: input.checkoutAttempt.shippingFeeAmount,
        totalAmount: input.checkoutAttempt.totalAmount,
        customerEmail: input.customerEmail ?? undefined,
        customerFullName: input.checkoutAttempt.shippingFullName!,
        customerPhoneNumber: input.checkoutAttempt.shippingPhoneNumber!,
        address: {
          create: {
            recipientName: input.checkoutAttempt.shippingFullName!,
            phoneNumber: input.checkoutAttempt.shippingPhoneNumber!,
            addressLine1: input.checkoutAttempt.shippingAddressLine1!,
            ward: input.checkoutAttempt.shippingWard ?? undefined,
            district: input.checkoutAttempt.shippingDistrict!,
            province: input.checkoutAttempt.shippingProvince!,
            note: input.checkoutAttempt.shippingNote ?? undefined,
          },
        },
        items: {
          create: input.checkoutAttempt.cart.items.map((item) => ({
            bookId: item.bookId,
            bookSlug: item.book.slug,
            bookTitle: item.book.title,
            authorName: item.book.author.name,
            publisherName: item.book.publisher.name,
            coverImageUrl: item.book.coverImageUrl ?? undefined,
            quantity: item.quantity,
            unitPriceAmount: item.unitPriceAmount,
            compareAtAmount: item.compareAtAmount ?? undefined,
            shippingFeeAmount: item.shippingFeeAmount,
            lineSubtotalAmount: item.lineSubtotalAmount,
            lineTotalAmount: item.lineTotalAmount,
            currency: CurrencyCode.VND,
            snapshotMetadata: {
              keywords: item.book.keywords,
              availabilityStatus: item.book.availabilityStatus,
              categories: item.book.bookCategories.map((bookCategory) => ({
                id: bookCategory.category.id,
                slug: bookCategory.category.slug,
                name: bookCategory.category.name,
                isPrimary: bookCategory.isPrimary,
              })),
            },
          })),
        },
        paymentRecords: {
          create: {
            status: input.paymentRecordStatus,
            method: input.checkoutAttempt.paymentMethod!,
            amount: input.checkoutAttempt.totalAmount,
            currency: CurrencyCode.VND,
            attemptNumber: 1,
          },
        },
      },
      select: {
        id: true,
      },
    });

    return this.findOrderByOrderNumber(input.orderNumber, db).then((createdOrder) => {
      if (!createdOrder) {
        throw new Error(`Order ${order.id} was not found after create.`);
      }

      return createdOrder;
    });
  }

  async markCartCheckedOut(cartId: string, db?: DbClient): Promise<void> {
    const client = await getDb(db);

    await client.cart.update({
      where: {
        id: cartId,
      },
      data: {
        checkedOutAt: new Date(),
        isActive: false,
      },
    });
  }

  async cancelOrder(
    orderNumber: string,
    input: {
      reason?: string;
      markPaymentFailed?: boolean;
    },
    db?: DbClient,
  ): Promise<OrderRecord> {
    const client = await getDb(db);
    const now = new Date();

    const order = await client.order.findUnique({
      where: {
        orderNumber,
      },
      select: {
        id: true,
        paymentRecords: {
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
          },
          take: 1,
        },
      },
    });

    if (!order) {
      throw new Error(`Order ${orderNumber} was not found.`);
    }

    await client.order.update({
      where: {
        orderNumber,
      },
      data: {
        status: "CANCELLED",
        cancelledAt: now,
        cancellationReason: input.reason ?? undefined,
        paymentStatus: input.markPaymentFailed ? "FAILED" : undefined,
      },
    });

    if (input.markPaymentFailed) {
      const latestPaymentRecord = order.paymentRecords[0];

      if (latestPaymentRecord) {
        await client.paymentRecord.update({
          where: {
            id: latestPaymentRecord.id,
          },
          data: {
            status: PaymentStatus.FAILED,
            failedAt: now,
            note: input.reason ?? undefined,
          },
        });
      }
    }

    return this.findOrderByOrderNumber(orderNumber, db).then((order) => {
      if (!order) {
        throw new Error(`Order ${orderNumber} was not found after cancellation.`);
      }

      return order;
    });
  }

  async markBankTransferReceived(
    orderNumber: string,
    input: {
      externalReference?: string;
      note?: string;
    },
    db?: DbClient,
  ): Promise<OrderRecord> {
    const client = await getDb(db);
    const now = new Date();

    const order = await client.order.findUnique({
      where: {
        orderNumber,
      },
      select: {
        id: true,
        paymentRecords: {
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
          },
          take: 1,
        },
      },
    });

    if (!order) {
      throw new Error(`Order ${orderNumber} was not found.`);
    }

    await client.order.update({
      where: {
        orderNumber,
      },
      data: {
        status: "CONFIRMED",
        paymentStatus: "PAID",
        confirmedAt: now,
      },
    });

    const latestPaymentRecord = order.paymentRecords[0];

    if (latestPaymentRecord) {
      await client.paymentRecord.update({
        where: {
          id: latestPaymentRecord.id,
        },
        data: {
          status: PaymentStatus.PAID,
          externalReference: input.externalReference ?? undefined,
          note: input.note ?? undefined,
          paidAt: now,
          verifiedAt: now,
        },
      });
    }

    return this.findOrderByOrderNumber(orderNumber, db).then((updatedOrder) => {
      if (!updatedOrder) {
        throw new Error(`Order ${orderNumber} was not found after bank transfer update.`);
      }

      return updatedOrder;
    });
  }

  async createCheckoutAnalytics(params: {
    requestId: string;
    sessionId?: string;
    userId?: string | null;
    cartId?: string | null;
    orderId?: string | null;
    checkoutAttemptId?: string | null;
    eventName: AnalyticsEventName;
    paymentMethod?: Prisma.FactCheckoutEventCreateInput["paymentMethod"];
    totalAmount?: number;
    errorCode?: string;
    payload: Prisma.InputJsonValue;
  }, db?: DbClient): Promise<void> {
    const client = await getDb(db);
    const occurredAt = new Date();

    await client.analyticsEventOutbox.create({
      data: {
        dedupeKey: `checkout:${params.requestId}:${params.eventName}:${params.checkoutAttemptId ?? "none"}:${params.orderId ?? "none"}`,
        eventName: params.eventName,
        sourceModule: "checkout",
        sessionId: params.sessionId,
        cartId: params.cartId ?? undefined,
        orderId: params.orderId ?? undefined,
        userId: params.userId ?? undefined,
        occurredAt,
        isCritical:
          params.eventName === AnalyticsEventName.PURCHASE ||
          params.eventName === AnalyticsEventName.PAYMENT_SUCCESS,
        payload: params.payload,
      },
    });

    await client.factCheckoutEvent.create({
      data: {
        sessionId: params.sessionId,
        userId: params.userId ?? undefined,
        orderId: params.orderId ?? undefined,
        checkoutAttemptId: params.checkoutAttemptId ?? undefined,
        eventName: params.eventName,
        paymentMethod: params.paymentMethod,
        totalAmount: params.totalAmount,
        errorCode: params.errorCode,
        occurredAt,
      },
    });
  }

  async createFactOrdersForOrder(order: OrderRecord, db?: DbClient): Promise<void> {
    const client = await getDb(db);

    const rows: Prisma.FactOrderCreateManyInput[] = order.items.map((item) => {
      const metadata =
        item.snapshotMetadata && typeof item.snapshotMetadata === "object"
          ? (item.snapshotMetadata as {
              categories?: Array<{ id?: string; isPrimary?: boolean }>;
            })
          : {};
      const categories = Array.isArray(metadata.categories) ? metadata.categories : [];
      const primaryCategory =
        categories.find((category) => category.isPrimary) ?? categories[0];

      return {
        orderId: order.id,
        orderItemId: item.id,
        orderNumber: order.orderNumber,
        sessionId: order.sessionId ?? undefined,
        userId: order.userId ?? undefined,
        bookId: item.bookId ?? undefined,
        categoryId: primaryCategory?.id,
        paymentMethod: order.paymentMethod,
        orderStatus: order.status,
        paymentStatus: order.paymentStatus,
        quantity: item.quantity,
        subtotalAmount: item.lineSubtotalAmount,
        shippingFeeAmount: item.shippingFeeAmount,
        totalAmount: item.lineSubtotalAmount + item.shippingFeeAmount,
        currency: CurrencyCode.VND,
        isGuestOrder: !order.userId,
        orderedAt: order.placedAt,
      };
    });

    if (rows.length === 0) {
      return;
    }

    await client.factOrder.createMany({
      data: rows,
      skipDuplicates: true,
    });
  }
}
