import { randomBytes } from "node:crypto";
import type { Prisma } from "../../generated/prisma/client.js";
import { AnalyticsEventName, PaymentMethodCode, PublishStatus } from "../../generated/prisma/enums.js";
import { env } from "../../config/env";
import {
  ANALYTICS_EVENTS,
  AVAILABILITY_STATUS,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  USER_ROLES,
  type MoneyDto,
  type PaymentMethodCode as SharedPaymentMethodCode,
  type UserRole,
} from "../../shared/contracts";
import { withDbTransaction, type DbClient } from "../../shared/database/repository";
import { AppError } from "../../shared/errors/app-error";
import { makeMoney } from "../../shared/utils/money";
import { getPrismaClient } from "../../infra/database/prisma";
import {
  calculateCartTotals,
  mergeCartSnapshots,
  type CartLinePricingInput,
  type CartWarning,
} from "../cart/cart.logic";
import { CartRepository, type ActiveCartRecord } from "../cart/cart.repository";
import {
  buildBankTransferInstruction,
  buildOrderIdempotencyKey,
  getInitialOrderState,
  resolveCheckoutAttemptStatus,
  type NormalizedCheckoutShippingInfo,
} from "./checkout.logic";
import { CheckoutRepository, type CheckoutAttemptRecord, type OrderRecord } from "./checkout.repository";
import type {
  CheckoutAttemptViewModel,
  CheckoutIdentityInput,
  CheckoutPageModel,
  CheckoutRequestContext,
  CheckoutSummaryViewModel,
  CheckoutWarningViewModel,
  OrderDetailPageModel,
  OrderSuccessPageModel,
  OrderViewModel,
  ParsedCheckoutPaymentPayload,
  ParsedCheckoutShippingPayload,
  ParsedPlaceOrderPayload,
} from "./checkout.types";

const CHECKOUT_EXPIRES_IN_MS = 1000 * 60 * 60 * 24;

function toCartLinePricingInput(
  item: ActiveCartRecord["items"][number],
): CartLinePricingInput {
  return {
    bookId: item.bookId,
    title: item.book.title,
    slug: item.book.slug,
    authorName: item.book.author.name,
    coverImageUrl: item.book.coverImageUrl,
    quantity: item.quantity,
    unitPriceAmount: item.book.priceAmount,
    compareAtAmount: item.book.compareAtAmount,
    shippingFeeAmount: item.book.shippingFeeAmount,
    inventoryQuantity: item.book.inventoryQuantity,
    availabilityStatus: item.book.availabilityStatus,
  };
}

function toWarningViewModel(warning: CartWarning): CheckoutWarningViewModel {
  return {
    code: warning.code,
    message: warning.message,
    tone: warning.code === "ITEM_REMOVED_UNAVAILABLE" ? "danger" : "warning",
  };
}

function buildEmptyShippingViewModel(
  shipping?: Partial<NormalizedCheckoutShippingInfo> | null,
): CheckoutAttemptViewModel["shipping"] {
  return {
    fullName: shipping?.fullName ?? "",
    phoneNumber: shipping?.phoneNumber ?? "",
    addressLine1: shipping?.addressLine1 ?? "",
    ward: shipping?.ward ?? "",
    district: shipping?.district ?? "",
    province: shipping?.province ?? "",
    note: shipping?.note ?? "",
  };
}

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function buildSummaryViewModel(input: {
  itemCount: number;
  subtotalAmount: number;
  shippingFeeAmount: number;
  totalAmount: number;
}): CheckoutSummaryViewModel {
  return {
    itemCount: input.itemCount,
    subtotal: makeMoney(input.subtotalAmount),
    shippingFee: makeMoney(input.shippingFeeAmount),
    total: makeMoney(input.totalAmount),
  };
}

function makeOrderNumber(now = new Date()): string {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const suffix = randomBytes(3).toString("hex").toUpperCase();
  return `ORD-${yyyy}${mm}${dd}-${suffix}`;
}

export class CheckoutService {
  constructor(
    private readonly checkoutRepository: CheckoutRepository = new CheckoutRepository(),
    private readonly cartRepository: CartRepository = new CartRepository(),
  ) {}

  private ensureCartIdentityMatchesRequest(
    cart: ActiveCartRecord,
    identity: CheckoutIdentityInput,
  ): void {
    const matchesUser = identity.userId && cart.userId === identity.userId;
    const matchesSession = identity.sessionId && cart.sessionId === identity.sessionId;

    if (!matchesUser && !matchesSession) {
      throw new AppError({
        statusCode: 404,
        code: "CART_NOT_FOUND",
        message: "Không tìm thấy giỏ hàng hợp lý để thanh toán.",
      });
    }
  }

