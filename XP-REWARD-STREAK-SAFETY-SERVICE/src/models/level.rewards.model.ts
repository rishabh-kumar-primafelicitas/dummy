import { Schema, model } from "mongoose";
import { ILevelRewards, RewardType } from "./interfaces/ILevelRewards";

const levelRewardsSchema = new Schema<ILevelRewards>(
  {
    level: {
      type: Number,
      required: [true, "Level is required"],
      unique: true,
      min: [1, "Level must be at least 1"],
    },
    rewardType: {
      type: String,
      enum: Object.values(RewardType),
      required: [true, "Reward type is required"],
    },
    mysteryBoxCount: {
      type: Number,
      default: 0,
      min: [0, "Mystery box count cannot be negative"],
    },
    multiplierValue: {
      type: Number,
      default: 1,
      min: [1, "Multiplier value must be at least 1"],
    },
    description: {
      type: String,
      trim: true,
      default: "",
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
levelRewardsSchema.index({ level: 1 });
levelRewardsSchema.index({ isActive: 1 });

export const LevelRewards = model<ILevelRewards>(
  "LevelRewards",
  levelRewardsSchema
);
