import { makeMoney } from "../../shared/utils/money";
import { AuthService } from "./auth.service";
import { CheckoutService } from "../checkout/checkout.service";
import type {
  AccountOrdersPageModel,
  AccountPageModel,
  AccountProfileViewModel,
  AuthFormPageModel,
} from "./auth.types";

const authService = new AuthService();
const checkoutService = new CheckoutService();

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

function buildProfileViewModel(
  profile: Awaited<ReturnType<AuthService["getProfile"]>>,
): AccountProfileViewModel {
  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.fullName,
    phoneNumber: profile.phoneNumber,
    role: profile.role,
    memberSinceLabel: formatDate(profile.createdAt),
    lastLoginAtLabel: profile.lastLoginAt ? formatDateTime(profile.lastLoginAt) : null,
  };
}

export function buildLoginPageModel(returnTo: string): AuthFormPageModel {
  return {
    title: "Đăng nhập",
    description: "Đăng nhập để xem hồ sơ và lịch sử đơn hàng của bạn.",
    pageHeading: "Đăng nhập tài khoản",
    pageLead: "Đăng nhập để theo dõi đơn hàng, truy cập khu vực account và đồng bộ giỏ hàng.",
    formAction: "/login",
    submitLabel: "Đăng nhập",
    alternateHref: `/register?returnTo=${encodeURIComponent(returnTo)}`,
    alternateLabel: "Chưa có tài khoản? Đăng ký",
    returnTo,
  };
}

export function buildRegisterPageModel(returnTo: string): AuthFormPageModel {
  return {
    title: "Đăng ký",
    description: "Tạo tài khoản để theo dõi đơn hàng và quản lý thông tin cơ bản.",
    pageHeading: "Tạo tài khoản mới",
    pageLead:
      "Đăng ký tài khoản không bắt buộc để mua hàng, nhưng giúp bạn xem lịch sử đơn và đồng bộ giỏ hàng.",
    formAction: "/register",
    submitLabel: "Đăng ký",
    alternateHref: `/login?returnTo=${encodeURIComponent(returnTo)}`,
    alternateLabel: "Đã có tài khoản? Đăng nhập",
    returnTo,
  };
}

export async function buildAccountPageModel(userId: string): Promise<AccountPageModel> {
  const [profile, orders] = await Promise.all([
    authService.getProfile(userId),
    checkoutService.listOrdersForUser(userId),
  ]);

  return {
    title: "Tài khoản",
    description: "Trang hồ sơ cơ bản và các lối tự phục vụ dành cho người mua.",
    pageHeading: "Khu vực tài khoản",
    pageLead:
      "Từ đây bạn có thể xem thông tin cơ bản, theo dõi đơn hàng và tiếp tục các thao tác tự phục vụ.",
    profile: buildProfileViewModel(profile),
    ordersHref: "/account/orders",
    recentOrderCount: orders.length,
  };
}

export async function buildAccountOrdersPageModel(
  userId: string,
): Promise<AccountOrdersPageModel> {
  const orders = await checkoutService.listOrdersForUser(userId);

  return {
    title: "Lịch sử đơn hàng",
    description: "Danh sách đơn hàng của tài khoản đang đăng nhập.",
    pageHeading: "Lịch sử đơn hàng",
    pageLead:
      "Chỉ hiển thị các đơn thuộc chính tài khoản của bạn, kèm theo trạng thái đơn và thanh toán.",
    profileHref: "/account",
    orders: orders.map((order) => ({
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      itemCount: order.itemCount,
      total: makeMoney(order.totalAmount),
      placedAtLabel: formatDateTime(order.placedAt),
      detailHref: `/account/orders/${order.orderNumber}`,
    })),
  };
}
