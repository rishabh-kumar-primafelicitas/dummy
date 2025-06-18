import { Schema, model } from "mongoose";
import { IUserProgress, SafetyStage } from "./interfaces/IUserProgress";

const userProgressSchema = new Schema<IUserProgress>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      unique: true,
      index: true,
    },
    currentXP: {
      type: Number,
      default: 0,
      min: [0, "Current XP cannot be negative"],
      max: [99, "Current XP cannot exceed 99"],
    },
    currentLevel: {
      type: Number,
      default: 1,
      min: [1, "Level cannot be less than 1"],
    },
    totalLifetimeXP: {
      type: Number,
      default: 0,
      min: [0, "Total lifetime XP cannot be negative"],
    },
    xpMeterVisible: {
      type: Boolean,
      default: false,
      index: true,
    },
    safetyMeterVisible: {
      type: Boolean,
      default: false,
      index: true,
    },
    currentStage: {
      type: Number,
      default: SafetyStage.STAGE_3,
      min: [SafetyStage.STAGE_3, "Stage cannot be less than 3"],
      max: [SafetyStage.STAGE_5, "Stage cannot exceed 5"],
    },
    lastLoginDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lastQuestCompletionDate: {
      type: Date,
      default: null,
    },
    lastSafetyCheck: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lastSocialTaskDate: {
      type: Date,
      default: null,
    },
    lastEducationalTaskDate: {
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
userProgressSchema.index({ userId: 1 }, { unique: true });
userProgressSchema.index({ lastSafetyCheck: 1 });
userProgressSchema.index({ safetyMeterVisible: 1, lastSafetyCheck: 1 });

// Method to calculate stage bonus
userProgressSchema.methods.calculateStageBonus = function (
  baseXP: number
): number {
  switch (this.currentStage) {
    case SafetyStage.STAGE_3:
      return 0; // Base XP Rate
    case SafetyStage.STAGE_4:
      return 5; // +5 XP bonus
    case SafetyStage.STAGE_5:
      return 10; // +10 XP bonus
    default:
      return 0;
  }
};

// Method to check if should degrade
userProgressSchema.methods.shouldDegrade = function (): boolean {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const noLogin = !this.lastLoginDate || this.lastLoginDate < yesterday;
  const noSocialTask =
    !this.lastSocialTaskDate || this.lastSocialTaskDate < yesterday;
  const noEducationalTask =
    !this.lastEducationalTaskDate || this.lastEducationalTaskDate < yesterday;

  return noLogin && (noSocialTask || noEducationalTask);
};

// Method to update last login
userProgressSchema.methods.updateLastLogin = async function (): Promise<void> {
  this.lastLoginDate = new Date();
  return this.save();
};

export const UserProgress = model<IUserProgress>(
  "UserProgress",
  userProgressSchema,
  "user_progress"
);
