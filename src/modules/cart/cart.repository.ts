import type { Prisma } from "../../generated/prisma/client.js";
import { CurrencyCode } from "../../generated/prisma/enums.js";
import { getPrismaClient } from "../../infra/database/prisma";
import type { DbClient } from "../../shared/database/repository";

const ACTIVE_CART_SELECT = {
  id: true,
  userId: true,
  sessionId: true,
  currency: true,
  itemCount: true,
  subtotalAmount: true,
  shippingFeeAmount: true,
  totalAmount: true,
  isActive: true,
  lastActivityAt: true,
  createdAt: true,
  updatedAt: true,
  items: {
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      cartId: true,
      bookId: true,
      quantity: true,
      unitPriceAmount: true,
      compareAtAmount: true,
      shippingFeeAmount: true,
      lineSubtotalAmount: true,
      lineTotalAmount: true,
      currency: true,
      createdAt: true,
      updatedAt: true,
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
          author: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.CartSelect;

const CART_ITEM_SELECT = {
  id: true,
  cartId: true,
  bookId: true,
  quantity: true,
  unitPriceAmount: true,
  compareAtAmount: true,
  shippingFeeAmount: true,
  lineSubtotalAmount: true,
  lineTotalAmount: true,
  currency: true,
  createdAt: true,
  updatedAt: true,
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
      author: {
        select: {
          name: true,
        },
      },
    },
  },
} satisfies Prisma.CartItemSelect;

const CART_BOOK_SELECT = {
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
  author: {
    select: {
      name: true,
    },
  },
} satisfies Prisma.BookSelect;

export type ActiveCartRecord = Prisma.CartGetPayload<{
  select: typeof ACTIVE_CART_SELECT;
}>;

export type ActiveCartItemRecord = Prisma.CartItemGetPayload<{
  select: typeof CART_ITEM_SELECT;
}>;

export type CartBookRecord = Prisma.BookGetPayload<{
  select: typeof CART_BOOK_SELECT;
}>;

async function getDb(db?: DbClient) {
  return db ?? getPrismaClient();
}

export class CartRepository {
  async findActiveCartById(cartId: string, db?: DbClient): Promise<ActiveCartRecord | null> {
    const client = await getDb(db);

    return client.cart.findFirst({
      where: {
        id: cartId,
        isActive: true,
      },
      select: ACTIVE_CART_SELECT,
    });
  }

