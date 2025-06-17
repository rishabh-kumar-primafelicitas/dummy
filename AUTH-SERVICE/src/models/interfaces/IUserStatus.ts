import { Document } from "mongoose";

export interface IUserStatus extends Document {
  code: number;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
