import { Types } from "mongoose";
import { UserProgress } from "@models/user.progress.model";
import { LevelRewards } from "@models/level.rewards.model";
import { IUserProgress, SafetyStage } from "@models/interfaces/IUserProgress";
import { ILevelRewards } from "@models/interfaces/ILevelRewards";

export interface CreateUserProgressData {
  userId: Types.ObjectId;
  currentXP?: number;
  currentLevel?: number;
  totalLifetimeXP?: number;
}

export interface UpdateUserProgressData {
  currentXP?: number;
  currentLevel?: number;
  totalLifetimeXP?: number;
  xpMeterVisible?: boolean;
  safetyMeterVisible?: boolean;
  currentStage?: number;
  lastLoginDate?: Date;
  lastQuestCompletionDate?: Date;
  lastSafetyCheck?: Date;
  lastSocialTaskDate?: Date;
  lastEducationalTaskDate?: Date;
}

export class UserProgressRepository {
  // UserProgress operations
  async findByUserId(userId: Types.ObjectId): Promise<IUserProgress | null> {
    return UserProgress.findOne({ userId });
  }

  async createUserProgress(
    data: CreateUserProgressData
  ): Promise<IUserProgress> {
    const userProgress = new UserProgress(data);
    return userProgress.save();
  }

  async findOrCreateUserProgress(
    userId: Types.ObjectId
  ): Promise<IUserProgress> {
    let userProgress = await this.findByUserId(userId);

    if (!userProgress) {
      userProgress = await this.createUserProgress({ userId });
    }

    return userProgress;
  }

  async updateUserProgress(
    userId: Types.ObjectId,
    updateData: UpdateUserProgressData
  ): Promise<IUserProgress | null> {
    return UserProgress.findOneAndUpdate(
      { userId },
      { $set: updateData },
      { new: true, upsert: true }
    );
  }

  async incrementUserXP(
    userId: Types.ObjectId,
    xpAmount: number
  ): Promise<{
    userProgress: IUserProgress;
    leveledUp: boolean;
    newLevel?: number;
  }> {
    const userProgress = await this.findOrCreateUserProgress(userId);

    // Calculate new XP and level
    const newTotalXP = userProgress.currentXP + xpAmount;
    const levelsGained = Math.floor(newTotalXP / 100);
    const newCurrentXP = newTotalXP % 100;
    const newLevel = userProgress.currentLevel + levelsGained;

    // Update user progress
    const updatedProgress = await this.updateUserProgress(userId, {
      currentXP: newCurrentXP,
      currentLevel: newLevel,
      totalLifetimeXP: userProgress.totalLifetimeXP + xpAmount,
    });

    return {
      userProgress: updatedProgress!,
      leveledUp: levelsGained > 0,
      newLevel: levelsGained > 0 ? newLevel : undefined,
    };
  }

  async updateSafetyStage(
    userId: Types.ObjectId,
    stageChange: number
  ): Promise<IUserProgress | null> {
    const userProgress = await this.findOrCreateUserProgress(userId);
    const newStage = Math.max(
      SafetyStage.STAGE_3,
      Math.min(SafetyStage.STAGE_5, userProgress.currentStage + stageChange)
    );

    return this.updateUserProgress(userId, { currentStage: newStage });
  }

  async findUsersForSafetyCheck(): Promise<IUserProgress[]> {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    return UserProgress.find({
      safetyMeterVisible: true,
      lastSafetyCheck: { $lt: yesterday },
    });
  }

  async bulkUpdateSafetyCheck(userIds: Types.ObjectId[]): Promise<void> {
    await UserProgress.updateMany(
      { userId: { $in: userIds } },
      { $set: { lastSafetyCheck: new Date() } }
    );
  }

  // LevelRewards operations
  async findLevelRewards(level: number): Promise<ILevelRewards | null> {
    return LevelRewards.findOne({ level, isActive: true });
  }

  async createLevelReward(
    rewardData: Partial<ILevelRewards>
  ): Promise<ILevelRewards> {
    const levelReward = new LevelRewards(rewardData);
    return levelReward.save();
  }

  async findAllActiveLevelRewards(): Promise<ILevelRewards[]> {
    return LevelRewards.find({ isActive: true }).sort({ level: 1 });
  }

  async updateLevelReward(
    level: number,
    updateData: Partial<ILevelRewards>
  ): Promise<ILevelRewards | null> {
    return LevelRewards.findOneAndUpdate(
      { level },
      { $set: updateData },
      { new: true }
    );
  }
}
