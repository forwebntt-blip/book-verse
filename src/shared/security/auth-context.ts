import type { AdminPermission, UserRole } from "../contracts";
import { USER_ROLES } from "../contracts";

export interface AuthContext {
  isAuthenticated: boolean;
  userId: string | null;
  role: UserRole | null;
  permissions: AdminPermission[];
}

export function getAnonymousAuthContext(): AuthContext {
  return {
    isAuthenticated: false,
    userId: null,
    role: USER_ROLES.CUSTOMER,
    permissions: [],
  };
}
