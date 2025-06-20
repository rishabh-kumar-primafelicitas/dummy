import { Document, Types } from "mongoose";

export interface IUser extends Document {
  username: string;
  email: string | null;
  password: string | null;
  oAuthProvider: string | null;
  oAuthId: string | null;
  roleId: Types.ObjectId;
  status: Types.ObjectId;
  airLyftAuthToken: string | null;
  walletAddress: string | null;
  walletConnected: boolean;
  lastLoginAt: Date | null;
  loginAttempts: number;
  lockedUntil: Date | null;
  profilePicture: string | null;
  twoFactorEnabled: boolean;
  twoFactorSecret: string | null;
  emailVerified: boolean;
  emailVerificationToken: string | null;
  emailVerificationExpires: Date | null;
  passwordResetToken: string | null;
  passwordResetExpires: Date | null;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  isLocked(): boolean;
  incrementLoginAttempts(): Promise<void>;
  resetLoginAttempts(): Promise<void>;
}

export enum UserStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  SUSPENDED = "SUSPENDED",
  DELETED = "DELETED",
}

export enum OAuthProvider {
  DISCORD = "discord",
  TELEGRAM = "telegram",
  GOOGLE = "google",
  LOCAL = "local",
}
