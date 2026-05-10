import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  addToCart,
  getCart,
  removeCartItem,
  updateCartItemQuantity,
} from "../lib/api";
import type { CartViewModel } from "../types/api";

type CartStatus = "idle" | "loading" | "ready" | "error";

type CartMutationState =
  | {
      type: "idle";
    }
  | {
      type: "add";
      bookId: string;
    }
  | {
      type: "quantity";
      itemId: string;
    }
  | {
      type: "remove";
      itemId: string;
    };

interface CartContextValue {
  cart: CartViewModel | null;
  itemCount: number;
  status: CartStatus;
  mutation: CartMutationState;
  errorMessage: string | null;
  refreshCart: () => Promise<CartViewModel | null>;
  addItem: (bookId: string, quantity: number) => Promise<CartViewModel>;
  updateQuantity: (itemId: string, quantity: number) => Promise<CartViewModel>;
  removeItem: (itemId: string) => Promise<CartViewModel>;
}

const CartContext = createContext<CartContextValue | null>(null);

function toMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartViewModel | null>(null);
  const [status, setStatus] = useState<CartStatus>("loading");
  const [mutation, setMutation] = useState<CartMutationState>({ type: "idle" });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const applyCart = (nextCart: CartViewModel | null) => {
    if (!mountedRef.current) {
      return nextCart;
    }

    setCart(nextCart);
    setStatus("ready");
    setErrorMessage(null);
    return nextCart;
  };

  const refreshCart = async () => {
    try {
      if (mountedRef.current) {
        setStatus((current) => (current === "ready" ? current : "loading"));
      }

      return applyCart(await getCart());
    } catch (error) {
      if (mountedRef.current) {
        setStatus("error");
        setErrorMessage(toMessage(error, "Không thể tải giỏ hàng hiện tại."));
      }
      return null;
    }
  };

  useEffect(() => {
    void refreshCart();
  }, []);

  const runMutation = async <T extends CartViewModel>(
    nextMutation: CartMutationState,
    action: () => Promise<T>,
    fallbackMessage: string,
  ) => {
    if (mountedRef.current) {
      setMutation(nextMutation);
      setErrorMessage(null);
    }

    try {
      const nextCart = await action();
      applyCart(nextCart);
      return nextCart;
    } catch (error) {
      if (mountedRef.current) {
        setErrorMessage(toMessage(error, fallbackMessage));
      }
      throw error;
    } finally {
      if (mountedRef.current) {
        setMutation({ type: "idle" });
      }
    }
  };

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      itemCount: cart?.itemCount ?? 0,
      status,
      mutation,
      errorMessage,
      refreshCart,
      addItem: (bookId, quantity) =>
        runMutation({ type: "add", bookId }, () => addToCart(bookId, quantity), "Không thể thêm danh sách vào giỏ hàng"),
      updateQuantity: (itemId, quantity) =>
        runMutation(
          { type: "quantity", itemId },
          () => updateCartItemQuantity(itemId, quantity),
          "Không thể cập nhật số lượng sản phẩm trong giỏ hàng",
        ),
      removeItem: (itemId) =>
        runMutation(
          { type: "remove", itemId },
          () => removeCartItem(itemId),
          "Không thể xoá sản phẩm khỏi giỏ hàng.",
        ),
    }),
    [cart, errorMessage, mutation, status],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used within CartProvider.");
  }

  return context;
}
