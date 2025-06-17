import { Schema, model } from "mongoose";
import { IRole, RoleName } from "./interfaces/IRole";

const roleSchema = new Schema<IRole>(
  {
    name: {
      type: String,
      required: [true, "Role name is required"],
      unique: true,
      enum: Object.values(RoleName),
      trim: true,
    },
    roleId: {
      type: Number,
      required: [true, "Role ID is required"],
      unique: true,
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
roleSchema.index({ name: 1 });
roleSchema.index({ isActive: 1 });

export const Role = model<IRole>("Role", roleSchema);
