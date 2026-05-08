import type { Request, Response } from "express";
import type { MoneyDto } from "../contracts";
import { PAYMENT_METHOD } from "../contracts";
import type {
  AccountOrdersPageModel,
  AccountPageModel,
  AuthFormPageModel,
} from "../../modules/auth/auth.types";
import type {
  CheckoutPageModel,
  OrderDetailPageModel,
  OrderSuccessPageModel,
  OrderViewModel,
} from "../../modules/checkout/checkout.types";
import type { CartPageModel } from "../../modules/cart/cart.types";
import type { AdminCatalogPageModel, AdminDashboardPageModel } from "../../modules/admin/admin.types";

export interface BasePageModel {
  title: string;
  description?: string;
}

type ErrorPageModel = BasePageModel & {
  message?: string;
  statusCode?: number;
};

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatMoney(money?: MoneyDto | null): string {
  if (!money) {
    return "";
  }

  return money.formatted;
}

function formatFlash(
  flash:
    | {
        type: "success" | "danger" | "warning" | "info";
        message: string;
      }
    | null
    | undefined,
): string {
  if (!flash) {
    return "";
  }

  return `<div class="flash flash--${escapeHtml(flash.type)}">${escapeHtml(flash.message)}</div>`;
}

function layout(req: Request, res: Response, title: string, body: string, status = 200): void {
  const csrfToken = res.locals.csrfToken ?? "";
  const currentUser = res.locals.auth?.isAuthenticated
    ? `<div class="meta">Nguoi dung: ${escapeHtml(res.locals.auth?.userId ?? "authenticated")}</div>`
    : `<div class="meta">Khach chua dang nhap</div>`;

  res
    .status(status)
    .type("html")
    .send(`<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="csrf-token" content="${escapeHtml(csrfToken)}" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 0; background: #f6f7f9; color: #1f2937; }
      main { max-width: 1080px; margin: 0 auto; padding: 24px; }
      .card { background: #fff; border: 1px solid #d7dce5; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
      .grid { display: grid; gap: 16px; }
      .grid-2 { grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
      .flash { padding: 12px 14px; border-radius: 10px; margin-bottom: 16px; }
      .flash--success { background: #e8f7ee; color: #166534; }
      .flash--danger { background: #fdecec; color: #991b1b; }
      .flash--warning { background: #fff7e6; color: #92400e; }
      .flash--info { background: #eaf3ff; color: #1d4ed8; }
      h1, h2, h3 { margin-top: 0; }
      p, li, label, input, textarea, select, button, a, div, span { line-height: 1.5; }
      form { display: grid; gap: 12px; }
      input, textarea, select, button { font: inherit; padding: 10px 12px; border-radius: 8px; border: 1px solid #c8d0dc; }
      textarea { min-height: 96px; }
      button { cursor: pointer; background: #111827; color: #fff; border-color: #111827; }
      a { color: #1d4ed8; text-decoration: none; }
      a:hover { text-decoration: underline; }
      .meta { color: #6b7280; font-size: 14px; }
      .kv { display: grid; grid-template-columns: 180px 1fr; gap: 8px; }
      .list { display: grid; gap: 10px; }
      .muted { color: #6b7280; }
      .pill { display: inline-block; padding: 4px 8px; border-radius: 999px; background: #eef2ff; font-size: 12px; margin-right: 6px; }
      .actions { display: flex; gap: 12px; flex-wrap: wrap; }
      .header { margin-bottom: 20px; }
      .section-title { margin-bottom: 8px; }
      .form-help { font-size: 13px; color: #6b7280; }
    </style>
  </head>
  <body>
    <main>
      <div class="header">
        <h1>${escapeHtml(title)}</h1>
        ${currentUser}
        <div class="meta">Path: ${escapeHtml(req.originalUrl)}</div>
      </div>
      ${formatFlash(res.locals.flash)}
      ${body}
    </main>
  </body>
</html>`);
}

function renderSimplePage(model: BasePageModel): string {
  return `<section class="card">
    <h2>${escapeHtml(model.title)}</h2>
    <p>${escapeHtml(model.description ?? "Trang tam de tiep tuc hoan thien backend.")}</p>
  </section>`;
}

