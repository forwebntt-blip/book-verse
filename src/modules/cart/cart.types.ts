import type { AvailabilityStatus, MoneyDto } from "../../shared/contracts";

export interface ParsedCartItemMutationInput {
  bookId: string;
  quantity: number;
}

export interface ParsedCartItemUpdateInput {
  itemId: string;
  quantity: number;
}

export interface ParsedCartMergeInput {
  sourceCartId?: string;
}

export interface CartRequestContext {
  requestId: string;
  sessionId?: string;
  userId?: string | null;
}

export interface CartLineViewModel {
  id: string;
  bookId: string;
  title: string;
  slug: string;
  detailHref: string;
  authorName: string;
  coverImageUrl?: string | null;
  availabilityStatus: AvailabilityStatus;
  availabilityLabel: string;
  inventoryQuantity: number;
  quantity: number;
  maxQuantity: number;
  unitPrice: MoneyDto;
  compareAt?: MoneyDto | null;
  shippingFee: MoneyDto;
  lineSubtotal: MoneyDto;
  lineTotal: MoneyDto;
  canPurchase: boolean;
  warning?: string;
}

export interface CartWarningViewModel {
  code: string;
  message: string;
  tone: "warning" | "danger";
}

export interface CartSummaryViewModel {
  itemCount: number;
  subtotal: MoneyDto;
  shippingFee: MoneyDto;
  total: MoneyDto;
}

export interface CartViewModel {
  id: string;
  currency: "VND";
  itemCount: number;
  isEmpty: boolean;
  isGuestCart: boolean;
  items: CartLineViewModel[];
  summary: CartSummaryViewModel;
  warnings: CartWarningViewModel[];
}

export interface CartPageModel {
  title: string;
  description: string;
  pageHeading: string;
  pageLead: string;
  cart: CartViewModel;
  continueShoppingHref: string;
  checkoutHref: string;
  analytics: {
    context: Record<string, unknown>;
    events: Array<{
      eventName: string;
      payload?: Record<string, unknown>;
    }>;
  };
}
