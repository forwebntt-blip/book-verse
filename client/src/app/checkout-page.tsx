import { useEffect, useMemo, useState } from "react";
import {
  placeOrder,
  saveCheckoutPaymentMethod,
  saveCheckoutShippingInfo,
  startCheckout,
} from "../lib/api";
import type { CheckoutAttemptViewModel } from "../types/api";
import { useCart } from "./cart-context";
import { ErrorState, FooteredLayout, LoadingState, Toast } from "./components";
import { BreadcrumbHero } from "./components-shared";

type CheckoutToast = { kind: "success" | "error"; message: string } | null;
type ShippingFieldName = keyof typeof initialShipping;

const initialShipping = {
  fullName: "",
  phoneNumber: "",
  addressLine1: "",
  ward: "",
  district: "",
  province: "",
  note: "",
};

function useCheckoutToast() {
  const [toast, setToast] = useState<CheckoutToast>(null);

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

function validateShippingFields(input: typeof initialShipping) {
  const errors: Partial<Record<ShippingFieldName, string>> = {};

  if (!input.fullName.trim()) {
    errors.fullName = "Please enter the recipient name.";
  }

  if (!input.phoneNumber.trim()) {
    errors.phoneNumber = "Please enter a phone number.";
  }

  if (!input.addressLine1.trim()) {
    errors.addressLine1 = "Please enter the street address.";
  }

  if (!input.ward.trim()) {
    errors.ward = "Please enter the ward.";
  }

  if (!input.district.trim()) {
    errors.district = "Please enter the district.";
  }

  if (!input.province.trim()) {
    errors.province = "Please enter the province.";
  }

  return errors;
}

export function CheckoutPage() {
  const { cart, refreshCart } = useCart();
  const { toast, setToast } = useCheckoutToast();
  const [checkout, setCheckout] = useState<CheckoutAttemptViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [shipping, setShipping] = useState(initialShipping);
  const [shippingErrors, setShippingErrors] = useState<Partial<Record<ShippingFieldName, string>>>({});
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"COD" | "BANK_TRANSFER">("COD");

  useEffect(() => {
    let active = true;

    async function loadCheckout() {
      setLoading(true);
      setPageError(null);

      try {
        const checkoutSummary = await startCheckout();

        if (!active) {
          return;
        }

        setCheckout(checkoutSummary);
        setShipping({
          fullName: checkoutSummary.shipping.fullName,
          phoneNumber: checkoutSummary.shipping.phoneNumber,
          addressLine1: checkoutSummary.shipping.addressLine1,
          ward: checkoutSummary.shipping.ward,
          district: checkoutSummary.shipping.district,
          province: checkoutSummary.shipping.province,
          note: checkoutSummary.shipping.note,
        });

        const defaultPayment =
          checkoutSummary.paymentMethod ??
          checkoutSummary.paymentOptions.find((option) => option.selected)?.code ??
          "COD";
        setSelectedPaymentMethod(defaultPayment);
      } catch (error) {
        if (!active) {
          return;
        }

        setPageError(error instanceof Error ? error.message : "Không thể tải dữ liệu checkout.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadCheckout();

    return () => {
      active = false;
    };
  }, []);

  const checkoutWarnings = useMemo(() => checkout?.warnings ?? [], [checkout]);
  const shippingReady = useMemo(
    () =>
      Boolean(
        shipping.fullName.trim() &&
          shipping.phoneNumber.trim() &&
          shipping.addressLine1.trim() &&
          shipping.ward.trim() &&
          shipping.district.trim() &&
          shipping.province.trim(),
      ),
    [shipping],
  );
  const paymentReady = useMemo(() => Boolean(selectedPaymentMethod), [selectedPaymentMethod]);

  if (loading) {
    return <LoadingState />;
  }

  if (pageError) {
    return <ErrorState title="Không thể bắt đầu checkout" message={pageError} />;
  }

  if (!checkout) {
    return <ErrorState title="Checkout chưa sẵn sàng" message="Không thể tìm thấy thông tin checkout hiện tại." />;
  }

  const handlePlaceOrder = async () => {
    const nextErrors = validateShippingFields(shipping);
    setShippingErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setToast({
        kind: "error",
        message: "Please complete the required shipping fields before placing the order.",
      });
      return;
    }

    try {
      setPlacingOrder(true);

      const shippingCheckout = await saveCheckoutShippingInfo({
        checkoutAttemptId: checkout.id,
        ...shipping,
      });
      setCheckout(shippingCheckout);

      const paymentCheckout = await saveCheckoutPaymentMethod({
        checkoutAttemptId: shippingCheckout.id,
        paymentMethod: selectedPaymentMethod,
      });
      setCheckout(paymentCheckout);

      const placedOrder = await placeOrder({
        checkoutAttemptId: paymentCheckout.id,
        idempotencyKey: paymentCheckout.placeOrderIdempotencyKey,
      });

      await refreshCart();
      window.location.assign(`/orders/${placedOrder.orderNumber}/success`);
    } catch (error) {
      setToast({
        kind: "error",
        message: error instanceof Error ? error.message : "Không thể tạo đơn lúc này.",
      });
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <>
      <FooteredLayout>
        <BreadcrumbHero
          eyebrow="Checkout"
          title="Checkout"
          lead="Điền thông tin, chọn phương thức thanh toán và xác nhận đơn."
          breadcrumb={[
            { label: "Trang chu", href: "/" },
            { label: "Checkout", active: true },
          ]}
        />

        <section className="page-section">
          <div className="container checkout-layout">
            <div className="checkout-flow">
              <section className="checkout-card checkout-card--flow">
                <div className="checkout-card__header">
                  <span className="checkout-card__eyebrow">Step 1</span>
                  <h2>Shipping details</h2>
                  <p>Hoàn tất thông tin người nhận và địa chỉ giao hàng trước khi đặt đơn.</p>
                </div>

                <form className="checkout-form" onSubmit={(event) => event.preventDefault()}>
                  <label className="checkout-field">
                    <span>Full name <em>*</em></span>
                    <input
                      className={shippingErrors.fullName ? "checkout-input--invalid" : undefined}
                      value={shipping.fullName}
                      onChange={(event) => {
                        const value = event.target.value;
                        setShipping((current) => ({ ...current, fullName: value }));
                        setShippingErrors((current) => ({ ...current, fullName: value.trim() ? undefined : current.fullName }));
                      }}
                      placeholder="Nguyễn Văn A"
                    />
                    {shippingErrors.fullName ? <small className="checkout-field__error">{shippingErrors.fullName}</small> : null}
                  </label>

                  <label className="checkout-field">
                    <span>Phone number <em>*</em></span>
                    <input
                      className={shippingErrors.phoneNumber ? "checkout-input--invalid" : undefined}
                      value={shipping.phoneNumber}
                      onChange={(event) => {
                        const value = event.target.value;
                        setShipping((current) => ({ ...current, phoneNumber: value }));
                        setShippingErrors((current) => ({ ...current, phoneNumber: value.trim() ? undefined : current.phoneNumber }));
                      }}
                      placeholder="0123456789"
                    />
                    {shippingErrors.phoneNumber ? <small className="checkout-field__error">{shippingErrors.phoneNumber}</small> : null}
                  </label>

                  <div className="checkout-section-label checkout-field--full">Delivery address</div>

                  <label className="checkout-field checkout-field--full">
                    <span>Address <em>*</em></span>
                    <input
                      className={shippingErrors.addressLine1 ? "checkout-input--invalid" : undefined}
                      value={shipping.addressLine1}
                      onChange={(event) => {
                        const value = event.target.value;
                        setShipping((current) => ({ ...current, addressLine1: value }));
                        setShippingErrors((current) => ({
                          ...current,
                          addressLine1: value.trim() ? undefined : current.addressLine1,
                        }));
                      }}
                      placeholder="Số nhà, tên đường"
                    />
                    {shippingErrors.addressLine1 ? <small className="checkout-field__error">{shippingErrors.addressLine1}</small> : null}
                  </label>

                  <label className="checkout-field">
                    <span>Ward <em>*</em></span>
                    <input
                      className={shippingErrors.ward ? "checkout-input--invalid" : undefined}
                      value={shipping.ward}
                      onChange={(event) => {
                        const value = event.target.value;
                        setShipping((current) => ({ ...current, ward: value }));
                        setShippingErrors((current) => ({ ...current, ward: value.trim() ? undefined : current.ward }));
                      }}
                      placeholder="Phường"
                    />
                    {shippingErrors.ward ? <small className="checkout-field__error">{shippingErrors.ward}</small> : null}
                  </label>

                  <label className="checkout-field">
                    <span>District <em>*</em></span>
                    <input
                      className={shippingErrors.district ? "checkout-input--invalid" : undefined}
                      value={shipping.district}
                      onChange={(event) => {
                        const value = event.target.value;
                        setShipping((current) => ({ ...current, district: value }));
                        setShippingErrors((current) => ({ ...current, district: value.trim() ? undefined : current.district }));
                      }}
                      placeholder="Quận/Huyện"
                    />
                    {shippingErrors.district ? <small className="checkout-field__error">{shippingErrors.district}</small> : null}
                  </label>

                  <label className="checkout-field">
                    <span>Province <em>*</em></span>
                    <input
                      className={shippingErrors.province ? "checkout-input--invalid" : undefined}
                      value={shipping.province}
                      onChange={(event) => {
                        const value = event.target.value;
                        setShipping((current) => ({ ...current, province: value }));
                        setShippingErrors((current) => ({ ...current, province: value.trim() ? undefined : current.province }));
                      }}
                      placeholder="Tỉnh/Thành phố"
                    />
                    {shippingErrors.province ? <small className="checkout-field__error">{shippingErrors.province}</small> : null}
                  </label>

                  <label className="checkout-field checkout-field--full">
                    <span>Note</span>
                    <textarea
                      value={shipping.note}
                      onChange={(event) => setShipping((current) => ({ ...current, note: event.target.value }))}
                      placeholder="Hướng dẫn giao hàng thêm nếu cần"
                      rows={4}
                    />
                  </label>
                </form>
              </section>

              <section className="checkout-card checkout-card--flow">
                <div className="checkout-card__header">
                  <span className="checkout-card__eyebrow">Step 2</span>
                  <h2>Payment method</h2>
                </div>

                <form className="checkout-payment" onSubmit={(event) => event.preventDefault()}>
                  <div className="checkout-payment__options">
                    {checkout.paymentOptions.map((option) => (
                      <label
                        className={`checkout-payment__option${selectedPaymentMethod === option.code ? " active" : ""}`}
                        key={option.code}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={option.code}
                          checked={selectedPaymentMethod === option.code}
                          onChange={() => setSelectedPaymentMethod(option.code)}
                        />
                        <div>
                          <strong>{option.label}</strong>
                          <span>{option.description}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </form>
              </section>
            </div>

            <aside className="checkout-sidebar">
              <section className="checkout-sidebar__panel">
                <div className="checkout-sidebar__heading">
                  <span className="checkout-card__eyebrow">Order summary</span>
                  <h2>{checkout.isGuestCheckout ? "Guest checkout" : "Checkout summary"}</h2>
                </div>

                {checkoutWarnings.length > 0 ? (
                  <div className="checkout-warning-list">
                    {checkoutWarnings.map((warning) => (
                      <div className={`checkout-warning checkout-warning--${warning.tone}`} key={`${warning.code}-${warning.message}`}>
                        {warning.message}
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="checkout-summary">
                  <div className="checkout-summary__row">
                    <span>Items</span>
                    <strong>{checkout.summary.itemCount}</strong>
                  </div>
                  <div className="checkout-summary__row">
                    <span>Subtotal</span>
                    <strong>{checkout.summary.subtotal.formatted}</strong>
                  </div>
                  <div className="checkout-summary__row">
                    <span>Shipping</span>
                    <strong>{checkout.summary.shippingFee.formatted}</strong>
                  </div>
                  <div className="checkout-summary__row checkout-summary__row--total">
                    <span>Total</span>
                    <strong>{checkout.summary.total.formatted}</strong>
                  </div>
                </div>

                <div className="checkout-context">
                  <div className="checkout-context__row">
                    <span>Recipient</span>
                    <strong>{shipping.fullName || "Chua co"}</strong>
                  </div>
                  <div className="checkout-context__row">
                    <span>Phone</span>
                    <strong>{shipping.phoneNumber || "Chua co"}</strong>
                  </div>
                  <div className="checkout-context__row">
                    <span>Payment</span>
                    <strong>
                      {checkout.paymentOptions.find((option) => option.code === selectedPaymentMethod)?.label ?? "Chua chon"}
                    </strong>
                  </div>
                </div>

                {cart?.items.length ? (
                  <div className="checkout-items-shell">
                    <div className="checkout-items">
                      {cart.items.map((item) => (
                        <article className="checkout-item" key={item.id}>
                          <img src={item.coverImageUrl ?? "/images/books/1.jpg"} alt={item.title} loading="lazy" />
                          <div className="checkout-item__copy">
                            <strong>{item.title}</strong>
                            <span>
                              {item.quantity} x {item.unitPrice.formatted}
                            </span>
                          </div>
                          <div className="checkout-item__price">{item.lineTotal.formatted}</div>
                        </article>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="checkout-sidebar__footer">
                  <button
                    className="button-primary checkout-button checkout-button--place-order"
                    type="button"
                    disabled={!shippingReady || !paymentReady || placingOrder}
                    onClick={() => void handlePlaceOrder()}
                  >
                    {placingOrder ? "Saving and placing..." : "Place order"}
                  </button>
                </div>
              </section>
            </aside>
          </div>
        </section>
      </FooteredLayout>

      {toast ? <Toast kind={toast.kind} message={toast.message} /> : null}
    </>
  );
}
