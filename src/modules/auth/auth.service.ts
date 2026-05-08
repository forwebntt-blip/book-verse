import { logger } from "../../shared/utils/logger";
import { hashPassword, verifyPassword } from "../../shared/utils/password";
import type { AuthContext } from "../../shared/security/auth-context";
import { AppError } from "../../shared/errors/app-error";
import type { AuthenticatedUserDto } from "../../shared/contracts";
import { AuthRepository, type AuthUserRecord } from "./auth.repository";
import type {
  AuthMeViewModel,
  AuthUserProfile,
  ParsedLoginPayload,
  ParsedRegisterPayload,
} from "./auth.types";

interface PasswordManager {
  hash(plainTextPassword: string): Promise<string>;
  verify(plainTextPassword: string, hashedPassword: string): Promise<boolean>;
}

interface AuthServiceDependencies {
  authRepository?: Pick<
    AuthRepository,
    "findUserByEmail" | "createUser" | "updateLastLoginAt" | "findUserById"
  >;
  passwordManager?: PasswordManager;
}

export class AuthService {
  private readonly authRepository: NonNullable<AuthServiceDependencies["authRepository"]>;
  private readonly passwordManager: PasswordManager;

  constructor(dependencies: AuthServiceDependencies = {}) {
    this.authRepository = dependencies.authRepository ?? new AuthRepository();
    this.passwordManager = dependencies.passwordManager ?? {
      hash: hashPassword,
      verify: verifyPassword,
    };
  }

  private toAuthenticatedUserDto(user: AuthUserRecord): AuthenticatedUserDto {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      permissions: [...user.permissions],
    };
  }

  private toAuthUserProfile(user: AuthUserRecord): AuthUserProfile {
    return {
      ...this.toAuthenticatedUserDto(user),
      phoneNumber: user.phoneNumber,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }

  buildAuthContext(user: AuthUserProfile): AuthContext {
    return {
      isAuthenticated: true,
      userId: user.id,
      role: user.role,
      permissions: [...user.permissions],
    };
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private normalizeDisplayName(fullName: string): string {
    return fullName.trim();
  }

  private normalizeOptionalPhoneNumber(phoneNumber?: string): string | undefined {
    const normalized = phoneNumber?.trim();
    return normalized ? normalized : undefined;
  }

  async register(payload: ParsedRegisterPayload): Promise<AuthUserProfile> {
    const normalizedEmail = this.normalizeEmail(payload.email);
    const normalizedFullName = this.normalizeDisplayName(payload.fullName);
    const normalizedPhoneNumber = this.normalizeOptionalPhoneNumber(payload.phoneNumber);

    const existingUser = await this.authRepository.findUserByEmail(normalizedEmail);

    if (existingUser) {
      throw new AppError({
        statusCode: 409,
        code: "EMAIL_ALREADY_IN_USE",
        message: "Email nay da duoc su dung.",
      });
    }

    const passwordHash = await this.passwordManager.hash(payload.password);
    const createdUser = await this.authRepository.createUser({
      email: normalizedEmail,
      fullName: normalizedFullName,
      passwordHash,
      phoneNumber: normalizedPhoneNumber,
    });

    logger.info("User registered successfully", {
      module: "auth",
      userId: createdUser.id,
      email: createdUser.email,
    });

    return this.toAuthUserProfile(createdUser);
  }

  async login(payload: ParsedLoginPayload): Promise<AuthUserProfile> {
    const normalizedEmail = this.normalizeEmail(payload.email);
    const user = await this.authRepository.findUserByEmail(normalizedEmail);

    if (!user) {
      logger.warn("Login failed: user not found", {
        module: "auth",
        email: normalizedEmail,
      });
      throw new AppError({
        statusCode: 401,
        code: "INVALID_CREDENTIALS",
        message: "Email hoac mat khau khong dung.",
      });
    }

    if (!user.isActive) {
      logger.warn("Login failed: account disabled", {
        module: "auth",
        userId: user.id,
        email: user.email,
      });
      throw new AppError({
        statusCode: 403,
        code: "ACCOUNT_DISABLED",
        message: "Tai khoan da bi vo hieu hoa.",
      });
    }

    const passwordMatched = await this.passwordManager.verify(payload.password, user.passwordHash);

    if (!passwordMatched) {
      logger.warn("Login failed: invalid password", {
        module: "auth",
        userId: user.id,
        email: user.email,
      });
      throw new AppError({
        statusCode: 401,
        code: "INVALID_CREDENTIALS",
        message: "Email hoac mat khau khong dung.",
      });
    }

    const updatedUser = await this.authRepository.updateLastLoginAt(user.id);

    logger.info("User logged in successfully", {
      module: "auth",
      userId: updatedUser.id,
      email: updatedUser.email,
    });

    return this.toAuthUserProfile(updatedUser);
  }

  async getMe(authContext: AuthContext): Promise<AuthMeViewModel> {
    if (!authContext.isAuthenticated || !authContext.userId) {
      return {
        isAuthenticated: false,
        user: null,
      };
    }

    const user = await this.authRepository.findUserById(authContext.userId);

    if (!user || !user.isActive) {
      return {
        isAuthenticated: false,
        user: null,
      };
    }

    return {
      isAuthenticated: true,
      user: this.toAuthenticatedUserDto(user),
    };
  }

  async getProfile(userId: string): Promise<AuthUserProfile> {
    const user = await this.authRepository.findUserById(userId);

    if (!user || !user.isActive) {
      throw new AppError({
        statusCode: 404,
        code: "USER_NOT_FOUND",
        message: "Khong tim thay tai khoan nguoi dung.",
      });
    }

    return this.toAuthUserProfile(user);
  }
}
