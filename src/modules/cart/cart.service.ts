import type { Prisma } from "../../generated/prisma/client.js";
import { AnalyticsEventName, PublishStatus } from "../../generated/prisma/enums.js";
import { ANALYTICS_EVENTS, AVAILABILITY_STATUS, CURRENCY } from "../../shared/contracts";
import { withDbTransaction } from "../../shared/database/repository";
import { AppError } from "../../shared/errors/app-error";
import { makeMoney } from "../../shared/utils/money";
import {
  calculateCartTotals,
  mergeCartSnapshots,
  validateRequestedQuantity,
  type CartLinePricingInput,
  type CartWarning,
} from "./cart.logic";
import { CartRepository, type ActiveCartItemRecord, type ActiveCartRecord } from "./cart.repository";
import type {
  CartPageModel,
  CartRequestContext,
  CartViewModel,
  CartWarningViewModel,
  ParsedCartItemMutationInput,
  ParsedCartItemUpdateInput,
} from "./cart.types";

const AVAILABILITY_LABELS = {
  [AVAILABILITY_STATUS.IN_STOCK]: "C?n h?ng",
  [AVAILABILITY_STATUS.LOW_STOCK]: "S?p h?t h?ng",
  [AVAILABILITY_STATUS.OUT_OF_STOCK]: "T?m h?t h?ng",
} as const;