  private async ensureCheckoutCart(
    identity: CheckoutIdentityInput,
    tx: DbClient,
  ): Promise<ActiveCartRecord> {
    if (!identity.existingCartId) {
      throw new AppError({
        statusCode: 409,
        code: "CART_REQUIRED",
        message: "Cần có giỏ hàng trước khi bắt đầu thanh toán.",
      });
    }

    const cart = await this.cartRepository.findActiveCartById(identity.existingCartId, tx);

    if (!cart) {
      throw new AppError({
        statusCode: 404,
        code: "CART_NOT_FOUND",
        message: "Không tìm thấy giỏ hàng để thanh toán.",
      });
    }

    this.ensureCartIdentityMatchesRequest(cart, identity);

    if (cart.items.length === 0) {
      throw new AppError({
        statusCode: 409,
        code: "CART_EMPTY",
        message: "Giỏ hàng đang trống nên không thể thanh toán.",
      });
    }

    return cart;
  }

  private async recalculateCartForCheckout(
    cart: ActiveCartRecord,
    tx: DbClient,
  ): Promise<{ cart: ActiveCartRecord; warnings: CartWarning[] }> {
    const merged = mergeCartSnapshots({
      baseItems: [],
      incomingItems: cart.items.map(toCartLinePricingInput),
    });

    if (merged.items.length === 0) {
      throw new AppError({
        statusCode: 409,
        code: "CHECKOUT_CART_UNAVAILABLE",
        message: "Không còn sản phẩm hợp lệ trong giỏ để đặt hàng.",
      });
    }

    const hasUnpublishedItem = cart.items.some((item) => item.book.publishStatus !== PublishStatus.PUBLISHED);
    if (hasUnpublishedItem) {
      throw new AppError({
        statusCode: 409,
        code: "CHECKOUT_ITEM_NOT_PUBLISHED",
        message: "Có sản phẩm không còn xuất bản hợp lệ trong giỏ hàng.",
      });
    }

    await this.cartRepository.syncCartItems(
      cart.id,
      merged.summary.items.map((item) => ({
        bookId: item.bookId,
        quantity: item.quantity,
        unitPriceAmount: item.unitPriceAmount,
        compareAtAmount: item.compareAtAmount,
        shippingFeeAmount: item.shippingFeeAmount,
        lineSubtotalAmount: item.lineSubtotalAmount,
        lineTotalAmount: item.lineTotalAmount,
      })),
      tx,
    );

    await this.cartRepository.setCartTotals(
      cart.id,
      {
        itemCount: merged.summary.itemCount,
        subtotalAmount: merged.summary.subtotalAmount,
        shippingFeeAmount: merged.summary.shippingFeeAmount,
        totalAmount: merged.summary.totalAmount,
      },
      tx,
    );

    const refreshedCart = await this.cartRepository.findActiveCartById(cart.id, tx);

    if (!refreshedCart) {
      throw new AppError({
        statusCode: 500,
        code: "CART_NOT_FOUND_AFTER_RECALCULATE",
        message: "Không thể tải lại giỏ hàng sau khi tính lại thanh toán.",
      });
    }

    return {
      cart: refreshedCart,
      warnings: merged.warnings,
    };
  }

  private buildCheckoutViewModel(
    attempt: CheckoutAttemptRecord,
    warnings: CartWarning[] = [],
  ): CheckoutAttemptViewModel {
    const paymentMethod = attempt.paymentMethod as SharedPaymentMethodCode | null;

    return {
      id: attempt.id,
      status: attempt.status,
      paymentMethod,
      canPlaceOrder: attempt.status === "READY_TO_PLACE",
      isGuestCheckout: !attempt.userId,
      shipping: buildEmptyShippingViewModel(
        attempt.shippingFullName
          ? {
              fullName: attempt.shippingFullName,
              phoneNumber: attempt.shippingPhoneNumber ?? "",
              addressLine1: attempt.shippingAddressLine1 ?? "",
              ward: attempt.shippingWard ?? "",
              district: attempt.shippingDistrict ?? "",
              province: attempt.shippingProvince ?? "",
              note: attempt.shippingNote ?? "",
            }
          : null,
      ),
      paymentOptions: [
        {
          code: PAYMENT_METHOD.COD,
          label: "Thanh toán khi nhận hàng",
          description: "Đơn được tạo ngay và thu tiền khi giao hàng.",
          selected: paymentMethod === PAYMENT_METHOD.COD,
        },
        {
          code: PAYMENT_METHOD.BANK_TRANSFER,
          label: "Chuyển khoản ngân hàng",
          description: "Đơn chỉ xác nhận sau khi bạn chuyển khoản đúng nội dung.",
          selected: paymentMethod === PAYMENT_METHOD.BANK_TRANSFER,
        },
      ],
      summary: buildSummaryViewModel({
        itemCount: attempt.cart.itemCount,
        subtotalAmount: attempt.subtotalAmount,
        shippingFeeAmount: attempt.shippingFeeAmount,
        totalAmount: attempt.totalAmount,
      }),
      warnings: warnings.map(toWarningViewModel),
      expiresAt: attempt.expiresAt ? attempt.expiresAt.toISOString() : null,
      placeOrderIdempotencyKey: buildOrderIdempotencyKey({
        checkoutAttemptId: attempt.id,
      }),
    };
  }

