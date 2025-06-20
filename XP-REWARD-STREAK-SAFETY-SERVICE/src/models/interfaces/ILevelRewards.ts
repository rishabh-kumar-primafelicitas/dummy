import { Document } from "mongoose";

export interface ILevelRewards extends Document {
  level: number;
  rewardType: RewardType;
  mysteryBoxCount: number;
  multiplierValue: number;
  description: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum RewardType {
  MYSTERY_BOX = "MYSTERY_BOX",
  MULTIPLIER = "MULTIPLIER",
  BOTH = "BOTH",
}