function renderAuthFormPage(model: AuthFormPageModel, csrfToken: string): string {
  const isRegister = model.formAction === "/register";
  const fields = isRegister
    ? `<label>Ho va ten<input name="fullName" required /></label>
       <label>So dien thoai<input name="phoneNumber" /></label>`
    : "";

  return `<section class="card">
    <h2>${escapeHtml(model.pageHeading)}</h2>
    <p>${escapeHtml(model.pageLead)}</p>
    <form method="post" action="${escapeHtml(model.formAction)}">
      <input type="hidden" name="_csrf" value="${escapeHtml(csrfToken)}" />
      <input type="hidden" name="returnTo" value="${escapeHtml(model.returnTo)}" />
      ${fields}
      <label>Email<input type="email" name="email" required /></label>
      <label>Mat khau<input type="password" name="password" required /></label>
      <button type="submit">${escapeHtml(model.submitLabel)}</button>
    </form>
    <p><a href="${escapeHtml(model.alternateHref)}">${escapeHtml(model.alternateLabel)}</a></p>
  </section>`;
}

function renderAccountPage(model: AccountPageModel): string {
  return `<section class="card">
    <h2>${escapeHtml(model.pageHeading)}</h2>
    <p>${escapeHtml(model.pageLead)}</p>
    <div class="kv"><strong>Ho ten</strong><span>${escapeHtml(model.profile.fullName)}</span></div>
    <div class="kv"><strong>Email</strong><span>${escapeHtml(model.profile.email)}</span></div>
    <div class="kv"><strong>So dien thoai</strong><span>${escapeHtml(model.profile.phoneNumber ?? "")}</span></div>
    <div class="kv"><strong>Vai tro</strong><span>${escapeHtml(model.profile.role)}</span></div>
    <div class="kv"><strong>Thanh vien tu</strong><span>${escapeHtml(model.profile.memberSinceLabel)}</span></div>
    <div class="kv"><strong>Dang nhap gan nhat</strong><span>${escapeHtml(model.profile.lastLoginAtLabel ?? "Chua co")}</span></div>
    <div class="actions">
      <a href="${escapeHtml(model.ordersHref)}">Xem lich su don hang</a>
      <span class="pill">${model.recentOrderCount} don hang</span>
    </div>
  </section>`;
}

function renderAccountOrdersPage(model: AccountOrdersPageModel): string {
  const rows =
    model.orders.length > 0
      ? model.orders
          .map(
            (order) => `<div class="card">
      <strong>${escapeHtml(order.orderNumber)}</strong>
      <div class="meta">${escapeHtml(order.placedAtLabel)}</div>
      <div>Trang thai: ${escapeHtml(order.status)} | Thanh toan: ${escapeHtml(order.paymentStatus)}</div>
      <div>Phuong thuc: ${escapeHtml(order.paymentMethod)} | So luong: ${order.itemCount}</div>
      <div>Tong tien: ${escapeHtml(order.total.formatted)}</div>
      <a href="${escapeHtml(order.detailHref)}">Xem chi tiet don hang</a>
    </div>`,
          )
          .join("")
      : `<div class="card muted">Chua co don hang nao.</div>`;

  return `<section>
    <div class="card">
      <h2>${escapeHtml(model.pageHeading)}</h2>
      <p>${escapeHtml(model.pageLead)}</p>
      <a href="${escapeHtml(model.profileHref)}">Quay lai tai khoan</a>
    </div>
    ${rows}
  </section>`;
}

