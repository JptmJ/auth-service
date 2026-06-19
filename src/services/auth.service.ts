import { Connection } from "mongoose";
import { IUser, getUserModel } from "../models/user.model";
import { getRefreshTokenModel } from "../models/token.model";
import { ApiError } from "../utils/apiError";
import { hashPassword, comparePassword } from "../utils/password";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
  parseExpiryToMs,
} from "../utils/jwt";
import { env } from "../config/env";

interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

interface LoginInput {
  email: string;
  password: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

const sanitizeUser = (user: IUser) => ({
  id: user._id.toString(),
  appId: user.appId,
  name: user.name,
  email: user.email,
  roles: user.roles,
  isVerified: user.isVerified,
  createdAt: user.createdAt,
});

const issueTokens = async (conn: Connection, user: IUser): Promise<AuthTokens> => {
  const RefreshToken = getRefreshTokenModel(conn);

  const payload = {
    userId: user._id.toString(),
    appId: user.appId,
    roles: user.roles,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  const expiresAt = new Date(Date.now() + parseExpiryToMs(env.refreshTokenExpiry));

  await RefreshToken.create({
    user: user._id,
    appId: user.appId,
    token: hashToken(refreshToken),
    expiresAt,
  });

  return { accessToken, refreshToken };
};

export const authService = {
  // `tenantId` is the resolved X-Tenant-Id (req.tenant.id) — every method
  // here receives the tenant's own Connection (req.tenant.connection) so
  // all reads/writes go straight to that client's dedicated database.
  async register(conn: Connection, tenantId: string, input: RegisterInput) {
    const User = getUserModel(conn);

    const existingUser = await User.findOne({ email: input.email });

    if (existingUser) {
      throw ApiError.conflict("An account with this email already exists");
    }

    const hashedPassword = await hashPassword(input.password);

    const user = await User.create({
      appId: tenantId,
      name: input.name,
      email: input.email,
      password: hashedPassword,
    });

    const tokens = await issueTokens(conn, user);

    return { user: sanitizeUser(user), tokens };
  },

  async login(conn: Connection, input: LoginInput) {
    const User = getUserModel(conn);

    const user = await User.findOne({ email: input.email }).select("+password");

    if (!user) {
      throw ApiError.unauthorized("Invalid email or password");
    }

    if (!user.isActive) {
      throw ApiError.forbidden("This account has been deactivated");
    }

    const isPasswordValid = await comparePassword(input.password, user.password);

    if (!isPasswordValid) {
      throw ApiError.unauthorized("Invalid email or password");
    }

    const tokens = await issueTokens(conn, user);

    return { user: sanitizeUser(user), tokens };
  },

  async refresh(conn: Connection, refreshTokenInput: string) {
    const User = getUserModel(conn);
    const RefreshToken = getRefreshTokenModel(conn);

    let decoded;

    try {
      decoded = verifyRefreshToken(refreshTokenInput);
    } catch {
      throw ApiError.unauthorized("Invalid or expired refresh token");
    }

    const hashedToken = hashToken(refreshTokenInput);

    const storedToken = await RefreshToken.findOne({
      token: hashedToken,
      user: decoded.userId,
      revoked: false,
    });

    if (!storedToken) {
      throw ApiError.unauthorized("Refresh token not recognized or has been revoked");
    }

    if (storedToken.expiresAt < new Date()) {
      throw ApiError.unauthorized("Refresh token has expired");
    }

    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      throw ApiError.unauthorized("User no longer exists or is inactive");
    }

    // Rotate: revoke old refresh token, issue a new pair
    storedToken.revoked = true;
    await storedToken.save();

    const tokens = await issueTokens(conn, user);

    return { user: sanitizeUser(user), tokens };
  },

  async logout(conn: Connection, refreshTokenInput: string) {
    const RefreshToken = getRefreshTokenModel(conn);
    const hashedToken = hashToken(refreshTokenInput);

    await RefreshToken.updateOne({ token: hashedToken }, { $set: { revoked: true } });

    return true;
  },

  async getProfile(conn: Connection, userId: string) {
    const User = getUserModel(conn);
    const user = await User.findById(userId);

    if (!user) {
      throw ApiError.notFound("User not found");
    }

    return sanitizeUser(user);
  },
};
