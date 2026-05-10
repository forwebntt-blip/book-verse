import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { getAccountOrders } from "../lib/api";
import type { AccountOrderListItemViewModel } from "../types/api";
import { useAuth } from "./auth-context";
import { ErrorState, FooteredLayout, LoadingState, Toast } from "./components";
import { BreadcrumbHero, SectionHeader, StorefrontPageSection } from "./components-shared";

type AuthFormMode = "login" | "register";
type AuthToast = { kind: "success" | "error"; message: string } | null;

function useAuthToast() {
  const [toast, setToast] = useState<AuthToast>(null);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  return { toast, setToast };
}

function validateEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function validatePhone(value: string) {
  return /^\d{9,15}$/.test(value.trim());
}

function validatePassword(value: string) {
  return value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);
}

function AuthFormPage({ mode }: { mode: AuthFormMode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, loginUser, registerUser } = useAuth();
  const { toast, setToast } = useAuthToast();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    phoneNumber: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const returnTo = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("returnTo") ?? "/account";
  }, [location.search]);

  if (isAuthenticated) {
    return <Navigate to={returnTo} replace />;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: Record<string, string> = {};

    if (mode === "register" && !form.fullName.trim()) {
      nextErrors.fullName = "Please enter your full name.";
    }

    if (mode === "register" && form.phoneNumber.trim() && !validatePhone(form.phoneNumber)) {
      nextErrors.phoneNumber = "Phone number must be 9-15 digits.";
    }

    if (!validateEmail(form.email)) {
      nextErrors.email = "Please enter a valid email address.";
    }

    if (!validatePassword(form.password)) {
      nextErrors.password = "Password must be at least 8 characters and include a letter and a number.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setToast({
        kind: "error",
        message: "Please review the highlighted fields before continuing.",
      });
      return;
    }

    try {
      setSubmitting(true);
      let authenticatedUser;

      if (mode === "login") {
        authenticatedUser = await loginUser({
          email: form.email,
          password: form.password,
          returnTo,
        });
      } else {
        authenticatedUser = await registerUser({
          email: form.email,
          fullName: form.fullName,
          password: form.password,
          phoneNumber: form.phoneNumber || undefined,
          returnTo,
        });
      }

      navigate(authenticatedUser.role === "ADMIN" ? "/admin" : returnTo, { replace: true });
    } catch (error) {
      setToast({
        kind: "error",
        message: error instanceof Error ? error.message : "Không thể xử lý yêu cầu xác thực.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <FooteredLayout>
        <StorefrontPageSection>
          <div className="auth-center">
            <section className="auth-form-card">
              <SectionHeader
                eyebrow={mode === "login" ? "Existing customer" : "New customer"}
                title={mode === "login" ? "Welcome back" : "Create account"}
              />

              <p className="auth-form-card__lead">
                {mode === "login"
                  ? "Use the same account to continue your current storefront session."
                  : "A few details are enough to create your storefront account."}
              </p>

              <form className="auth-form" onSubmit={handleSubmit}>
                {mode === "register" ? (
                  <>
                    <label className="auth-field">
                      <span>Full name <em>*</em></span>
                      <input
                        className={errors.fullName ? "auth-input--invalid" : undefined}
                        value={form.fullName}
                        onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                        placeholder="Nguyen Van A"
                      />
                      {errors.fullName ? <small className="auth-field__error">{errors.fullName}</small> : null}
                    </label>

                    <label className="auth-field">
                      <span>Phone number</span>
                      <input
                        className={errors.phoneNumber ? "auth-input--invalid" : undefined}
                        value={form.phoneNumber}
                        onChange={(event) => setForm((current) => ({ ...current, phoneNumber: event.target.value }))}
                        placeholder="090..."
                      />
                      {errors.phoneNumber ? <small className="auth-field__error">{errors.phoneNumber}</small> : null}
                    </label>
                  </>
                ) : null}

                <label className="auth-field auth-field--full">
                  <span>Email <em>*</em></span>
                  <input
                    className={errors.email ? "auth-input--invalid" : undefined}
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder="you@example.com"
                  />
                  {errors.email ? <small className="auth-field__error">{errors.email}</small> : null}
                </label>

                <label className="auth-field auth-field--full">
                  <span>Password <em>*</em></span>
                  <input
                    className={errors.password ? "auth-input--invalid" : undefined}
                    type="password"
                    value={form.password}
                    onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                    placeholder="Minimum 8 characters"
                  />
                  {errors.password ? <small className="auth-field__error">{errors.password}</small> : null}
                </label>

                <div className="auth-actions">
                  <button className="button-primary auth-submit" type="submit" disabled={submitting}>
                    {submitting
                      ? mode === "login"
                        ? "Signing in..."
                        : "Creating account..."
                      : mode === "login"
                        ? "Sign in"
                        : "Create account"}
                  </button>
                </div>
              </form>

              <div className="auth-switch-line">
                <span>{mode === "login" ? "Need an account?" : "Already registered?"}</span>
                {mode === "login" ? (
                  <Link className="auth-switch-line__link" to={`/register?returnTo=${encodeURIComponent(returnTo)}`}>
                    Create one
                  </Link>
                ) : (
                  <Link className="auth-switch-line__link" to={`/login?returnTo=${encodeURIComponent(returnTo)}`}>
                    Sign in
                  </Link>
                )}
              </div>
            </section>
          </div>
        </StorefrontPageSection>
      </FooteredLayout>

      {toast ? <Toast kind={toast.kind} message={toast.message} /> : null}
    </>
  );
}

export function LoginPage() {
  return <AuthFormPage mode="login" />;
}

export function RegisterPage() {
  return <AuthFormPage mode="register" />;
}

export function AccountPage() {
  const { isAuthenticated, status, updateProfile, user } = useAuth();
  const { toast, setToast } = useAuthToast();
  const [submitting, setSubmitting] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setFullName(user?.fullName ?? "");
    setPhoneNumber("");
  }, [user?.fullName]);

  if (status === "loading") {
    return <LoadingState />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login?returnTo=%2Faccount" replace />;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: Record<string, string> = {};

    if (!fullName.trim()) {
      nextErrors.fullName = "Please enter your full name.";
    }

    if (phoneNumber.trim() && !validatePhone(phoneNumber)) {
      nextErrors.phoneNumber = "Phone number must be 9-15 digits.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setToast({
        kind: "error",
        message: "Please review the highlighted fields before saving.",
      });
      return;
    }

    try {
      setSubmitting(true);
      await updateProfile({
        fullName,
        phoneNumber: phoneNumber || undefined,
      });
      setToast({
        kind: "success",
        message: "Profile updated successfully.",
      });
    } catch (error) {
      setToast({
        kind: "error",
        message: error instanceof Error ? error.message : "Không thể cập nhật profile lúc này.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <FooteredLayout>
        <BreadcrumbHero
          eyebrow="Account"
          title="Your account"
          lead="Theo dõi profile của bạn."
          breadcrumb={[
            { label: "Trang chu", href: "/" },
            { label: "Account", active: true },
          ]}
        />

        <StorefrontPageSection>
          <div className="account-layout">
            <section className="account-card">
              <SectionHeader eyebrow="Profile" title={user.fullName} />

              <form className="auth-form" onSubmit={handleSubmit}>
                <label className="auth-field">
                  <span>Full name <em>*</em></span>
                  <input
                    className={errors.fullName ? "auth-input--invalid" : undefined}
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Nguyen Van A"
                  />
                  {errors.fullName ? <small className="auth-field__error">{errors.fullName}</small> : null}
                </label>

                <label className="auth-field">
                  <span>Phone number</span>
                  <input
                    className={errors.phoneNumber ? "auth-input--invalid" : undefined}
                    value={phoneNumber}
                    onChange={(event) => setPhoneNumber(event.target.value)}
                    placeholder="090..."
                  />
                  {errors.phoneNumber ? <small className="auth-field__error">{errors.phoneNumber}</small> : null}
                </label>

                <label className="auth-field auth-field--full">
                  <span>Email</span>
                  <input value={user.email} disabled />
                </label>

                <label className="auth-field auth-field--full">
                  <span>Role</span>
                  <input value={user.role} disabled />
                </label>

                <div className="auth-actions">
                  <button className="button-primary auth-submit" type="submit" disabled={submitting}>
                    {submitting ? "Saving..." : "Save profile"}
                  </button>
                </div>
              </form>
            </section>

            <aside className="account-sidecard">
              <SectionHeader eyebrow="Orders" title="Go to your order history" />
              <Link className="button-primary account-sidecard__link" to="/account/orders">
                View my orders
              </Link>
            </aside>
          </div>
        </StorefrontPageSection>
      </FooteredLayout>

      {toast ? <Toast kind={toast.kind} message={toast.message} /> : null}
    </>
  );
}

export function AccountOrdersPage() {
  const { isAuthenticated, status } = useAuth();
  const [orders, setOrders] = useState<AccountOrderListItemViewModel[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadOrders() {
      try {
        setLoading(true);
        const response = await getAccountOrders();
        if (!active) {
          return;
        }
        setOrders(response.orders);
      } catch (loadError) {
        if (!active) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "Không thể tải danh sách order.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    if (isAuthenticated) {
      void loadOrders();
    }

    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  if (status === "loading") {
    return <LoadingState />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login?returnTo=%2Faccount%2Forders" replace />;
  }

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState title="Không thể tải order history" message={error} />;
  }

  return (
    <FooteredLayout>
      <BreadcrumbHero
        eyebrow="Account orders"
        title="Your orders"
        breadcrumb={[
          { label: "Trang chu", href: "/" },
          { label: "Account", href: "/account" },
          { label: "Orders", active: true },
        ]}
      />

      <StorefrontPageSection>
        {orders && orders.length > 0 ? (
          <div className="account-orders-list">
            {orders.map((order) => (
              <article className="account-order-card" key={order.orderNumber}>
                <div>
                  <strong>{order.orderNumber}</strong>
                  <p>{new Date(order.placedAt).toLocaleString("vi-VN")}</p>
                </div>
                <div className="account-order-card__meta">
                  <span>{order.status}</span>
                  <span>{order.paymentStatus}</span>
                  <strong>{order.total.formatted}</strong>
                </div>
                <Link className="button-outline account-order-card__link" to={`/orders/${order.orderNumber}`}>
                  View detail
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="listing-empty">
            <h2>No orders yet</h2>
            <p>Ban chua co don nao trong tai khoan nay.</p>
            <Link className="button-primary" to="/books">
              Start shopping
            </Link>
          </div>
        )}
      </StorefrontPageSection>
    </FooteredLayout>
  );
}

export function AccountOrderRedirectPage() {
  const { orderNumber = "" } = useParams();
  return <Navigate to={`/orders/${orderNumber}`} replace />;
}
