import { AVAILABILITY_STATUS, type AvailabilityStatus } from "../../shared/contracts";
import { assertVndIntegerAmount } from "../../shared/utils/money";

export interface CartLinePricingInput {
  bookId: string;
  title: string;
  slug: string;
  authorName: string;
  coverImageUrl: string | null;
  quantity: number;
  unitPriceAmount: number;
  compareAtAmount: number | null;
  shippingFeeAmount: number;
  inventoryQuantity: number;
  availabilityStatus: AvailabilityStatus;
}

export interface CartLinePricingResult extends CartLinePricingInput {
  lineSubtotalAmount: number;
  lineTotalAmount: number;
}

export interface CartWarning {
  code:
    | "ITEM_REMOVED_UNAVAILABLE"
    | "ITEM_NOT_PUBLISHED"
    | "QUANTITY_ADJUSTED_TO_STOCK";
  message: string;
  bookId?: string;
}

export interface CartTotalsResult {
  itemCount: number;
  subtotalAmount: number;
  shippingFeeAmount: number;
  totalAmount: number;
  items: CartLinePricingResult[];
}

function isBookPurchasable(line: Pick<CartLinePricingInput, "availabilityStatus" | "inventoryQuantity">) {
  return (
    line.availabilityStatus !== AVAILABILITY_STATUS.OUT_OF_STOCK &&
    Number.isInteger(line.inventoryQuantity) &&
    line.inventoryQuantity > 0
  );
}

export function validateRequestedQuantity(quantity: number): number {
  if (!Number.isInteger(quantity)) {
    throw new Error("Quantity must be an integer.");
  }

  if (quantity < 1) {
    throw new Error("Quantity must be at least 1.");
  }

  return quantity;
}

export function calculateCartTotals(lines: CartLinePricingInput[]): CartTotalsResult {
  const items = lines.map<CartLinePricingResult>((line) => {
    validateRequestedQuantity(line.quantity);
    assertVndIntegerAmount(line.unitPriceAmount);
    assertVndIntegerAmount(line.shippingFeeAmount);

    const lineSubtotalAmount = line.unitPriceAmount * line.quantity;
    const lineTotalAmount = lineSubtotalAmount;

    assertVndIntegerAmount(lineSubtotalAmount);
    assertVndIntegerAmount(lineTotalAmount);

    return {
      ...line,
      lineSubtotalAmount,
      lineTotalAmount,
    };
  });

  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const subtotalAmount = items.reduce((total, item) => total + item.lineSubtotalAmount, 0);
  const shippingFeeAmount = items.reduce(
    (currentMax, item) => Math.max(currentMax, item.shippingFeeAmount),
    0,
  );
  const totalAmount = subtotalAmount + shippingFeeAmount;

  assertVndIntegerAmount(subtotalAmount);
  assertVndIntegerAmount(shippingFeeAmount);
  assertVndIntegerAmount(totalAmount);

  return {
    itemCount,
    subtotalAmount,
    shippingFeeAmount,
    totalAmount,
    items,
  };
}

export function mergeCartSnapshots(params: {
  baseItems: CartLinePricingInput[];
  incomingItems: CartLinePricingInput[];
}): {
  items: CartLinePricingInput[];
  summary: CartTotalsResult;
  warnings: CartWarning[];
} {
  const mergedItems = new Map<string, CartLinePricingInput>();
  const warnings: CartWarning[] = [];

  for (const item of [...params.baseItems, ...params.incomingItems]) {
    const existing = mergedItems.get(item.bookId);

    if (!existing) {
      mergedItems.set(item.bookId, { ...item });
      continue;
    }

    mergedItems.set(item.bookId, {
      ...item,
      quantity: existing.quantity + item.quantity,
    });
  }

  const normalizedItems: CartLinePricingInput[] = [];

  for (const item of mergedItems.values()) {
    if (!isBookPurchasable(item)) {
      warnings.push({
        code: "ITEM_REMOVED_UNAVAILABLE",
        bookId: item.bookId,
        message: `${item.title} da duoc loai khoi gio vi hien khong con the mua.`,
      });
      continue;
    }

    const normalizedQuantity = Math.min(item.quantity, item.inventoryQuantity);

    if (normalizedQuantity < item.quantity) {
      warnings.push({
        code: "QUANTITY_ADJUSTED_TO_STOCK",
        bookId: item.bookId,
        message: `${item.title} chi con ${item.inventoryQuantity} ban hop le trong kho nen gio hang da duoc dieu chinh.`,
      });
    }

    normalizedItems.push({
      ...item,
      quantity: normalizedQuantity,
    });
  }

  return {
    items: normalizedItems,
    summary: calculateCartTotals(normalizedItems),
    warnings,
  };
}
