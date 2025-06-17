import { Document, Types } from "mongoose";

export interface IOtp extends Document {
  userId: Types.ObjectId;
  email: string;
  otpHash: string;
  expiresAt: Date;
  isUsed: boolean;
  resetToken?: string | null;
  resetTokenHash?: string | null;
  resetTokenExpiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  isExpired(): boolean;
  markAsUsed(): Promise<void>;
}
