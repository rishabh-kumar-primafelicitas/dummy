import jwt from "jsonwebtoken";
import { config } from "configs/server.config";
import { Types } from "mongoose";
import { UnauthorizedError } from "errors/index";

export interface JWTPayload {
  userId: string;
  sessionId: string;
  deviceId?: string;
  type: "access" | "refresh";
  iat?: number;
  exp?: number;
}

export class JWTUtil {
  static generateAccessToken(
    userId: Types.ObjectId,
    sessionId: Types.ObjectId,
    deviceId?: Types.ObjectId
  ): string {
    const payload: JWTPayload = {
      userId: userId.toString(),
      sessionId: sessionId.toString(),
      deviceId: deviceId?.toString(),
      type: "access",
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: Number(config.jwt.accessTokenExpireMs / 1000),
      issuer: "camp-haven-auth",
      algorithm: "HS256", // Explicitly specify algorithm
    });
  }

  static generateRefreshToken(
    userId: Types.ObjectId,
    sessionId: Types.ObjectId,
    deviceId?: Types.ObjectId
  ): string {
    const payload: JWTPayload = {
      userId: userId.toString(),
      sessionId: sessionId.toString(),
      deviceId: deviceId?.toString(),
      type: "refresh",
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: Number(config.jwt.refreshTokenExpireMs / 1000),
      issuer: "camp-haven-auth",
      algorithm: "HS256", // Explicitly specify algorithm
    });
  }

  static verifyToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, config.jwt.secret, {
        issuer: "camp-haven-auth",
        algorithms: ["HS256"], // Specify allowed algorithms
      }) as JWTPayload;
    } catch (error) {
      throw new UnauthorizedError("Invalid or expired token");
    }
  }

  static getTokenExpiry(token: string): Date {
    try {
      const decoded = jwt.decode(token) as JWTPayload;
      if (!decoded || !decoded.exp) {
        throw new UnauthorizedError("Invalid token format");
      }
      return new Date(decoded.exp * 1000);
    } catch (error) {
      throw new UnauthorizedError("Unable to decode token");
    }
  }

  static isTokenExpired(token: string): boolean {
    try {
      const expiry = this.getTokenExpiry(token);
      return expiry < new Date();
    } catch (error) {
      return true; // Consider invalid tokens as expired
    }
  }
}