function renderCartPage(model: CartPageModel, csrfToken: string): string {
  const items =
    model.cart.items.length > 0
      ? model.cart.items
          .map(
            (item) => `<div class="card">
      <strong>${escapeHtml(item.title)}</strong>
      <div>${escapeHtml(item.authorName)} | ${escapeHtml(item.availabilityLabel)}</div>
      <div>So luong: ${item.quantity} | Don gia: ${escapeHtml(item.unitPrice.formatted)}</div>
      <div>Tam tinh dong: ${escapeHtml(item.lineSubtotal.formatted)}</div>
      <form method="post" action="/cart/items/${escapeHtml(item.id)}">
        <input type="hidden" name="_csrf" value="${escapeHtml(csrfToken)}" />
        <input type="hidden" name="returnTo" value="/cart" />
        <label>Cap nhat so luong<input type="number" name="quantity" min="0" value="${item.quantity}" /></label>
        <button type="submit">Cap nhat</button>
      </form>
      <form method="post" action="/cart/items/${escapeHtml(item.id)}/delete">
        <input type="hidden" name="_csrf" value="${escapeHtml(csrfToken)}" />
        <input type="hidden" name="returnTo" value="/cart" />
        <button type="submit">Xoa sach khoi gio hang</button>
      </form>
    </div>`,
          )
          .join("")
      : `<div class="card muted">Gio hang dang trong.</div>`;

  return `<section>
    <div class="card">
      <h2>${escapeHtml(model.pageHeading)}</h2>
      <p>${escapeHtml(model.pageLead)}</p>
      <div>Tong so san pham: ${model.cart.summary.itemCount}</div>
      <div>Tam tinh: ${escapeHtml(model.cart.summary.subtotal.formatted)}</div>
      <div>Phi giao hang: ${escapeHtml(model.cart.summary.shippingFee.formatted)}</div>
      <div><strong>Tong cong: ${escapeHtml(model.cart.summary.total.formatted)}</strong></div>
      <div class="actions">
        <a href="/books">Tiep tuc mua sach</a>
        <a href="/checkout">Di toi checkout</a>
      </div>
    </div>
    ${items}
  </section>`;
}

function renderCheckoutPage(model: CheckoutPageModel, csrfToken: string): string {
  const checkout = model.checkout;
  const paymentOptions = checkout.paymentOptions
    .map(
      (option) => `<label><input type="radio" name="paymentMethod" value="${escapeHtml(option.code)}" ${
        option.selected ? "checked" : ""
      } /> ${escapeHtml(option.label)} - ${escapeHtml(option.description)}</label>`,
    )
    .join("");

  return `<section class="grid">
    <div class="card">
      <h2>${escapeHtml(model.pageHeading)}</h2>
      <p>${escapeHtml(model.pageLead)}</p>
      <div class="pill">Checkout attempt: ${escapeHtml(checkout.id)}</div>
      <div class="pill">Trang thai: ${escapeHtml(checkout.status)}</div>
      <div class="pill">Khach: ${checkout.isGuestCheckout ? "Guest" : "Authenticated"}</div>
    </div>
    <div class="card">
      <h3 class="section-title">Thong tin giao hang</h3>
      <form method="post" action="/checkout/shipping-info">
        <input type="hidden" name="_csrf" value="${escapeHtml(csrfToken)}" />
        <input type="hidden" name="checkoutAttemptId" value="${escapeHtml(checkout.id)}" />
        <label>Ho va ten<input name="fullName" value="${escapeHtml(checkout.shipping.fullName)}" required /></label>
        <label>So dien thoai<input name="phoneNumber" value="${escapeHtml(checkout.shipping.phoneNumber)}" required /></label>
        <label>Dia chi<input name="addressLine1" value="${escapeHtml(checkout.shipping.addressLine1)}" required /></label>
        <label>Phuong/Xa<input name="ward" value="${escapeHtml(checkout.shipping.ward)}" /></label>
        <label>Quan/Huyen<input name="district" value="${escapeHtml(checkout.shipping.district)}" required /></label>
        <label>Tinh/Thanh<input name="province" value="${escapeHtml(checkout.shipping.province)}" required /></label>
        <label>Ghi chu<textarea name="note">${escapeHtml(checkout.shipping.note)}</textarea></label>
        <button type="submit">Luu thong tin giao hang</button>
      </form>
    </div>
    <div class="card">
      <h3 class="section-title">Thanh toan</h3>
      <form method="post" action="/checkout/payment-method">
        <input type="hidden" name="_csrf" value="${escapeHtml(csrfToken)}" />
        <input type="hidden" name="checkoutAttemptId" value="${escapeHtml(checkout.id)}" />
        ${paymentOptions}
        <button type="submit">Luu phuong thuc thanh toan</button>
      </form>
    </div>
    <div class="card">
      <h3 class="section-title">Dat hang</h3>
      <div>Tam tinh: ${escapeHtml(checkout.summary.subtotal.formatted)}</div>
      <div>Phi giao hang: ${escapeHtml(checkout.summary.shippingFee.formatted)}</div>
      <div><strong>Tong cong: ${escapeHtml(checkout.summary.total.formatted)}</strong></div>
      <form method="post" action="/orders">
        <input type="hidden" name="_csrf" value="${escapeHtml(csrfToken)}" />
        <input type="hidden" name="checkoutAttemptId" value="${escapeHtml(checkout.id)}" />
        <input type="hidden" name="idempotencyKey" value="${escapeHtml(checkout.placeOrderIdempotencyKey)}" />
        <button type="submit" ${checkout.canPlaceOrder ? "" : "disabled"}>Dat don hang</button>
      </form>
    </div>
  </section>`;
}

