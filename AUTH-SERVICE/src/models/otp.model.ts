import { Schema, model } from "mongoose";
import { IOtp } from "./interfaces/IOtp";

const otpSchema = new Schema<IOtp>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      index: true,
    },
    otpHash: {
      type: String,
      required: [true, "OTP hash is required"],
    },
    expiresAt: {
      type: Date,
      required: [true, "OTP expiration is required"],
      index: { expireAfterSeconds: 0 }, 
    },
    isUsed: {
      type: Boolean,
      default: false,
      index: true,
    },
    resetToken: {
      type: String,
      default: null,
    },
    resetTokenHash: {
      type: String,
      default: null,
    },
    resetTokenExpiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes
otpSchema.index({ userId: 1, isUsed: 1 });
otpSchema.index({ email: 1, isUsed: 1 });
otpSchema.index({ resetTokenHash: 1 });

// Method to check if OTP is expired
otpSchema.methods.isExpired = function (): boolean {
  return this.expiresAt < new Date();
};

// Method to mark OTP as used
otpSchema.methods.markAsUsed = async function (): Promise<void> {
  this.isUsed = true;
  return this.save();
};

export const Otp = model<IOtp>("Otp", otpSchema);
