import { Schema, model } from "mongoose";
import { IDevice, DeviceType } from "./interfaces/IDevice";

const deviceSchema = new Schema<IDevice>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    deviceName: {
      type: String,
      required: [true, "Device name is required"],
      default: "Unknown Device",
    },
    deviceType: {
      type: String,
      enum: Object.values(DeviceType),
      default: DeviceType.OTHER,
    },
    os: {
      type: String,
      required: [true, "OS is required"],
      default: "Unknown",
    },
    osVersion: {
      type: String,
      default: null,
    },
    browser: {
      type: String,
      default: null,
    },
    browserVersion: {
      type: String,
      default: null,
    },
    fingerprint: {
      type: String,
      required: [true, "Device fingerprint is required"],
      index: true,
    },
    ipAddress: {
      type: String,
      required: [true, "IP address is required"],
      default: "0.0.0.0",
    },
    trusted: {
      type: Boolean,
      default: false,
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes
deviceSchema.index({ userId: 1, isActive: 1 });
deviceSchema.index({ lastUsedAt: -1 });

// Method to update last used
deviceSchema.methods.updateLastUsed = async function (): Promise<void> {
  this.lastUsedAt = new Date();
  return this.save();
};

// Method to mark as trusted
deviceSchema.methods.markAsTrusted = async function (): Promise<void> {
  this.trusted = true;
  return this.save();
};

deviceSchema.methods.refreshFingerprint = async function (
  newFingerprint: string
): Promise<void> {
  this.fingerprint = newFingerprint;
  this.lastUsedAt = new Date();
  return this.save();
};

export const Device = model<IDevice>("Device", deviceSchema);
