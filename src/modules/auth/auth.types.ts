import type { AuthenticatedUserDto, MoneyDto } from "../../shared/contracts";
import type { OrderStatus, PaymentMethodCode, PaymentStatus, UserRole } from "../../shared/contracts";

export interface ParsedRegisterPayload {
  email: string;
  fullName: string;
  password: string;
  phoneNumber?: string;
  returnTo?: string;
}

export interface ParsedLoginPayload {
  email: string;
  password: string;
  returnTo?: string;
}

export interface ParsedAccountProfileUpdatePayload {
  fullName: string;
  phoneNumber?: string;
}

export interface AuthMeViewModel {
  isAuthenticated: boolean;
  user: AuthenticatedUserDto | null;
}

export interface AuthUserProfile extends AuthenticatedUserDto {
  phoneNumber?: string | null;
  isActive: boolean;
  lastLoginAt?: Date | null;
  createdAt: Date;
}

export interface AccountProfileViewModel {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string | null;
  role: UserRole;
  memberSinceLabel: string;
  lastLoginAtLabel?: string | null;
}

export interface AccountOrderListItemViewModel {
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethodCode;
  itemCount: number;
  total: MoneyDto;
  placedAtLabel: string;
  detailHref: string;
}

export interface AuthFormPageModel {
  title: string;
  description: string;
  pageHeading: string;
  pageLead: string;
  formAction: string;
  submitLabel: string;
  alternateHref: string;
  alternateLabel: string;
  returnTo: string;
}

export interface AccountPageModel {
  title: string;
  description: string;
  pageHeading: string;
  pageLead: string;
  profile: AccountProfileViewModel;
  ordersHref: string;
  recentOrderCount: number;
}

export interface AccountOrdersPageModel {
  title: string;
  description: string;
  pageHeading: string;
  pageLead: string;
  profileHref: string;
  orders: AccountOrderListItemViewModel[];
}
