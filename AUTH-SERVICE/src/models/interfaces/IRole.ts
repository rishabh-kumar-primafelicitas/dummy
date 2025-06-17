import { Document } from "mongoose";

export interface IRole extends Document {
  name: string;
  roleId: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum RoleName {
  PLAYER = "PLAYER",
  TENT_ADMIN = "TENT_ADMIN",
  SUPER_ADMIN = "SUPER_ADMIN",
  SUPPORT_MANAGER = "SUPPORT_MANAGER",
}