  private async getCheckoutAttemptForRequest(
    identity: CheckoutIdentityInput,
    tx: DbClient,
  ): Promise<CheckoutAttemptRecord> {
    const cart = await this.ensureCheckoutCart(identity, tx);

    if (identity.existingCheckoutAttemptId) {
      const existingAttempt = await this.checkoutRepository.findActiveCheckoutAttemptById(
        identity.existingCheckoutAttemptId,
        tx,
      );

      if (existingAttempt && existingAttempt.cartId === cart.id) {
        return existingAttempt;
      }
    }

    const latestAttempt = await this.checkoutRepository.findLatestCheckoutAttemptForCart(
      {
        cartId: cart.id,
        userId: identity.userId,
        sessionId: identity.sessionId,
      },
      tx,
    );

    if (latestAttempt && latestAttempt.status !== "COMPLETED") {
      return latestAttempt;
    }

    const recalculated = await this.recalculateCartForCheckout(cart, tx);
    const attempt = await this.checkoutRepository.createCheckoutAttempt(
      {
        cartId: recalculated.cart.id,
        userId: recalculated.cart.userId,
        sessionId: recalculated.cart.sessionId ?? identity.sessionId,
        subtotalAmount: recalculated.cart.subtotalAmount,
        shippingFeeAmount: recalculated.cart.shippingFeeAmount,
        totalAmount: recalculated.cart.totalAmount,
        expiresAt: new Date(Date.now() + CHECKOUT_EXPIRES_IN_MS),
      },
      tx,
    );

    return attempt;
  }

  private async emitCheckoutError(
    tx: DbClient,
    input: CheckoutRequestContext & {
      cartId?: string | null;
      checkoutAttemptId?: string | null;
      paymentMethod?: PaymentMethodCode | null;
      totalAmount?: number;
      errorCode: string;
      message: string;
    },
  ): Promise<void> {
    await this.checkoutRepository.createCheckoutAnalytics(
      {
        requestId: input.requestId,
        sessionId: input.sessionId,
        userId: input.userId,
        cartId: input.cartId,
        checkoutAttemptId: input.checkoutAttemptId,
        eventName: AnalyticsEventName.CHECKOUT_ERROR,
        paymentMethod: input.paymentMethod ?? undefined,
        totalAmount: input.totalAmount,
        errorCode: input.errorCode,
        payload: {
          errorCode: input.errorCode,
          message: input.message,
        },
      },
      tx,
    );
  }

  async startCheckout(input: {
    identity: CheckoutIdentityInput;
    requestContext: CheckoutRequestContext;
  }): Promise<{ attempt: CheckoutAttemptRecord; warnings: CartWarning[] }> {
    const db = await getPrismaClient();
    const cart = await this.ensureCheckoutCart(input.identity, db);
    const recalculated = await this.recalculateCartForCheckout(cart, db);
    const latestAttempt = await this.checkoutRepository.findLatestCheckoutAttemptForCart(
      {
        cartId: recalculated.cart.id,
        userId: input.identity.userId,
        sessionId: input.identity.sessionId,
      },
      db,
    );

    let attempt = latestAttempt;

    if (!attempt || attempt.status === "COMPLETED") {
      attempt = await this.checkoutRepository.createCheckoutAttempt(
        {
          cartId: recalculated.cart.id,
          userId: recalculated.cart.userId,
          sessionId: recalculated.cart.sessionId ?? input.identity.sessionId,
          subtotalAmount: recalculated.cart.subtotalAmount,
          shippingFeeAmount: recalculated.cart.shippingFeeAmount,
          totalAmount: recalculated.cart.totalAmount,
          expiresAt: new Date(Date.now() + CHECKOUT_EXPIRES_IN_MS),
        },
        db,
      );
    } else {
      attempt = await this.checkoutRepository.updateCheckoutAttempt(
        attempt.id,
        {
          subtotalAmount: recalculated.cart.subtotalAmount,
          shippingFeeAmount: recalculated.cart.shippingFeeAmount,
          totalAmount: recalculated.cart.totalAmount,
          status: resolveCheckoutAttemptStatus({
            hasShippingInfo: Boolean(
              attempt.shippingFullName &&
                attempt.shippingPhoneNumber &&
                attempt.shippingAddressLine1 &&
                attempt.shippingWard &&
                attempt.shippingDistrict &&
                attempt.shippingProvince,
            ),
            paymentMethod: attempt.paymentMethod,
            isCompleted: false,
          }),
          lastErrorCode: null,
          lastErrorMessage: null,
        },
        db,
      );
    }

    await this.checkoutRepository.createCheckoutAnalytics(
      {
        requestId: input.requestContext.requestId,
        sessionId: input.requestContext.sessionId,
        userId: input.requestContext.userId,
        cartId: recalculated.cart.id,
        checkoutAttemptId: attempt.id,
        eventName: AnalyticsEventName.BEGIN_CHECKOUT,
        totalAmount: attempt.totalAmount,
        payload: {
          cartId: recalculated.cart.id,
          itemCount: recalculated.cart.itemCount,
          totalAmount: attempt.totalAmount,
          isGuestCheckout: !attempt.userId,
        },
      },
      db,
    );

    return {
      attempt,
      warnings: recalculated.warnings,
    };
  }

