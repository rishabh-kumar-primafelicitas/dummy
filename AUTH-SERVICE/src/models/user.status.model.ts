import { Schema, model } from "mongoose";
import { IUserStatus } from "./interfaces/IUserStatus";

const userStatusSchema = new Schema<IUserStatus>(
  {
    code: {
      type: Number,
      required: [true, "Status code is required"],
      unique: true,
    },
    name: {
      type: String,
      required: [true, "Status name is required"],
      unique: true,
      uppercase: true,
      trim: true,
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

export const UserStatus = model<IUserStatus>(
  "UserStatus",
  userStatusSchema,
  "user_statuses"
);
