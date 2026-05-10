import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { cancelOrder, getOrder } from "../lib/api";
import type { OrderViewModel } from "../types/api";
import { ErrorState, FooteredLayout, LoadingState, Toast } from "./components";
import { BreadcrumbHero } from "./components-shared";

function formatPaymentStatusLabel(status: OrderViewModel["paymentStatus"]) {
  switch (status) {
    case "AWAITING_VERIFICATION":
      return "Awaiting verification";
    case "PENDING":
      return "Pending";
    case "PAID":
      return "Paid";
    case "FAILED":
      return "Failed";
    default:
      return status;
  }
}

function useOrderToast() {
  const [toast, setToast] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setToast(null);
    }, 2800);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [toast]);

  return { toast, setToast };
}

function useOrderData() {
  const { orderNumber = "" } = useParams();
  const [order, setOrder] = useState<OrderViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadOrder() {
      setLoading(true);
      setError(null);

      try {
        const data = await getOrder(orderNumber, controller.signal);
        if (!active) {
          return;
        }
        setOrder(data);
      } catch (loadError) {
        if (!active) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "Không thể tải đơn hàng.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    if (orderNumber) {
      void loadOrder();
    } else {
      setError("Order number is missing.");
      setLoading(false);
    }

    return () => {
      active = false;
      controller.abort();
    };
  }, [orderNumber]);

  return { orderNumber, order, setOrder, loading, error };
}