  async saveShippingInfo(input: {
    identity: CheckoutIdentityInput;
    payload: ParsedCheckoutShippingPayload;
    requestContext: CheckoutRequestContext;
  }): Promise<CheckoutAttemptRecord> {
    const db = await getPrismaClient();
    const attempt = await this.getCheckoutAttemptForRequest(
      {
        ...input.identity,
        existingCheckoutAttemptId:
          input.payload.checkoutAttemptId ?? input.identity.existingCheckoutAttemptId,
      },
      db,
    );

    const updatedAttempt = await this.checkoutRepository.updateCheckoutAttempt(
      attempt.id,
      {
        shippingFullName: input.payload.fullName,
        shippingPhoneNumber: input.payload.phoneNumber,
        shippingAddressLine1: input.payload.addressLine1,
        shippingWard: input.payload.ward,
        shippingDistrict: input.payload.district,
        shippingProvince: input.payload.province,
        shippingNote: input.payload.note ?? undefined,
        shippingInfoSubmittedAt: new Date(),
        status: resolveCheckoutAttemptStatus({
          hasShippingInfo: true,
          paymentMethod: attempt.paymentMethod,
          isCompleted: false,
        }),
        lastErrorCode: null,
        lastErrorMessage: null,
      },
      db,
    );

    await this.checkoutRepository.createCheckoutAnalytics(
      {
        requestId: input.requestContext.requestId,
        sessionId: input.requestContext.sessionId,
        userId: input.requestContext.userId,
        cartId: updatedAttempt.cartId,
        checkoutAttemptId: updatedAttempt.id,
        eventName: AnalyticsEventName.ADD_SHIPPING_INFO,
        paymentMethod: updatedAttempt.paymentMethod ?? undefined,
        totalAmount: updatedAttempt.totalAmount,
        payload: {
          province: updatedAttempt.shippingProvince,
          district: updatedAttempt.shippingDistrict,
          hasNote: Boolean(updatedAttempt.shippingNote),
        },
      },
      db,
    );

    return updatedAttempt;
  }

  async savePaymentMethod(input: {
    identity: CheckoutIdentityInput;
    payload: ParsedCheckoutPaymentPayload;
    requestContext: CheckoutRequestContext;
  }): Promise<CheckoutAttemptRecord> {
    const db = await getPrismaClient();
    const attempt = await this.getCheckoutAttemptForRequest(
      {
        ...input.identity,
        existingCheckoutAttemptId:
          input.payload.checkoutAttemptId ?? input.identity.existingCheckoutAttemptId,
      },
      db,
    );

    const updatedAttempt = await this.checkoutRepository.updateCheckoutAttempt(
      attempt.id,
      {
        paymentMethod: input.payload.paymentMethod,
        paymentMethodSelectedAt: new Date(),
        status: resolveCheckoutAttemptStatus({
          hasShippingInfo: Boolean(
            attempt.shippingFullName &&
              attempt.shippingPhoneNumber &&
              attempt.shippingAddressLine1 &&
              attempt.shippingWard &&
              attempt.shippingDistrict &&
              attempt.shippingProvince,
          ),
          paymentMethod: input.payload.paymentMethod,
          isCompleted: false,
        }),
        lastErrorCode: null,
        lastErrorMessage: null,
      },
      db,
    );

    await this.checkoutRepository.createCheckoutAnalytics(
      {
        requestId: input.requestContext.requestId,
        sessionId: input.requestContext.sessionId,
        userId: input.requestContext.userId,
        cartId: updatedAttempt.cartId,
        checkoutAttemptId: updatedAttempt.id,
        eventName: AnalyticsEventName.SELECT_PAYMENT_METHOD,
        paymentMethod: updatedAttempt.paymentMethod ?? undefined,
        totalAmount: updatedAttempt.totalAmount,
        payload: {
          paymentMethod: updatedAttempt.paymentMethod,
        },
      },
      db,
    );

    return updatedAttempt;
  }

