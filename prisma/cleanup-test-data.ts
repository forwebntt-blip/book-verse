import { disconnectPrisma, getPrismaClient } from "../src/infra/database/prisma";

const TEST_ORDER_CUSTOMER_NAMES = [
  "Guest COD User",
  "Guest Bank Transfer User",
  "Logged In COD User",
  "Idempotency Test",
] as const;

function unique(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

async function main() {
  const prisma = await getPrismaClient();

  const tempUsers = await prisma.user.findMany({
    where: {
      email: {
        startsWith: "reader-",
      },
    },
    select: {
      id: true,
      email: true,
    },
  });
  const tempUserIds = tempUsers.map((item) => item.id);

  const smokeAuthors = await prisma.author.findMany({
    where: {
      slug: {
        startsWith: "tac-gia-smoke-part-8",
      },
    },
    select: {
      id: true,
      slug: true,
    },
  });
  const smokeAuthorIds = smokeAuthors.map((item) => item.id);

  const smokeBooks = await prisma.book.findMany({
    where: {
      OR: [
        {
          slug: {
            startsWith: "smoke-test-book-part-8",
          },
        },
        {
          slug: {
            startsWith: "staged-smoke-book-part-8",
          },
        },
      ],
    },
    select: {
      id: true,
      slug: true,
    },
  });
  const smokeBookIds = smokeBooks.map((item) => item.id);

  const smokeImportJobs = await prisma.contentImportJob.findMany({
    where: {
      OR: [
        {
          source: "smoke-test",
        },
        {
          sourceReference: "part8-smoke",
        },
      ],
    },
    select: {
      id: true,
    },
  });
  const smokeImportJobIds = smokeImportJobs.map((item) => item.id);

  const smokeStagedBooks = await prisma.stagedBook.findMany({
    where: {
      OR: [
        {
          sourceRecordId: {
            startsWith: "part8-staged-",
          },
        },
        {
          title: {
            startsWith: "Staged Smoke Book Part 8",
          },
        },
        {
          importJobId: {
            in: smokeImportJobIds,
          },
        },
      ],
    },
    select: {
      id: true,
      mappedBookId: true,
      importJobId: true,
    },
  });

  const smokeStagedBookIds = smokeStagedBooks.map((item) => item.id);
  const mappedSmokeBookIds = unique(smokeStagedBooks.map((item) => item.mappedBookId));
  const allSmokeBookIds = unique([...smokeBookIds, ...mappedSmokeBookIds]);

  const testOrders = await prisma.order.findMany({
    where: {
      customerFullName: {
        in: [...TEST_ORDER_CUSTOMER_NAMES],
      },
    },
    select: {
      id: true,
      sourceCartId: true,
      sessionId: true,
    },
  });
  const testOrderIds = testOrders.map((item) => item.id);

  const testCheckoutAttempts = await prisma.checkoutAttempt.findMany({
    where: {
      shippingFullName: {
        in: [...TEST_ORDER_CUSTOMER_NAMES],
      },
    },
    select: {
      id: true,
      cartId: true,
      sessionId: true,
      userId: true,
    },
  });
  const testCheckoutAttemptIds = testCheckoutAttempts.map((item) => item.id);

  const initialSessionIds = unique([
    ...testOrders.map((item) => item.sessionId),
    ...testCheckoutAttempts.map((item) => item.sessionId),
  ]);

  const initialCartIds = unique([
    ...testOrders.map((item) => item.sourceCartId),
    ...testCheckoutAttempts.map((item) => item.cartId),
  ]);

  const testCarts = await prisma.cart.findMany({
    where: {
      OR: [
        {
          id: {
            in: initialCartIds,
          },
        },
        {
          userId: {
            in: tempUserIds,
          },
        },
        {
          sessionId: {
            in: initialSessionIds,
          },
        },
      ],
    },
    select: {
      id: true,
      sessionId: true,
      userId: true,
    },
  });
  const testCartIds = testCarts.map((item) => item.id);
  const finalSessionIds = unique([
    ...initialSessionIds,
    ...testCarts.map((item) => item.sessionId),
  ]);

  await prisma.analyticsEventOutbox.deleteMany({
    where: {
      OR: [
        { sessionId: { in: finalSessionIds } },
        { cartId: { in: testCartIds } },
        { orderId: { in: testOrderIds } },
        { userId: { in: tempUserIds } },
      ],
    },
  });

  await prisma.factCheckoutEvent.deleteMany({
    where: {
      OR: [
        { sessionId: { in: finalSessionIds } },
        { checkoutAttemptId: { in: testCheckoutAttemptIds } },
        { orderId: { in: testOrderIds } },
        { userId: { in: tempUserIds } },
      ],
    },
  });

  await prisma.factCartEvent.deleteMany({
    where: {
      OR: [
        { sessionId: { in: finalSessionIds } },
        { cartId: { in: testCartIds } },
        { userId: { in: tempUserIds } },
      ],
    },
  });

  await prisma.factProductView.deleteMany({
    where: {
      OR: [
        { sessionId: { in: finalSessionIds } },
        { userId: { in: tempUserIds } },
      ],
    },
  });

  await prisma.factSearch.deleteMany({
    where: {
      OR: [
        { sessionId: { in: finalSessionIds } },
        { userId: { in: tempUserIds } },
      ],
    },
  });

  await prisma.factSession.deleteMany({
    where: {
      OR: [
        { sessionId: { in: finalSessionIds } },
        { userId: { in: tempUserIds } },
      ],
    },
  });

  await prisma.stagedBook.deleteMany({
    where: {
      OR: [
        { id: { in: smokeStagedBookIds } },
        { importJobId: { in: smokeImportJobIds } },
        { mappedBookId: { in: allSmokeBookIds } },
      ],
    },
  });

  await prisma.contentImportJob.deleteMany({
    where: {
      id: {
        in: smokeImportJobIds,
      },
    },
  });

  await prisma.order.deleteMany({
    where: {
      id: {
        in: testOrderIds,
      },
    },
  });

  await prisma.checkoutAttempt.deleteMany({
    where: {
      id: {
        in: testCheckoutAttemptIds,
      },
    },
  });

  await prisma.cartItem.deleteMany({
    where: {
      cartId: {
        in: testCartIds,
      },
    },
  });

  await prisma.cart.deleteMany({
    where: {
      id: {
        in: testCartIds,
      },
    },
  });

  await prisma.collectionItem.deleteMany({
    where: {
      bookId: {
        in: allSmokeBookIds,
      },
    },
  });

  await prisma.bookCategory.deleteMany({
    where: {
      bookId: {
        in: allSmokeBookIds,
      },
    },
  });

  await prisma.book.deleteMany({
    where: {
      id: {
        in: allSmokeBookIds,
      },
    },
  });

  await prisma.author.deleteMany({
    where: {
      id: {
        in: smokeAuthorIds,
      },
    },
  });

  await prisma.user.deleteMany({
    where: {
      id: {
        in: tempUserIds,
      },
    },
  });

  await prisma.session.deleteMany({
    where: {
      sid: {
        in: finalSessionIds,
      },
    },
  });

  console.log(
    JSON.stringify(
      {
        removed: {
          tempUsers: tempUserIds.length,
          smokeAuthors: smokeAuthorIds.length,
          smokeBooks: allSmokeBookIds.length,
          smokeStagedBooks: smokeStagedBookIds.length,
          smokeImportJobs: smokeImportJobIds.length,
          testOrders: testOrderIds.length,
          testCheckoutAttempts: testCheckoutAttemptIds.length,
          testCarts: testCartIds.length,
          sessions: finalSessionIds.length,
        },
      },
      null,
      2,
    ),
  );

  await disconnectPrisma();
}

main().catch(async (error) => {
  console.error(error);
  await disconnectPrisma();
  process.exitCode = 1;
});
