import { Schema, model } from "mongoose";
import { ISession } from "./interfaces/ISession";

const sessionSchema = new Schema<ISession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    accessToken: {
      type: String,
      index: true,
    },
    refreshToken: {
      type: String,
      index: true,
    },
    deviceId: {
      type: Schema.Types.ObjectId,
      ref: "Device",
      default: null,
    },
    ipAddress: {
      type: String,
      required: [true, "IP address is required"],
    },
    userAgent: {
      type: String,
      required: [true, "User agent is required"],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
    refreshTokenExpiresAt: {
      type: Date,
      required: [true, "Refresh token expiry is required"],
      index: true,
    },
    accessTokenExpiresAt: {
      type: Date,
      required: [true, "Access token expiry is required"],
      index: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    revokedReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes
sessionSchema.index({ userId: 1, isActive: 1 });
sessionSchema.index({ token: 1, isActive: 1 });
sessionSchema.index({ refreshToken: 1, isActive: 1 });
sessionSchema.index({ refreshTokenExpiresAt: 1 });

// Virtual for isExpired
sessionSchema.virtual("isExpired").get(function () {
  return this.refreshTokenExpiresAt < new Date();
});

// Virtual for isValid
sessionSchema.virtual("isValid").get(function () {
  return this.isActive && !this.isExpired && !this.revokedAt;
});

// Method to revoke session
sessionSchema.methods.revoke = async function (reason?: string): Promise<void> {
  this.isActive = false;
  this.revokedAt = new Date();
  this.revokedReason = reason || "Session revoked";
  return this.save();
};

// Method to update activity
sessionSchema.methods.updateActivity = async function (): Promise<void> {
  this.lastActivityAt = new Date();
  return this.save();
};

export const Session = model<ISession>("Session", sessionSchema);