  async getCheckoutSummary(input: {
    identity: CheckoutIdentityInput;
    requestContext: CheckoutRequestContext;
  }): Promise<{ attempt: CheckoutAttemptRecord; warnings: CartWarning[] }> {
    const db = await getPrismaClient();
    const cart = await this.ensureCheckoutCart(input.identity, db);
    const recalculated = await this.recalculateCartForCheckout(cart, db);
    const attempt = await this.getCheckoutAttemptForRequest(
      {
        ...input.identity,
        existingCartId: recalculated.cart.id,
      },
      db,
    );

    const updatedAttempt = await this.checkoutRepository.updateCheckoutAttempt(
      attempt.id,
      {
        subtotalAmount: recalculated.cart.subtotalAmount,
        shippingFeeAmount: recalculated.cart.shippingFeeAmount,
        totalAmount: recalculated.cart.totalAmount,
      },
      db,
    );

    return {
      attempt: updatedAttempt,
      warnings: recalculated.warnings,
    };
  }

  async placeOrder(input: {
    identity: CheckoutIdentityInput;
    payload: ParsedPlaceOrderPayload;
    requestContext: CheckoutRequestContext;
  }): Promise<OrderRecord> {
    return withDbTransaction(async (tx) => {
      const directIdempotencyKey =
        input.payload.idempotencyKey?.trim() || input.identity.existingCheckoutAttemptId
          ? buildOrderIdempotencyKey({
              checkoutAttemptId:
                input.payload.checkoutAttemptId ??
                input.identity.existingCheckoutAttemptId ??
                "unknown",
              providedKey: input.payload.idempotencyKey,
            })
          : null;

      if (directIdempotencyKey) {
        const existingOrder = await this.checkoutRepository.findOrderByIdempotencyKey(
          directIdempotencyKey,
          tx,
        );

        if (existingOrder) {
          return existingOrder;
        }
      }

      const attempt = await this.getCheckoutAttemptForRequest(
        {
          ...input.identity,
          existingCheckoutAttemptId: input.payload.checkoutAttemptId ?? input.identity.existingCheckoutAttemptId,
        },
        tx,
      );

      const cart = await this.ensureCheckoutCart(
        {
          ...input.identity,
          existingCartId: attempt.cartId,
        },
        tx,
      );
      const recalculated = await this.recalculateCartForCheckout(cart, tx);

      const refreshedAttempt = await this.checkoutRepository.updateCheckoutAttempt(
        attempt.id,
        {
          subtotalAmount: recalculated.cart.subtotalAmount,
          shippingFeeAmount: recalculated.cart.shippingFeeAmount,
          totalAmount: recalculated.cart.totalAmount,
        },
        tx,
      );

      const hasShippingInfo = Boolean(
        refreshedAttempt.shippingFullName &&
          refreshedAttempt.shippingPhoneNumber &&
          refreshedAttempt.shippingAddressLine1 &&
          refreshedAttempt.shippingWard &&
          refreshedAttempt.shippingDistrict &&
          refreshedAttempt.shippingProvince,
      );

      if (!hasShippingInfo || !refreshedAttempt.paymentMethod) {
        const errorCode = "CHECKOUT_INCOMPLETE";
        await this.checkoutRepository.updateCheckoutAttempt(
          refreshedAttempt.id,
          {
            status: resolveCheckoutAttemptStatus({
              hasShippingInfo,
              paymentMethod: refreshedAttempt.paymentMethod,
              isCompleted: false,
            }),
            lastErrorCode: errorCode,
            lastErrorMessage: "Thanh toán chưa đủ thông tin giao hàng hoặc phương thức thanh toán.",
          },
          tx,
        );

        await this.emitCheckoutError(tx, {
          ...input.requestContext,
          cartId: refreshedAttempt.cartId,
          checkoutAttemptId: refreshedAttempt.id,
          paymentMethod: refreshedAttempt.paymentMethod,
          totalAmount: refreshedAttempt.totalAmount,
          errorCode,
          message: "Thanh toán chưa đủ điều kiện để tạo đơn hàng.",
        });

        throw new AppError({
          statusCode: 409,
          code: errorCode,
          message: "Thanh toán chưa đủ thông tin giao hàng và phương thức thanh toán để tạo đơn hàng..",
        });
      }

      const idempotencyKey = buildOrderIdempotencyKey({
        checkoutAttemptId: refreshedAttempt.id,
        providedKey: input.payload.idempotencyKey,
      });

      const existingOrder = await this.checkoutRepository.findOrderByIdempotencyKey(
        idempotencyKey,
        tx,
      );

      if (existingOrder) {
        return existingOrder;
      }

      const initialState = getInitialOrderState(refreshedAttempt.paymentMethod);

      const createdOrder = await this.checkoutRepository.createOrderFromCheckout(
        {
          orderNumber: makeOrderNumber(),
          idempotencyKey,
          checkoutAttempt: refreshedAttempt,
          customerEmail: refreshedAttempt.userId ? undefined : null,
          orderStatus: initialState.orderStatus,
          paymentStatus: initialState.paymentStatus,
          paymentRecordStatus: initialState.paymentRecordStatus,
        },
        tx,
      );

      await this.checkoutRepository.updateCheckoutAttempt(
        refreshedAttempt.id,
        {
          status: "COMPLETED",
          completedAt: new Date(),
          lastErrorCode: null,
          lastErrorMessage: null,
          order: {
            connect: {
              id: createdOrder.id,
            },
          },
        },
        tx,
      );
      await this.checkoutRepository.markCartCheckedOut(refreshedAttempt.cartId, tx);

      await this.checkoutRepository.createCheckoutAnalytics(
        {
          requestId: input.requestContext.requestId,
          sessionId: input.requestContext.sessionId,
          userId: input.requestContext.userId,
          cartId: refreshedAttempt.cartId,
          checkoutAttemptId: refreshedAttempt.id,
          orderId: createdOrder.id,
          eventName: AnalyticsEventName.PURCHASE,
          paymentMethod: createdOrder.paymentMethod,
          totalAmount: createdOrder.totalAmount,
          payload: {
            orderNumber: createdOrder.orderNumber,
            paymentMethod: createdOrder.paymentMethod,
            totalAmount: createdOrder.totalAmount,
            itemCount: createdOrder.itemCount,
          },
        },
        tx,
      );

      if (createdOrder.paymentMethod === PAYMENT_METHOD.COD) {
        await this.checkoutRepository.createCheckoutAnalytics(
          {
            requestId: `${input.requestContext.requestId}:payment-success`,
            sessionId: input.requestContext.sessionId,
            userId: input.requestContext.userId,
            cartId: refreshedAttempt.cartId,
            checkoutAttemptId: refreshedAttempt.id,
            orderId: createdOrder.id,
            eventName: AnalyticsEventName.PAYMENT_SUCCESS,
            paymentMethod: createdOrder.paymentMethod,
            totalAmount: createdOrder.totalAmount,
            payload: {
              orderNumber: createdOrder.orderNumber,
              paymentMethod: createdOrder.paymentMethod,
              state: "pending-collection-on-delivery",
            },
          },
          tx,
        );
      }

      await this.checkoutRepository.createFactOrdersForOrder(createdOrder, tx);

      return createdOrder;
    });
  }

