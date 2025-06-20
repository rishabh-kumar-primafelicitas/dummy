import { Document, Types } from "mongoose";

export interface IUserProgress extends Document {
  userId: Types.ObjectId;
  currentXP: number;
  currentLevel: number;
  totalLifetimeXP: number;
  xpMeterVisible: boolean;
  safetyMeterVisible: boolean;
  currentStage: number;
  lastLoginDate: Date;
  lastQuestCompletionDate: Date | null;
  lastSafetyCheck: Date;
  lastSocialTaskDate: Date | null;
  lastEducationalTaskDate: Date | null;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  calculateStageBonus(baseXP: number): number;
  getCurrentXPWithStage(): number;
  shouldDegrade(): boolean;
  updateLastLogin(): Promise<void>;
}

export enum SafetyStage {
  STAGE_1 = 1,
  STAGE_2 = 2,
  STAGE_3 = 3,
  STAGE_4 = 4,
  STAGE_5 = 5,
}

export enum ActivityType {
  LOGIN = "LOGIN",
  QUEST_COMPLETED = "QUEST_COMPLETED",
  SOCIAL_TASK = "SOCIAL_TASK",
  EDUCATIONAL_TASK = "EDUCATIONAL_TASK",
}
