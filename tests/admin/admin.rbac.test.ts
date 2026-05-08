import test from "node:test";
import assert from "node:assert/strict";

import { requireAdminPermission } from "../../src/shared/security/rbac";
import { USER_ROLES } from "../../src/shared/contracts";
import { AppError } from "../../src/shared/errors/app-error";

function runGuard(input: {
  isAuthenticated: boolean;
  role: string | null;
  permissions: string[];
}) {
  return new Promise<void>((resolve, reject) => {
    const middleware = requireAdminPermission("CONTENT_REVIEW");
    middleware(
      {
        authContext: {
          isAuthenticated: input.isAuthenticated,
          userId: input.isAuthenticated ? "user-1" : null,
          role: input.role as never,
          permissions: input.permissions as never,
        },
      } as never,
      {} as never,
      (error?: unknown) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      },
    );
  });
}

test("requireAdminPermission rejects guests", async () => {
  await assert.rejects(
    () =>
      runGuard({
        isAuthenticated: false,
        role: null,
        permissions: [],
      }),
    (error: unknown) => error instanceof AppError && error.code === "AUTH_REQUIRED",
  );
});

test("requireAdminPermission rejects non-admin storefront users", async () => {
  await assert.rejects(
    () =>
      runGuard({
        isAuthenticated: true,
        role: USER_ROLES.CUSTOMER,
        permissions: [],
      }),
    (error: unknown) => error instanceof AppError && error.code === "ADMIN_REQUIRED",
  );
});

test("requireAdminPermission rejects admin role without requested permission", async () => {
  await assert.rejects(
    () =>
      runGuard({
        isAuthenticated: true,
        role: USER_ROLES.ADMIN,
        permissions: ["CATALOG_MANAGE"],
      }),
    (error: unknown) => error instanceof AppError && error.code === "PERMISSION_DENIED",
  );
});

test("requireAdminPermission allows privileged users with the requested permission", async () => {
  await assert.doesNotReject(() =>
    runGuard({
      isAuthenticated: true,
      role: USER_ROLES.CONTENT_EDITOR,
      permissions: ["CONTENT_REVIEW"],
    }),
  );
});