  async getOrder(orderNumber: string): Promise<OrderRecord> {
    const order = await this.checkoutRepository.findOrderByOrderNumber(orderNumber);

    if (!order) {
      throw new AppError({
        statusCode: 404,
        code: "ORDER_NOT_FOUND",
        message: "Không tìm thấy đơn hàng.",
      });
    }

    return order;
  }

  async cancelOrder(input: {
    orderNumber: string;
    reason?: string;
    requestContext: CheckoutRequestContext;
  }): Promise<OrderRecord> {
    return withDbTransaction(async (tx) => {
      const order = await this.checkoutRepository.findOrderByOrderNumber(input.orderNumber, tx);

      if (!order) {
        throw new AppError({
          statusCode: 404,
          code: "ORDER_NOT_FOUND",
          message: "Không tìm thấy đơn hàng cần huỷ.",
        });
      }

      if (order.status === "CANCELLED") {
        return order;
      }

      const cancelledOrder = await this.checkoutRepository.cancelOrder(
        input.orderNumber,
        {
          reason: input.reason,
          markPaymentFailed:
            order.paymentMethod === PAYMENT_METHOD.BANK_TRANSFER &&
            order.paymentStatus !== PAYMENT_STATUS.PAID,
        },
        tx,
      );

      await this.checkoutRepository.createCheckoutAnalytics(
        {
          requestId: `${input.requestContext.requestId}:cancel`,
          sessionId: input.requestContext.sessionId,
          userId: input.requestContext.userId,
          cartId: order.sourceCartId,
          orderId: order.id,
          checkoutAttemptId: order.checkoutAttemptId,
          eventName: AnalyticsEventName.CHECKOUT_ERROR,
          paymentMethod: order.paymentMethod,
          totalAmount: order.totalAmount,
          errorCode: "ORDER_CANCELLED",
          payload: {
            orderNumber: order.orderNumber,
            reason: input.reason ?? null,
          },
        },
        tx,
      );

      if (
        order.paymentMethod === PAYMENT_METHOD.BANK_TRANSFER &&
        order.paymentStatus !== PAYMENT_STATUS.PAID
      ) {
        await this.checkoutRepository.createCheckoutAnalytics(
          {
            requestId: `${input.requestContext.requestId}:payment-failed`,
            sessionId: input.requestContext.sessionId,
            userId: input.requestContext.userId,
            cartId: order.sourceCartId,
            orderId: order.id,
            checkoutAttemptId: order.checkoutAttemptId,
            eventName: AnalyticsEventName.PAYMENT_FAILED,
            paymentMethod: order.paymentMethod,
            totalAmount: order.totalAmount,
            payload: {
              orderNumber: order.orderNumber,
              reason: input.reason ?? "order_cancelled_before_transfer_confirmation",
            },
          },
          tx,
        );
      }

      return cancelledOrder;
    });
  }