function toCartLinePricingInput(item: ActiveCartItemRecord): CartLinePricingInput {
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

function isBookPurchasable(
  book: Pick<CartLinePricingInput, "availabilityStatus" | "inventoryQuantity">,
): boolean {
  return (
    book.availabilityStatus !== AVAILABILITY_STATUS.OUT_OF_STOCK && book.inventoryQuantity > 0
  );
}

function toWarningViewModel(warning: CartWarning): CartWarningViewModel {
  return {
    code: warning.code,
    message: warning.message,
    tone: warning.code === "ITEM_REMOVED_UNAVAILABLE" ? "danger" : "warning",
  };
}

export class CartService {
  constructor(private readonly repository: CartRepository = new CartRepository()) {}

  buildCartViewModel(
    cart: ActiveCartRecord,
    warnings: CartWarning[] = [],
  ): CartViewModel {
    const summary = calculateCartTotals(cart.items.map(toCartLinePricingInput));

    return {
      id: cart.id,
      currency: CURRENCY.VND,
      itemCount: summary.itemCount,
      isEmpty: summary.items.length === 0,
      isGuestCart: !cart.userId,
      items: summary.items.map((item) => {
        const canPurchase = isBookPurchasable(item);
        const warning =
          !canPurchase
            ? `${item.title} hi?n kh?ng th? mua do h?t h?ng ho?c ng?ng b?n.`
            : item.quantity >= item.inventoryQuantity
              ? `S? l??ng t?i ?a hi?n t?i l? ${item.inventoryQuantity}.`
              : undefined;

        return {
          id:
            cart.items.find((cartItem) => cartItem.bookId === item.bookId)?.id ??
            `${cart.id}:${item.bookId}`,
          bookId: item.bookId,
          title: item.title,
          slug: item.slug,
          detailHref: `/books/${item.slug}`,
          authorName: item.authorName,
          coverImageUrl: item.coverImageUrl,
          availabilityStatus: item.availabilityStatus,
          availabilityLabel: AVAILABILITY_LABELS[item.availabilityStatus],
          inventoryQuantity: item.inventoryQuantity,
          quantity: item.quantity,
          maxQuantity: Math.max(item.inventoryQuantity, 1),
          unitPrice: makeMoney(item.unitPriceAmount),
          compareAt:
            typeof item.compareAtAmount === "number" && item.compareAtAmount > item.unitPriceAmount
              ? makeMoney(item.compareAtAmount)
              : null,
          shippingFee: makeMoney(item.shippingFeeAmount),
          lineSubtotal: makeMoney(item.lineSubtotalAmount),
          lineTotal: makeMoney(item.lineTotalAmount),
          canPurchase,
          warning,
        };
      }),
      summary: {
        itemCount: summary.itemCount,
        subtotal: makeMoney(summary.subtotalAmount),
        shippingFee: makeMoney(summary.shippingFeeAmount),
        total: makeMoney(summary.totalAmount),
      },
      warnings: warnings.map(toWarningViewModel),
    };
  }

  private async trackCartEvent(
    tx: Prisma.TransactionClient,
    params: CartRequestContext & {
      cartId: string;
      eventName: AnalyticsEventName;
      quantity?: number;
      bookId?: string;
      subtotalAmount?: number;
      totalAmount?: number;
      payload: Record<string, unknown>;
    },
  ): Promise<void> {
    const occurredAt = new Date();

    await tx.analyticsEventOutbox.create({
      data: {
        dedupeKey: `cart:${params.requestId}:${params.eventName}:${params.cartId}:${params.bookId ?? "none"}:${params.quantity ?? "none"}`,
        eventName: params.eventName,
        sourceModule: "cart",
        sessionId: params.sessionId,
        cartId: params.cartId,
        userId: params.userId ?? undefined,
        occurredAt,
        payload: params.payload as Prisma.InputJsonValue,
      },
    });

    await tx.factCartEvent.create({
      data: {
        sessionId: params.sessionId,
        userId: params.userId ?? undefined,
        cartId: params.cartId,
        bookId: params.bookId,
        eventName: params.eventName,
        quantity: params.quantity,
        subtotalAmount: params.subtotalAmount,
        totalAmount: params.totalAmount,
        occurredAt,
      },
    });
  }

  private async ensureCartIdentity(
    tx: Prisma.TransactionClient,
    input: {
      existingCartId?: string | null;
      sessionId?: string;
      userId?: string | null;
    },
  ): Promise<ActiveCartRecord> {
    if (input.existingCartId) {
      const cart = await this.repository.findActiveCartById(input.existingCartId, tx);

      if (cart) {
        return cart;
      }
    }

    if (input.userId) {
      const userCart = await this.repository.findActiveCartByUserId(input.userId, tx);

      if (userCart) {
        if (userCart.sessionId !== input.sessionId || userCart.userId !== input.userId) {
          await this.repository.assignCartIdentity(
            userCart.id,
            {
              userId: input.userId,
              sessionId: input.sessionId,
            },
            tx,
          );
        }

        return (await this.repository.findActiveCartById(userCart.id, tx)) ?? userCart;
      }
    }

    if (input.sessionId) {
      const sessionCart = await this.repository.findActiveCartBySessionId(input.sessionId, tx);

      if (sessionCart) {
        if (input.userId && sessionCart.userId !== input.userId) {
          await this.repository.assignCartIdentity(
            sessionCart.id,
            {
              userId: input.userId,
              sessionId: input.sessionId,
            },
            tx,
          );
          return (await this.repository.findActiveCartById(sessionCart.id, tx)) ?? sessionCart;
        }

        return sessionCart;
      }
    }

    return this.repository.createCart(
      {
        userId: input.userId,
        sessionId: input.sessionId,
      },
      tx,
    );
  }

  private async persistRecalculatedCart(
    tx: Prisma.TransactionClient,
    cartId: string,
    lines: CartLinePricingInput[],
  ): Promise<ActiveCartRecord> {
    const summary = calculateCartTotals(lines);

    await this.repository.syncCartItems(
      cartId,
      summary.items.map((item) => ({
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

    await this.repository.setCartTotals(
      cartId,
      {
        itemCount: summary.itemCount,
        subtotalAmount: summary.subtotalAmount,
        shippingFeeAmount: summary.shippingFeeAmount,
        totalAmount: summary.totalAmount,
      },
      tx,
    );

    const cart = await this.repository.findActiveCartById(cartId, tx);

    if (!cart) {
      throw new AppError({
        statusCode: 500,
        code: "CART_NOT_FOUND_AFTER_SAVE",
        message: "Kh?ng th? t?i l?i gi? h?ng sau khi l?u.",
      });
    }

    return cart;
  }

  async getOrCreateCart(input: {
    existingCartId?: string | null;
    sessionId?: string;
    userId?: string | null;
  }): Promise<ActiveCartRecord> {
    return withDbTransaction((tx) =>
      this.ensureCartIdentity(tx, {
        existingCartId: input.existingCartId,
        sessionId: input.sessionId,
        userId: input.userId,
      }),
    );
  }

  async getCartView(input: {
    existingCartId?: string | null;
    sessionId?: string;
    userId?: string | null;
    requestContext: CartRequestContext;
  }): Promise<{ cart: ActiveCartRecord; view: CartViewModel }> {
    return withDbTransaction(async (tx) => {
      const cart = await this.ensureCartIdentity(tx, {
        existingCartId: input.existingCartId,
        sessionId: input.sessionId,
        userId: input.userId,
      });

      await this.trackCartEvent(tx, {
        ...input.requestContext,
        cartId: cart.id,
        eventName: AnalyticsEventName.VIEW_CART,
        subtotalAmount: cart.subtotalAmount,
        totalAmount: cart.totalAmount,
        payload: {
          itemCount: cart.itemCount,
          isGuestCart: !cart.userId,
        },
      });

      const refreshedCart = (await this.repository.findActiveCartById(cart.id, tx)) ?? cart;

      return {
        cart: refreshedCart,
        view: this.buildCartViewModel(refreshedCart),
      };
    });
  }

  async getCartPageModel(input: {
    existingCartId?: string | null;
    sessionId?: string;
    userId?: string | null;
    requestContext: CartRequestContext;
  }): Promise<{ cart: ActiveCartRecord; page: CartPageModel }> {
    const { cart, view } = await this.getCartView(input);

    return {
      cart,
      page: {
        title: "Giỏ hàng",
        description:
          "Quản lý giỏ hàng, cập nhật số lượng, xóa sản phẩm và xem tổng tiền được tính ở phía máy chủ.",
        pageHeading: "Giỏ hàng của bạn",
        pageLead:
          "Giá, phí giao hàng và tổng tiền đều được tính lại trên máy chủ mỗi khi giỏ hàng thay đổi.",
        cart: view,
        continueShoppingHref: "/books",
        checkoutHref: "/checkout",
        analytics: {
          context: {
            pageType: "cart",
            cartId: cart.id,
            itemCount: cart.itemCount,
          },
          events: [
            {
              eventName: ANALYTICS_EVENTS.VIEW_CART,
              payload: {
                cartId: cart.id,
                itemCount: cart.itemCount,
                totalAmount: cart.totalAmount,
              },
            },
          ],
        },
      },
    };
  }

  async addItem(
    input: {
      existingCartId?: string | null;
      sessionId?: string;
      userId?: string | null;
      payload: ParsedCartItemMutationInput;
      requestContext: CartRequestContext;
    },
  ): Promise<{ cart: ActiveCartRecord; warnings: CartWarning[] }> {
    return withDbTransaction(async (tx) => {
      const quantity = validateRequestedQuantity(input.payload.quantity);
      const cart = await this.ensureCartIdentity(tx, {
        existingCartId: input.existingCartId,
        sessionId: input.sessionId,
        userId: input.userId,
      });

      const book = await this.repository.findBookForCart(input.payload.bookId, tx);

      if (!book || book.publishStatus !== PublishStatus.PUBLISHED) {
        throw new AppError({
          statusCode: 404,
          code: "BOOK_NOT_FOUND",
          message: "Kh?ng t?m th?y s?ch h?p l? ?? th?m v?o gi? h?ng.",
        });
      }

      if (!isBookPurchasable(book)) {
        throw new AppError({
          statusCode: 409,
          code: "BOOK_UNAVAILABLE",
          message: "S?ch hi?n kh?ng c?n c? th? mua.",
        });
      }

      const currentLines = cart.items.map(toCartLinePricingInput);
      const currentLineIndex = currentLines.findIndex((item) => item.bookId === book.id);

      if (currentLineIndex >= 0) {
        currentLines[currentLineIndex] = {
          ...currentLines[currentLineIndex],
          quantity: currentLines[currentLineIndex].quantity + quantity,
        };
      } else {
        currentLines.push({
          bookId: book.id,
          title: book.title,
          slug: book.slug,
          authorName: book.author.name,
          coverImageUrl: book.coverImageUrl,
          quantity,
          unitPriceAmount: book.priceAmount,
          compareAtAmount: book.compareAtAmount,
          shippingFeeAmount: book.shippingFeeAmount,
          inventoryQuantity: book.inventoryQuantity,
          availabilityStatus: book.availabilityStatus,
        });
      }

      const merged = mergeCartSnapshots({
        baseItems: [],
        incomingItems: currentLines,
      });

      const refreshedCart = await this.persistRecalculatedCart(tx, cart.id, merged.items);

      await this.trackCartEvent(tx, {
        ...input.requestContext,
        cartId: refreshedCart.id,
        eventName: AnalyticsEventName.ADD_TO_CART,
        quantity,
        bookId: book.id,
        subtotalAmount: refreshedCart.subtotalAmount,
        totalAmount: refreshedCart.totalAmount,
        payload: {
          bookId: book.id,
          bookSlug: book.slug,
          title: book.title,
          quantity,
          warnings: merged.warnings.map((warning) => warning.code),
        },
      });

      return {
        cart: refreshedCart,
        warnings: merged.warnings,
      };
    });
  }

  async updateItemQuantity(
    input: {
      existingCartId?: string | null;
      sessionId?: string;
      userId?: string | null;
      payload: ParsedCartItemUpdateInput;
      requestContext: CartRequestContext;
    },
  ): Promise<{ cart: ActiveCartRecord; warnings: CartWarning[] }> {
    return withDbTransaction(async (tx) => {
      const cart = await this.ensureCartIdentity(tx, {
        existingCartId: input.existingCartId,
        sessionId: input.sessionId,
        userId: input.userId,
      });

      const item = await this.repository.findCartItemById(cart.id, input.payload.itemId, tx);

      if (!item) {
        throw new AppError({
          statusCode: 404,
          code: "CART_ITEM_NOT_FOUND",
          message: "Kh?ng t?m th?y s?n ph?m c?n c?p nh?t trong gi? h?ng.",
        });
      }

      const quantity = validateRequestedQuantity(input.payload.quantity);
      const lines = cart.items.map((cartItem) => {
        const line = toCartLinePricingInput(cartItem);
        return cartItem.id === item.id ? { ...line, quantity } : line;
      });

      const merged = mergeCartSnapshots({
        baseItems: [],
        incomingItems: lines,
      });
      const refreshedCart = await this.persistRecalculatedCart(tx, cart.id, merged.items);

      await this.trackCartEvent(tx, {
        ...input.requestContext,
        cartId: refreshedCart.id,
        eventName: AnalyticsEventName.UPDATE_CART_QUANTITY,
        quantity,
        bookId: item.bookId,
        subtotalAmount: refreshedCart.subtotalAmount,
        totalAmount: refreshedCart.totalAmount,
        payload: {
          cartItemId: item.id,
          bookId: item.bookId,
          bookSlug: item.book.slug,
          title: item.book.title,
          quantity,
          warnings: merged.warnings.map((warning) => warning.code),
        },
      });

      return {
        cart: refreshedCart,
        warnings: merged.warnings,
      };
    });
  }

  async removeItem(
    input: {
      existingCartId?: string | null;
      sessionId?: string;
      userId?: string | null;
      itemId: string;
      requestContext: CartRequestContext;
    },
  ): Promise<ActiveCartRecord> {
    return withDbTransaction(async (tx) => {
      const cart = await this.ensureCartIdentity(tx, {
        existingCartId: input.existingCartId,
        sessionId: input.sessionId,
        userId: input.userId,
      });

      const item = await this.repository.findCartItemById(cart.id, input.itemId, tx);

      if (!item) {
        throw new AppError({
          statusCode: 404,
          code: "CART_ITEM_NOT_FOUND",
          message: "Kh?ng t?m th?y s?n ph?m c?n x?a trong gi? h?ng.",
        });
      }

      await this.repository.deleteCartItem(cart.id, item.id, tx);

      const remainingLines = cart.items
        .filter((cartItem) => cartItem.id !== item.id)
        .map(toCartLinePricingInput);
      const refreshedCart = await this.persistRecalculatedCart(tx, cart.id, remainingLines);

      await this.trackCartEvent(tx, {
        ...input.requestContext,
        cartId: refreshedCart.id,
        eventName: AnalyticsEventName.REMOVE_FROM_CART,
        quantity: item.quantity,
        bookId: item.bookId,
        subtotalAmount: refreshedCart.subtotalAmount,
        totalAmount: refreshedCart.totalAmount,
        payload: {
          cartItemId: item.id,
          bookId: item.bookId,
          bookSlug: item.book.slug,
          title: item.book.title,
          quantity: item.quantity,
        },
      });

      return refreshedCart;
    });
  }

  async recalculate(
    input: {
      existingCartId?: string | null;
      sessionId?: string;
      userId?: string | null;
      requestContext: CartRequestContext;
    },
  ): Promise<{ cart: ActiveCartRecord; warnings: CartWarning[] }> {
    return withDbTransaction(async (tx) => {
      const cart = await this.ensureCartIdentity(tx, {
        existingCartId: input.existingCartId,
        sessionId: input.sessionId,
        userId: input.userId,
      });

      const merged = mergeCartSnapshots({
        baseItems: [],
        incomingItems: cart.items.map(toCartLinePricingInput),
      });
      const refreshedCart = await this.persistRecalculatedCart(tx, cart.id, merged.items);

      return {
        cart: refreshedCart,
        warnings: merged.warnings,
      };
    });
  }

  async mergeCarts(input: {
    existingCartId?: string | null;
    sessionId?: string;
    userId: string;
    sourceCartId?: string;
    requestContext: CartRequestContext;
  }): Promise<{ cart: ActiveCartRecord; warnings: CartWarning[] }> {
    return withDbTransaction(async (tx) => {
      const targetCart = await this.ensureCartIdentity(tx, {
        existingCartId: input.existingCartId,
        sessionId: input.sessionId,
        userId: input.userId,
      });

      const sourceCart =
        input.sourceCartId && input.sourceCartId !== targetCart.id
          ? await this.repository.findActiveCartById(input.sourceCartId, tx)
          : input.sessionId
            ? await this.repository.findActiveCartBySessionId(input.sessionId, tx)
            : null;

      if (!sourceCart || sourceCart.id === targetCart.id) {
        const refreshedCart =
          (await this.repository.findActiveCartById(targetCart.id, tx)) ?? targetCart;

        return {
          cart: refreshedCart,
          warnings: [],
        };
      }

      const merged = mergeCartSnapshots({
        baseItems: targetCart.items.map(toCartLinePricingInput),
        incomingItems: sourceCart.items.map(toCartLinePricingInput),
      });

      const refreshedCart = await this.persistRecalculatedCart(tx, targetCart.id, merged.items);
      await this.repository.assignCartIdentity(
        refreshedCart.id,
        {
          userId: input.userId,
          sessionId: input.sessionId,
        },
        tx,
      );
      await this.repository.deactivateCart(sourceCart.id, tx);

      return {
        cart: (await this.repository.findActiveCartById(refreshedCart.id, tx)) ?? refreshedCart,
        warnings: merged.warnings,
      };
    });
  }
}