function renderOrderSummary(order: OrderViewModel): string {
  const items = order.items
    .map(
      (item) => `<li>${escapeHtml(item.bookTitle)} x${item.quantity} - ${escapeHtml(
        item.lineSubtotal.formatted,
      )}</li>`,
    )
    .join("");
  const payments = order.payments
    .map(
      (payment) => `<li>${escapeHtml(payment.method)} - ${escapeHtml(payment.status)} - ${escapeHtml(
        payment.amount.formatted,
      )}</li>`,
    )
    .join("");

  return `<div class="grid">
    <div class="card">
      <div class="pill">${escapeHtml(order.orderNumber)}</div>
      <div class="pill">${escapeHtml(order.status)}</div>
      <div class="pill">${escapeHtml(order.paymentStatus)}</div>
      <div>Khach hang: ${escapeHtml(order.customerFullName)}</div>
      <div>Dien thoai: ${escapeHtml(order.customerPhoneNumber)}</div>
      <div>Email: ${escapeHtml(order.customerEmail ?? "")}</div>
      <div>Dat luc: ${escapeHtml(order.placedAtLabel)}</div>
      <div>Tong: ${escapeHtml(order.summary.total.formatted)}</div>
    </div>
    <div class="card">
      <h3>San pham</h3>
      <ul>${items}</ul>
    </div>
    <div class="card">
      <h3>Thanh toan</h3>
      <ul>${payments || "<li>Chua co ban ghi thanh toan</li>"}</ul>
    </div>
    <div class="card">
      <h3>Dia chi giao hang</h3>
      <div>${escapeHtml(order.address.recipientName)}</div>
      <div>${escapeHtml(order.address.phoneNumber)}</div>
      <div>${escapeHtml(order.address.addressLine1)}</div>
      <div>${escapeHtml(order.address.ward ?? "")}</div>
      <div>${escapeHtml(order.address.district)}</div>
      <div>${escapeHtml(order.address.province)}</div>
      <div>${escapeHtml(order.address.note ?? "")}</div>
    </div>
  </div>`;
}

function renderOrderSuccessPage(model: OrderSuccessPageModel): string {
  const bankInfo =
    model.order.paymentMethod === PAYMENT_METHOD.BANK_TRANSFER && model.order.bankTransferInstruction
      ? `<div class="card">
      <h3>Huong dan chuyen khoan</h3>
      <div>Ngan hang: ${escapeHtml(model.order.bankTransferInstruction.bankName)}</div>
      <div>So tai khoan: ${escapeHtml(model.order.bankTransferInstruction.accountNumber)}</div>
      <div>Chu tai khoan: ${escapeHtml(model.order.bankTransferInstruction.accountName)}</div>
      <div>Noi dung: ${escapeHtml(model.order.bankTransferInstruction.transferContent)}</div>
    </div>`
      : "";

  return `<section>
    <div class="card">
      <h2>${escapeHtml(model.pageHeading)}</h2>
      <p>${escapeHtml(model.pageLead)}</p>
      <div class="actions">
        <a href="${escapeHtml(model.continueShoppingHref)}">Tiep tuc mua sach</a>
        <a href="${escapeHtml(model.orderDetailHref)}">Xem chi tiet don hang</a>
      </div>
    </div>
    ${bankInfo}
    ${renderOrderSummary(model.order)}
  </section>`;
}

