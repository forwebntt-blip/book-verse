import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSafeAuthReturnToPath,
  parseLoginPayload,
  parseRegisterPayload,
} from "../../src/modules/auth/auth.query";

test("parseRegisterPayload trims fields, normalizes email, and preserves safe returnTo", () => {
  const payload = parseRegisterPayload({
    email: " Reader@Example.com ",
    fullName: " Nguyen Thi Doc Gia ",
    password: " Secret123 ",
    phoneNumber: " 0901234567 ",
    returnTo: "/account/orders",
  });

  assert.deepEqual(payload, {
    email: "reader@example.com",
    fullName: "Nguyen Thi Doc Gia",
    password: "Secret123",
    phoneNumber: "0901234567",
    returnTo: "/account/orders",
  });
});

test("parseRegisterPayload rejects invalid email and weak password", () => {
  assert.throws(
    () =>
      parseRegisterPayload({
        email: "not-an-email",
        fullName: "Nguyen Thi Doc Gia",
        password: "123",
      }),
    /email is invalid/i,
  );

  assert.throws(
    () =>
      parseRegisterPayload({
        email: "reader@example.com",
        fullName: "Nguyen Thi Doc Gia",
        password: "abcdefgh",
      }),
    /password must include at least one letter and one number/i,
  );
});

test("parseLoginPayload normalizes email and validates required password", () => {
  assert.deepEqual(
    parseLoginPayload({
      email: " Reader@Example.com ",
      password: " Secret123 ",
      returnTo: "/account",
    }),
    {
      email: "reader@example.com",
      password: "Secret123",
      returnTo: "/account",
    },
  );

  assert.throws(
    () =>
      parseLoginPayload({
        email: "reader@example.com",
        password: "   ",
      }),
    /password is required/i,
  );
});

test("buildSafeAuthReturnToPath falls back for external and malformed URLs", () => {
  assert.equal(buildSafeAuthReturnToPath("/account/orders"), "/account/orders");
  assert.equal(buildSafeAuthReturnToPath("https://evil.example"), "/account");
  assert.equal(buildSafeAuthReturnToPath("//evil.example"), "/account");
  assert.equal(buildSafeAuthReturnToPath("orders"), "/account");
});