function OrderAddressBlock({ order }: { order: OrderViewModel }) {
  return (
    <section className="order-card">
      <div className="order-card__header">
        <span className="checkout-card__eyebrow">Delivery</span>
        <h2>Shipping address</h2>
      </div>
      <div className="order-kv">
        <div className="order-kv__row">
          <span>Recipient</span>
          <strong>{order.address.recipientName}</strong>
        </div>
        <div className="order-kv__row">
          <span>Phone</span>
          <strong>{order.address.phoneNumber}</strong>
        </div>
        <div className="order-kv__row">
          <span>Address</span>
          <strong>{order.address.addressLine1}</strong>
        </div>
        <div className="order-kv__row">
          <span>Area</span>
          <strong>{[order.address.ward, order.address.district, order.address.province].filter(Boolean).join(", ")}</strong>
        </div>
        {order.address.note ? (
          <div className="order-kv__row">
            <span>Note</span>
            <strong>{order.address.note}</strong>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function OrderItemsBlock({ order }: { order: OrderViewModel }) {
  return (
    <section className="order-card">
      <div className="order-card__header">
        <span className="checkout-card__eyebrow">Items</span>
        <h2>Order items</h2>
      </div>
      <div className="order-items">
        {order.items.map((item) => (
          <article className="order-item" key={item.id}>
            <img src={item.coverImageUrl ?? "/images/books/1.jpg"} alt={item.bookTitle} loading="lazy" />
            <div className="order-item__copy">
              <strong>{item.bookTitle}</strong>
              <span>{item.authorName}</span>
              <span>{item.quantity} x {item.unitPrice.formatted}</span>
            </div>
            <div className="order-item__price">{item.lineSubtotal.formatted}</div>
          </article>
        ))}
      </div>
    </section>
  );
}

function OrderSidebar({
  order,
  canCancel,
  cancelling,
  onCancel,
  variant,
}: {
  order: OrderViewModel;
  canCancel: boolean;
  cancelling: boolean;
  onCancel: () => void;
  variant: "success" | "detail";
}) {
  return (
    <aside className="checkout-sidebar">
      <section className="checkout-sidebar__panel">
        <div className="checkout-sidebar__heading">
          <span className="checkout-card__eyebrow">{variant === "success" ? "Order placed" : "Order summary"}</span>
          <h2>{order.orderNumber}</h2>
          <p>
            {variant === "success"
              ? "Đơn hàng đã được tạo thành công."
              : "Thông tin trạng thái, thanh toán và tổng đơn được đồng bộ từ hệ thống."}
          </p>
        </div>

        <div className="checkout-summary">
          <div className="checkout-summary__meta">
            <span className="checkout-summary__pill active">{order.status}</span>
            <span className={`checkout-summary__pill checkout-summary__pill--payment checkout-summary__pill--${order.paymentStatus.toLowerCase()}`}>
              {formatPaymentStatusLabel(order.paymentStatus)}
            </span>
          </div>
          <div className="checkout-summary__row">
            <span>Customer</span>
            <strong>{order.customerFullName}</strong>
          </div>
          <div className="checkout-summary__row">
            <span>Placed at</span>
            <strong>{order.placedAtLabel}</strong>
          </div>
          <div className="checkout-summary__row">
            <span>Payment method</span>
            <strong>{order.paymentMethod}</strong>
          </div>
          <div className="checkout-summary__row checkout-summary__row--total">
            <span>Total</span>
            <strong>{order.summary.total.formatted}</strong>
          </div>
        </div>

        {order.bankTransferInstruction ? (
          <div className="checkout-context order-bank-info">
            <div className="checkout-context__row">
              <span>Bank</span>
              <strong>{order.bankTransferInstruction.bankName}</strong>
            </div>
            <div className="checkout-context__row">
              <span>Account number</span>
              <strong>{order.bankTransferInstruction.accountNumber}</strong>
            </div>
            <div className="checkout-context__row">
              <span>Account name</span>
              <strong>{order.bankTransferInstruction.accountName}</strong>
            </div>
            <div className="checkout-context__row">
              <span>Transfer note</span>
              <strong>{order.bankTransferInstruction.transferNote}</strong>
            </div>
          </div>
        ) : null}

        <div className="checkout-sidebar__footer">
          <Link className="button-primary checkout-button checkout-button--place-order" to="/books">
            Continue shopping
          </Link>
          {canCancel ? (
            <button className="button-outline checkout-button" type="button" disabled={cancelling} onClick={onCancel}>
              {cancelling ? "Cancelling..." : "Cancel order"}
            </button>
          ) : null}
        </div>
      </section>
    </aside>
  );
}

function OrderLayout({
  order,
  children,
  eyebrow,
  title,
  lead,
  variant,
  allowCancel,
  onCancel,
  cancelling,
}: {
  order: OrderViewModel;
  children: React.ReactNode;
  eyebrow: string;
  title: string;
  lead: string;
  variant: "success" | "detail";
  allowCancel: boolean;
  onCancel: () => void;
  cancelling: boolean;
}) {
  return (
    <FooteredLayout>
      <BreadcrumbHero
        eyebrow={eyebrow}
        title={title}
        lead={lead}
        breadcrumb={[
          { label: "Trang chu", href: "/" },
          { label: "Orders", href: `/orders/${order.orderNumber}` },
          { label: order.orderNumber, active: true },
        ]}
      />

      <section className="page-section">
        <div className="container checkout-layout">
          <div className="checkout-flow">{children}</div>
          <OrderSidebar
            order={order}
            canCancel={allowCancel}
            cancelling={cancelling}
            onCancel={onCancel}
            variant={variant}
          />
        </div>
      </section>
    </FooteredLayout>
  );
}

export function OrderSuccessPage() {
  const { order, loading, error } = useOrderData();

  if (loading) {
    return <LoadingState />;
  }

  if (error || !order) {
    return <ErrorState title="Không thể tải đơn hàng" message={error ?? "Không tìm thấy đơn hàng."} />;
  }

  return (
    <OrderLayout
      order={order}
      eyebrow="Order success"
      title="Order placed successfully"
      lead="Bạn đã hoàn tất đặt hàng."
      variant="success"
      allowCancel={false}
      onCancel={() => undefined}
      cancelling={false}
    >
      <section className="order-card order-card--hero">
        <div className="order-card__header">
          <span className="checkout-card__eyebrow">Success</span>
          <h2>Your order is confirmed</h2>
          <p>
            {order.paymentMethod === "BANK_TRANSFER"
              ? "Đơn hàng được xử lý theo quy trình xác nhận trực tuyến."
              : "Đơn hàng sẽ được xử lý theo quy trình giao hàng và thanh toán khi nhận."}
          </p>
        </div>
      </section>

      <OrderItemsBlock order={order} />
      <OrderAddressBlock order={order} />
    </OrderLayout>
  );
}

export function OrderDetailPage() {
  const { order, setOrder, loading, error } = useOrderData();
  const { toast, setToast } = useOrderToast();
  const [cancelling, setCancelling] = useState(false);

  if (loading) {
    return <LoadingState />;
  }

  if (error || !order) {
    return <ErrorState title="Không thể tải chi tiết đơn" message={error ?? "Không tìm thấy đơn hàng."} />;
  }

  const handleCancel = async () => {
    const confirmed = window.confirm(`Cancel order ${order.orderNumber}?`);
    if (!confirmed) {
      return;
    }

    try {
      setCancelling(true);
      const nextOrder = await cancelOrder(order.orderNumber, "Cancelled from storefront FE");
      setOrder(nextOrder);
      setToast({
        kind: "success",
        message: `Đã huỷ đơn ${nextOrder.orderNumber}.`,
      });
    } catch (cancelError) {
      setToast({
        kind: "error",
        message: cancelError instanceof Error ? cancelError.message : "Không thể huỷ đơn lúc này.",
      });
    } finally {
      setCancelling(false);
    }
  };

  return (
    <>
      <OrderLayout
        order={order}
        eyebrow="Order detail"
        title={`Order ${order.orderNumber}`}
        lead="Theo dõi thông tin giao hàng, thanh toán và trạng thái đơn hàng."
        variant="detail"
        allowCancel={order.canCancel}
        onCancel={() => void handleCancel()}
        cancelling={cancelling}
      >
        <OrderItemsBlock order={order} />
        <OrderAddressBlock order={order} />
      </OrderLayout>

      {toast ? <Toast kind={toast.kind} message={toast.message} /> : null}
    </>
  );
}
