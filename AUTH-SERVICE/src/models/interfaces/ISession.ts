import { Document, Types } from "mongoose";

export interface ISession extends Document {
  userId: Types.ObjectId;
  accessToken: string;
  refreshToken: string;
  deviceId: Types.ObjectId | null;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
  lastActivityAt: Date;
  refreshTokenExpiresAt: Date;
  accessTokenExpiresAt: Date;
  revokedAt: Date | null;
  revokedReason: string | null;
  createdAt: Date;
  updatedAt: Date;

  // Virtual properties
  isExpired: boolean;
  isValid: boolean;

  // Methods
  revoke(reason?: string): Promise<void>;
  updateActivity(): Promise<void>;
}