  async markBankTransferReceived(input: {
    orderNumber: string;
    externalReference?: string;
    note?: string;
    requestContext: CheckoutRequestContext;
  }): Promise<OrderRecord> {
    return withDbTransaction(async (tx) => {
      const order = await this.checkoutRepository.findOrderByOrderNumber(input.orderNumber, tx);

      if (!order) {
        throw new AppError({
          statusCode: 404,
          code: "ORDER_NOT_FOUND",
          message: "Không tìm thấy đơn hàng cần xác nhận chuyển khoản.",
        });
      }

      if (order.paymentMethod !== PAYMENT_METHOD.BANK_TRANSFER) {
        throw new AppError({
          statusCode: 409,
          code: "INVALID_PAYMENT_METHOD",
          message: "Chỉ đơn chuyển khoản ngân hàng mới có thể đánh dấu là đã nhận tiền.",
        });
      }

      const updatedOrder = await this.checkoutRepository.markBankTransferReceived(
        input.orderNumber,
        {
          externalReference: input.externalReference,
          note: input.note,
        },
        tx,
      );

      await this.checkoutRepository.createCheckoutAnalytics(
        {
          requestId: `${input.requestContext.requestId}:payment-success`,
          sessionId: updatedOrder.sessionId ?? input.requestContext.sessionId,
          userId: updatedOrder.userId ?? input.requestContext.userId,
          cartId: updatedOrder.sourceCartId,
          orderId: updatedOrder.id,
          checkoutAttemptId: updatedOrder.checkoutAttemptId,
          eventName: AnalyticsEventName.PAYMENT_SUCCESS,
          paymentMethod: updatedOrder.paymentMethod,
          totalAmount: updatedOrder.totalAmount,
          payload: {
            orderNumber: updatedOrder.orderNumber,
            externalReference: input.externalReference ?? null,
          },
        },
        tx,
      );

      return updatedOrder;
    });
  }

  buildCheckoutPageModel(
    attempt: CheckoutAttemptRecord,
    warnings: CartWarning[] = [],
  ): CheckoutPageModel {
    const checkout = this.buildCheckoutViewModel(attempt, warnings);

    return {
      title: "Thanh to?n",
      description: "Nhập thông tin giao hàng, chọn thanh toàn và đặt đơn.",
      pageHeading: "Hoàn tất đơn hàng",
      pageLead: "Dù mua với tư cách khách hay người dùng đã đăng nhập, bạn đều có thể an toàn đặt đơn.",
      cartHref: "/cart",
      checkout,
      analytics: {
        context: {
          pageType: "checkout",
          checkoutAttemptId: attempt.id,
          cartId: attempt.cartId,
          itemCount: attempt.cart.itemCount,
        },
        events: [
          {
            eventName: ANALYTICS_EVENTS.BEGIN_CHECKOUT,
            payload: {
              checkoutAttemptId: attempt.id,
              paymentMethod: attempt.paymentMethod,
              totalAmount: attempt.totalAmount,
            },
          },
        ],
      },
    };
  }

  private buildOrderViewModel(order: OrderRecord): OrderViewModel {
    const bankTransferInstruction =
      order.paymentMethod === PAYMENT_METHOD.BANK_TRANSFER
        ? buildBankTransferInstruction({
            orderNumber: order.orderNumber,
            totalAmount: order.totalAmount,
            bankName: env.BANK_TRANSFER_BANK_NAME,
            accountNumber: env.BANK_TRANSFER_ACCOUNT_NUMBER,
            accountName: env.BANK_TRANSFER_ACCOUNT_NAME,
            notePrefix: env.BANK_TRANSFER_NOTE_PREFIX,
          })
        : undefined;

    return {
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      isGuestOrder: !order.userId,
      customerFullName: order.customerFullName,
      customerPhoneNumber: order.customerPhoneNumber,
      customerEmail: order.customerEmail,
      placedAtLabel: formatDateTime(order.placedAt),
      summary: buildSummaryViewModel({
        itemCount: order.itemCount,
        subtotalAmount: order.subtotalAmount,
        shippingFeeAmount: order.shippingFeeAmount,
        totalAmount: order.totalAmount,
      }),
      address: {
        recipientName: order.address?.recipientName ?? order.customerFullName,
        phoneNumber: order.address?.phoneNumber ?? order.customerPhoneNumber,
        addressLine1: order.address?.addressLine1 ?? "",
        ward: order.address?.ward,
        district: order.address?.district ?? "",
        province: order.address?.province ?? "",
        note: order.address?.note,
      },
      items: order.items.map((item) => ({
        id: item.id,
        bookSlug: item.bookSlug,
        bookTitle: item.bookTitle,
        authorName: item.authorName,
        publisherName: item.publisherName,
        quantity: item.quantity,
        coverImageUrl: item.coverImageUrl,
        unitPrice: makeMoney(item.unitPriceAmount),
        lineSubtotal: makeMoney(item.lineSubtotalAmount),
      })),
      payments: order.paymentRecords.map((payment) => ({
        status: payment.status,
        method: payment.method,
        amount: makeMoney(payment.amount),
        attemptNumber: payment.attemptNumber,
        externalReference: payment.externalReference,
        note: payment.note,
      })),
      canCancel:
        order.status !== "CANCELLED" &&
        order.status !== "SHIPPED" &&
        order.status !== "DELIVERED",
      bankTransferInstruction,
    };
  }

