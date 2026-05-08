import bcrypt from "bcryptjs";
import { env } from "../../config/env";

export function hashPassword(plainTextPassword: string): Promise<string> {
  return bcrypt.hash(plainTextPassword, env.BCRYPT_ROUNDS);
}

export function verifyPassword(
  plainTextPassword: string,
  hashedPassword: string,
): Promise<boolean> {
  return bcrypt.compare(plainTextPassword, hashedPassword);
}