  async findActiveCartByUserId(userId: string, db?: DbClient): Promise<ActiveCartRecord | null> {
    const client = await getDb(db);

    return client.cart.findFirst({
      where: {
        userId,
        isActive: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: ACTIVE_CART_SELECT,
    });
  }

  async findActiveCartBySessionId(
    sessionId: string,
    db?: DbClient,
  ): Promise<ActiveCartRecord | null> {
    const client = await getDb(db);

    return client.cart.findFirst({
      where: {
        sessionId,
        isActive: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: ACTIVE_CART_SELECT,
    });
  }

  async findCartItemById(
    cartId: string,
    itemId: string,
    db?: DbClient,
  ): Promise<ActiveCartItemRecord | null> {
    const client = await getDb(db);

    return client.cartItem.findFirst({
      where: {
        id: itemId,
        cartId,
      },
      select: CART_ITEM_SELECT,
    });
  }

  async findBookForCart(bookId: string, db?: DbClient): Promise<CartBookRecord | null> {
    const client = await getDb(db);

    return client.book.findUnique({
      where: {
        id: bookId,
      },
      select: CART_BOOK_SELECT,
    });
  }

  async createCart(
    input: {
      userId?: string | null;
      sessionId?: string | null;
    },
    db?: DbClient,
  ): Promise<ActiveCartRecord> {
    const client = await getDb(db);

    return client.cart.create({
      data: {
        userId: input.userId ?? undefined,
        sessionId: input.sessionId ?? undefined,
        currency: CurrencyCode.VND,
        itemCount: 0,
        subtotalAmount: 0,
        shippingFeeAmount: 0,
        totalAmount: 0,
        isActive: true,
      },
      select: ACTIVE_CART_SELECT,
    });
  }

  async assignCartIdentity(
    cartId: string,
    input: {
      userId?: string | null;
      sessionId?: string | null;
    },
    db?: DbClient,
  ): Promise<void> {
    const client = await getDb(db);

    await client.cart.update({
      where: { id: cartId },
      data: {
        userId: typeof input.userId === "undefined" ? undefined : input.userId,
        sessionId: typeof input.sessionId === "undefined" ? undefined : input.sessionId,
        lastActivityAt: new Date(),
      },
    });
  }

  async touchCart(cartId: string, db?: DbClient): Promise<void> {
    const client = await getDb(db);

    await client.cart.update({
      where: { id: cartId },
      data: {
        lastActivityAt: new Date(),
      },
    });
  }

  async syncCartItems(
    cartId: string,
    items: Array<{
      bookId: string;
      quantity: number;
      unitPriceAmount: number;
      compareAtAmount: number | null;
      shippingFeeAmount: number;
      lineSubtotalAmount: number;
      lineTotalAmount: number;
    }>,
    db?: DbClient,
  ): Promise<void> {
    const client = await getDb(db);
    const existingItems = await client.cartItem.findMany({
      where: { cartId },
      select: {
        id: true,
        bookId: true,
      },
    });

    const nextBookIds = new Set(items.map((item) => item.bookId));
    const staleItemIds = existingItems
      .filter((item) => !nextBookIds.has(item.bookId))
      .map((item) => item.id);

    if (staleItemIds.length > 0) {
      await client.cartItem.deleteMany({
        where: {
          id: {
            in: staleItemIds,
          },
        },
      });
    }

    for (const item of items) {
      await client.cartItem.upsert({
        where: {
          cartId_bookId: {
            cartId,
            bookId: item.bookId,
          },
        },
        update: {
          quantity: item.quantity,
          unitPriceAmount: item.unitPriceAmount,
          compareAtAmount: item.compareAtAmount ?? undefined,
          shippingFeeAmount: item.shippingFeeAmount,
          lineSubtotalAmount: item.lineSubtotalAmount,
          lineTotalAmount: item.lineTotalAmount,
          currency: CurrencyCode.VND,
        },
        create: {
          cartId,
          bookId: item.bookId,
          quantity: item.quantity,
          unitPriceAmount: item.unitPriceAmount,
          compareAtAmount: item.compareAtAmount ?? undefined,
          shippingFeeAmount: item.shippingFeeAmount,
          lineSubtotalAmount: item.lineSubtotalAmount,
          lineTotalAmount: item.lineTotalAmount,
          currency: CurrencyCode.VND,
        },
      });
    }
  }

  async setCartTotals(
    cartId: string,
    input: {
      itemCount: number;
      subtotalAmount: number;
      shippingFeeAmount: number;
      totalAmount: number;
    },
    db?: DbClient,
  ): Promise<void> {
    const client = await getDb(db);

    await client.cart.update({
      where: { id: cartId },
      data: {
        itemCount: input.itemCount,
        subtotalAmount: input.subtotalAmount,
        shippingFeeAmount: input.shippingFeeAmount,
        totalAmount: input.totalAmount,
        lastActivityAt: new Date(),
      },
    });
  }

  async deleteCartItem(cartId: string, itemId: string, db?: DbClient): Promise<void> {
    const client = await getDb(db);

    await client.cartItem.deleteMany({
      where: {
        id: itemId,
        cartId,
      },
    });
  }

  async deactivateCart(cartId: string, db?: DbClient): Promise<void> {
    const client = await getDb(db);

    await client.cart.update({
      where: { id: cartId },
      data: {
        isActive: false,
      },
    });
  }
}