  buildOrderSuccessPageModel(order: OrderRecord): OrderSuccessPageModel {
    return {
      title: `Đặt hàng thành công ${order.orderNumber}`,
      description: "Trang xác nhận sau khi tạo đơn hàng thành công.",
      pageHeading: "Đặt hàng thành công",
      pageLead:
        order.paymentMethod === PAYMENT_METHOD.BANK_TRANSFER
          ? "Đơn đã được tạo. Hãy hoàn tất chuyển khoản theo hướng dẫn bên dưới để cửa hàng xác nhận."
          : "Đơn đã được tạo. Bạn sẽ thanh toán khi nhận hàng.",
      continueShoppingHref: "/books",
      orderDetailHref: `/orders/${order.orderNumber}`,
      order: this.buildOrderViewModel(order),
      analytics: {
        context: {
          pageType: "order-success",
          orderNumber: order.orderNumber,
        },
        events: [
          {
            eventName: ANALYTICS_EVENTS.PURCHASE,
            payload: {
              orderNumber: order.orderNumber,
              paymentMethod: order.paymentMethod,
              totalAmount: order.totalAmount,
            },
          },
        ],
      },
    };
  }

  buildOrderDetailPageModel(order: OrderRecord): OrderDetailPageModel {
    return {
      title: `Đơn hàng ${order.orderNumber}`,
      description: "Theo dõi đơn hàng và trạng thái thanh toán từ dữ liệu từ máy chủ.",
      pageHeading: `Đơn hàng ${order.orderNumber}`,
      pageLead: "Chi tiết đơn hàng, địa chỉ giao hàng và lịch sử thanh toán được hiển thị từ backend.",
      continueShoppingHref: "/books",
      order: this.buildOrderViewModel(order),
      analytics: {
        context: {
          pageType: "order-detail",
          orderNumber: order.orderNumber,
        },
        events: [
          {
            eventName: ANALYTICS_EVENTS.PURCHASE,
            payload: {
              orderNumber: order.orderNumber,
              paymentMethod: order.paymentMethod,
              totalAmount: order.totalAmount,
            },
          },
        ],
      },
    };
  }

  async listOrdersForUser(userId: string): Promise<OrderRecord[]> {
    return this.checkoutRepository.findOrdersByUserId(userId);
  }

  private isPrivilegedViewer(role?: UserRole | null): boolean {
    return role === USER_ROLES.ADMIN || role === USER_ROLES.CONTENT_EDITOR || role === USER_ROLES.OPS;
  }

  async getOrderForViewer(input: {
    orderNumber: string;
    viewerUserId?: string | null;
    viewerRole?: UserRole | null;
    viewerSessionId?: string;
  }): Promise<OrderRecord> {
    const order = await this.getOrder(input.orderNumber);

    if (this.isPrivilegedViewer(input.viewerRole)) {
      return order;
    }

    const matchesAuthenticatedOwner =
      Boolean(input.viewerUserId) && Boolean(order.userId) && input.viewerUserId === order.userId;
    const matchesGuestSession =
      !order.userId &&
      Boolean(input.viewerSessionId) &&
      Boolean(order.sessionId) &&
      input.viewerSessionId === order.sessionId;

    if (!matchesAuthenticatedOwner && !matchesGuestSession) {
      throw new AppError({
        statusCode: 403,
        code: "ORDER_ACCESS_DENIED",
        message: "Bạn không có quyền xem đơn hàng này.",
      });
    }

    return order;
  }

  async cancelOrderForViewer(input: {
    orderNumber: string;
    reason?: string;
    requestContext: CheckoutRequestContext;
    viewerUserId?: string | null;
    viewerRole?: UserRole | null;
    viewerSessionId?: string;
  }): Promise<OrderRecord> {
    await this.getOrderForViewer({
      orderNumber: input.orderNumber,
      viewerUserId: input.viewerUserId,
      viewerRole: input.viewerRole,
      viewerSessionId: input.viewerSessionId,
    });

    return this.cancelOrder({
      orderNumber: input.orderNumber,
      reason: input.reason,
      requestContext: input.requestContext,
    });
  }
}
