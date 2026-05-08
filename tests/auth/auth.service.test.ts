import test from "node:test";
import assert from "node:assert/strict";

import { USER_ROLES } from "../../src/shared/contracts";
import { AppError } from "../../src/shared/errors/app-error";
import { AuthService } from "../../src/modules/auth/auth.service";

function makeUserRecord(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "user-1",
    email: "reader@example.com",
    fullName: "Nguyen Thi Doc Gia",
    passwordHash: "hashed:Secret123",
    phoneNumber: "0901234567",
    role: USER_ROLES.CUSTOMER,
    permissions: [],
    isActive: true,
    lastLoginAt: new Date("2026-05-04T10:00:00.000Z"),
    createdAt: new Date("2026-05-01T08:00:00.000Z"),
    updatedAt: new Date("2026-05-04T10:00:00.000Z"),
    ...overrides,
  };
}

test("register normalizes email and hashes password before persisting", async () => {
  const createdUsers: Array<Record<string, unknown>> = [];
  const service = new AuthService({
    authRepository: {
      findUserByEmail: async () => null,
      createUser: async (input) => {
        createdUsers.push(input as unknown as Record<string, unknown>);
        return makeUserRecord({
          id: "user-registered",
          email: input.email,
          fullName: input.fullName,
          phoneNumber: input.phoneNumber ?? null,
          passwordHash: input.passwordHash,
        });
      },
      updateLastLoginAt: async () => makeUserRecord(),
      findUserById: async () => null,
    },
    passwordManager: {
      hash: async (plainTextPassword) => `hashed:${plainTextPassword}`,
      verify: async () => true,
    },
  });

  const user = await service.register({
    email: " Reader@Example.com ",
    fullName: " Nguyen Thi Doc Gia ",
    password: "Secret123",
    phoneNumber: "0901234567",
  });

  assert.equal(createdUsers[0]?.email, "reader@example.com");
  assert.equal(createdUsers[0]?.passwordHash, "hashed:Secret123");
  assert.equal(user.id, "user-registered");
  assert.equal(user.email, "reader@example.com");
  assert.equal(user.fullName, "Nguyen Thi Doc Gia");
});

test("login rejects invalid credentials and disabled accounts", async () => {
  const service = new AuthService({
    authRepository: {
      findUserByEmail: async (email) =>
        email === "disabled@example.com"
          ? makeUserRecord({
              id: "user-disabled",
              email,
              isActive: false,
            })
          : makeUserRecord(),
      createUser: async () => makeUserRecord(),
      updateLastLoginAt: async () => makeUserRecord(),
      findUserById: async () => null,
    },
    passwordManager: {
      hash: async () => "unused",
      verify: async (plainTextPassword) => plainTextPassword === "Secret123",
    },
  });

  await assert.rejects(
    () =>
      service.login({
        email: "reader@example.com",
        password: "WrongPassword1",
      }),
    (error: unknown) =>
      error instanceof AppError && error.code === "INVALID_CREDENTIALS",
  );

  await assert.rejects(
    () =>
      service.login({
        email: "disabled@example.com",
        password: "Secret123",
      }),
    (error: unknown) =>
      error instanceof AppError && error.code === "ACCOUNT_DISABLED",
  );
});

test("getMe returns anonymous state for guests and user data for authenticated sessions", async () => {
  const service = new AuthService({
    authRepository: {
      findUserByEmail: async () => null,
      createUser: async () => makeUserRecord(),
      updateLastLoginAt: async () => makeUserRecord(),
      findUserById: async (userId) =>
        userId === "user-1" ? makeUserRecord({ id: userId }) : null,
    },
    passwordManager: {
      hash: async () => "unused",
      verify: async () => false,
    },
  });

  const guestState = await service.getMe({
    isAuthenticated: false,
    userId: null,
    role: USER_ROLES.CUSTOMER,
    permissions: [],
  });

  assert.deepEqual(guestState, {
    isAuthenticated: false,
    user: null,
  });

  const authState = await service.getMe({
    isAuthenticated: true,
    userId: "user-1",
    role: USER_ROLES.CUSTOMER,
    permissions: [],
  });

  assert.equal(authState.isAuthenticated, true);
  assert.equal(authState.user?.id, "user-1");
  assert.equal(authState.user?.email, "reader@example.com");
});