function renderOrderDetailPage(
  model: OrderDetailPageModel & {
    continueActionLabel?: string;
    cancelActionHref?: string;
    cancelReturnTo?: string;
  },
  csrfToken: string,
): string {
  const cancelForm =
    model.order.canCancel && model.cancelActionHref
      ? `<div class="card">
      <h3>Huy don hang</h3>
      <form method="post" action="${escapeHtml(model.cancelActionHref)}">
        <input type="hidden" name="_csrf" value="${escapeHtml(csrfToken)}" />
        <input type="hidden" name="returnTo" value="${escapeHtml(model.cancelReturnTo ?? "")}" />
        <label>Ly do huy<input name="reason" value="cancelled via backend bridge" /></label>
        <button type="submit">Huy don</button>
      </form>
    </div>`
      : "";

  return `<section>
    <div class="card">
      <h2>${escapeHtml(model.pageHeading)}</h2>
      <p>${escapeHtml(model.pageLead)}</p>
      <div class="actions">
        <a href="${escapeHtml(model.continueShoppingHref)}">${escapeHtml(
          model.continueActionLabel ?? "Tiep tuc",
        )}</a>
      </div>
    </div>
    ${renderOrderSummary(model.order)}
    ${cancelForm}
  </section>`;
}

function renderAdminDashboardPage(model: AdminDashboardPageModel): string {
  return `<section class="card">
    <h2>Admin dashboard</h2>
    <p>${escapeHtml(model.description ?? "")}</p>
    <div class="meta">${escapeHtml(model.title)}</div>
  </section>`;
}

function renderAdminCatalogPage(model: AdminCatalogPageModel): string {
  return `<section class="card">
    <h2>Catalog operations</h2>
    <p>${escapeHtml(model.description ?? "")}</p>
    <div class="meta">Books: ${model.entities.books.length} | Authors: ${model.entities.authors.length} | Categories: ${model.entities.categories.length}</div>
  </section>`;
}

function renderContentOpsPage(
  model: BasePageModel & {
    jobs: unknown[];
    stagedBooks: unknown[];
  },
): string {
  return `<section class="card">
    <h2>Content operations</h2>
    <p>${escapeHtml(model.description ?? "")}</p>
    <div class="meta">Jobs: ${model.jobs.length} | Staged books: ${model.stagedBooks.length}</div>
  </section>`;
}

function renderErrorPage(model: ErrorPageModel): string {
  return `<section class="card">
    <h2>${escapeHtml(model.title)}</h2>
    <p>${escapeHtml(model.message ?? model.description ?? "Da xay ra loi.")}</p>
  </section>`;
}

export function renderPage<T extends object>(
  req: Request,
  res: Response,
  view: string,
  model: BasePageModel & T,
): void {
  const csrfToken = res.locals.csrfToken ?? "";
  const typedModel = model as unknown;
  let body = "";
  let status = 200;

  switch (view) {
    case "pages/auth-login":
    case "pages/auth-register":
      body = renderAuthFormPage(typedModel as BasePageModel & AuthFormPageModel, csrfToken);
      break;
    case "pages/account":
      body = renderAccountPage(typedModel as BasePageModel & AccountPageModel);
      break;
    case "pages/account-orders":
      body = renderAccountOrdersPage(typedModel as BasePageModel & AccountOrdersPageModel);
      break;
    case "pages/cart":
      body = renderCartPage(typedModel as BasePageModel & CartPageModel, csrfToken);
      break;
    case "pages/checkout":
      body = renderCheckoutPage(typedModel as BasePageModel & CheckoutPageModel, csrfToken);
      break;
    case "pages/order-success":
      body = renderOrderSuccessPage(typedModel as BasePageModel & OrderSuccessPageModel);
      break;
    case "pages/order-detail":
      body = renderOrderDetailPage(
        typedModel as BasePageModel &
          OrderDetailPageModel & {
            continueActionLabel?: string;
            cancelActionHref?: string;
            cancelReturnTo?: string;
          },
        csrfToken,
      );
      break;
    case "pages/admin":
      body = renderAdminDashboardPage(typedModel as BasePageModel & AdminDashboardPageModel);
      break;
    case "pages/admin-catalog":
      body = renderAdminCatalogPage(typedModel as BasePageModel & AdminCatalogPageModel);
      break;
    case "pages/admin-content-ops":
      body = renderContentOpsPage(
        typedModel as BasePageModel & {
          jobs: unknown[];
          stagedBooks: unknown[];
        },
      );
      break;
    case "pages/error":
      status =
        typeof (model as ErrorPageModel).statusCode === "number"
          ? ((model as ErrorPageModel).statusCode ?? 500)
          : 500;
      body = renderErrorPage(model as ErrorPageModel);
      break;
    default:
      body = renderSimplePage(model);
      break;
  }

  layout(req, res, model.title, body, status);
}
