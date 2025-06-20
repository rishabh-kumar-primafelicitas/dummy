import { Types } from "mongoose";
import { UserProgressRepository } from "@repositories/user.progress.repository";
import { QuestRepository } from "@repositories/quest.repository";
import { IUserProgress, ActivityType } from "@models/interfaces/IUserProgress";
import { ILevelRewards, RewardType } from "@models/interfaces/ILevelRewards";
import { logger } from "loggers/logger";

export interface UserProgressResponse {
  xpMeter: {
    visible: boolean;
    currentXP: number;
    currentLevel: number;
    totalLifetimeXP: number;
    levelRewards: ILevelRewards | null;
  };
  safetyMeter: {
    visible: boolean;
    currentStage: number;
    xpBonus: number;
  };
}

export interface XPUpdateResult {
  totalXPGained: number;
  stageBonus: number;
  leveledUp: boolean;
  newLevel?: number;
  userProgress: IUserProgress;
}

export class UserProgressService {
  private userProgressRepository: UserProgressRepository;
  private questRepository: QuestRepository;

  constructor() {
    this.userProgressRepository = new UserProgressRepository();
    this.questRepository = new QuestRepository();
  }

  async getUserProgress(userId: string): Promise<UserProgressResponse> {
    const userObjectId = new Types.ObjectId(userId);
    const userProgress =
      await this.userProgressRepository.findOrCreateUserProgress(userObjectId);
    const levelRewards = await this.userProgressRepository.findLevelRewards(
      userProgress.currentLevel
    );

    // Use stage-adjusted XP instead of raw currentXP
    const currentXPWithStage = userProgress.getCurrentXPWithStage();

    return {
      xpMeter: {
        visible: userProgress.xpMeterVisible,
        currentXP: currentXPWithStage,
        currentLevel: userProgress.currentLevel,
        totalLifetimeXP: userProgress.totalLifetimeXP,
        levelRewards,
      },
      safetyMeter: {
        visible: userProgress.safetyMeterVisible,
        currentStage: userProgress.currentStage,
        xpBonus: userProgress.calculateStageBonus(0),
      },
    };
  }

  async updateUserActivity(
    userId: string,
    activityType: ActivityType,
    questData?: any
  ): Promise<void> {
    const userObjectId = new Types.ObjectId(userId);
    const updateData: any = {};

    switch (activityType) {
      case ActivityType.LOGIN:
        updateData.lastLoginDate = new Date();
        break;

      case ActivityType.QUEST_COMPLETED:
        updateData.lastQuestCompletionDate = new Date();

        // Update specific task dates based on tent type
        if (questData?.tentType === "Social") {
          updateData.lastSocialTaskDate = new Date();
        } else if (questData?.tentType === "Educational") {
          updateData.lastEducationalTaskDate = new Date();
        }
        break;

      case ActivityType.SOCIAL_TASK:
        updateData.lastSocialTaskDate = new Date();
        break;

      case ActivityType.EDUCATIONAL_TASK:
        updateData.lastEducationalTaskDate = new Date();
        break;
    }

    await this.userProgressRepository.updateUserProgress(
      userObjectId,
      updateData
    );
  }

  async processQuestCompletion(
    userId: string,
    quest: any,
    tentType?: string
  ): Promise<XPUpdateResult> {
    const userObjectId = new Types.ObjectId(userId);
    const baseXP = quest.xp || 0;

    // Get current user progress
    const userProgress =
      await this.userProgressRepository.findOrCreateUserProgress(userObjectId);

    // Only apply stage bonus if safety meter is visible
    const stageBonus = userProgress.safetyMeterVisible
      ? userProgress.calculateStageBonus(baseXP)
      : 0;
    const totalXP = baseXP + stageBonus;

    // Update XP and check for level up
    const xpResult = await this.userProgressRepository.incrementUserXP(
      userObjectId,
      totalXP
    );

    // Only update safety stage if meter is visible
    if (userProgress.safetyMeterVisible) {
      await this.userProgressRepository.updateSafetyStage(userObjectId, 1);
    }

    // Update activity tracking
    await this.updateUserActivity(userId, ActivityType.QUEST_COMPLETED, {
      tentType,
    });

    return {
      totalXPGained: totalXP,
      stageBonus,
      leveledUp: xpResult.leveledUp,
      newLevel: xpResult.newLevel,
      userProgress: xpResult.userProgress,
    };
  }

  async checkMeterVisibility(userId: string): Promise<void> {
    const userObjectId = new Types.ObjectId(userId);
    const userProgress =
      await this.userProgressRepository.findOrCreateUserProgress(userObjectId);

    // Get user's completed quests count from stored participation data
    const completedQuestsCount = await this.getCompletedQuestsCount(userId);

    const updates: any = {};

    // XP Meter visible after Quest 1
    if (completedQuestsCount >= 1 && !userProgress.xpMeterVisible) {
      updates.xpMeterVisible = true;
      logger.info(`XP Meter unlocked for user ${userId} after Quest 1`);
    }

    // Safety Meter visible after Quest 2
    if (completedQuestsCount >= 2 && !userProgress.safetyMeterVisible) {
      updates.safetyMeterVisible = true;
      logger.info(`Safety Meter unlocked for user ${userId} after Quest 2`);
    }

    if (Object.keys(updates).length > 0) {
      await this.userProgressRepository.updateUserProgress(
        userObjectId,
        updates
      );
    }
  }

  private async getCompletedQuestsCount(userId: string): Promise<number> {
    try {
      const userParticipations =
        await this.questRepository.getUserAllParticipations(userId);

      let totalCompletedQuests = 0;
      userParticipations.forEach((participation: any) => {
        const completedInThisTent = participation.participations.filter(
          (p: any) => p.status === "VALID"
        ).length;
        totalCompletedQuests += completedInThisTent;
      });

      return totalCompletedQuests;
    } catch (error: any) {
      logger.error(
        `Error getting completed quests count for user ${userId}:`,
        error
      );
      return 0;
    }
  }

  async processDailySafetyMeterCheck(): Promise<{
    usersChecked: number;
    usersDegraded: number;
    errors: string[];
  }> {
    const result = {
      usersChecked: 0,
      usersDegraded: 0,
      errors: [] as string[],
    };

    try {
      const usersToCheck =
        await this.userProgressRepository.findUsersForSafetyCheck();
      result.usersChecked = usersToCheck.length;

      const usersDegraded: Types.ObjectId[] = [];
      const usersToUpdate: Types.ObjectId[] = [];

      for (const userProgress of usersToCheck) {
        try {
          if (userProgress.shouldDegrade()) {
            // Degrade stage (-1, minimum 3)
            await this.userProgressRepository.updateSafetyStage(
              userProgress.userId,
              -1
            );
            usersDegraded.push(userProgress.userId);
            result.usersDegraded++;

            logger.info(
              `Safety meter degraded for user ${userProgress.userId}`
            );
          }

          usersToUpdate.push(userProgress.userId);
        } catch (error: any) {
          result.errors.push(
            `Error processing user ${userProgress.userId}: ${error.message}`
          );
        }
      }

      // Bulk update safety check timestamp
      if (usersToUpdate.length > 0) {
        await this.userProgressRepository.bulkUpdateSafetyCheck(usersToUpdate);
      }

      logger.info(`Daily safety meter check completed`, {
        usersChecked: result.usersChecked,
        usersDegraded: result.usersDegraded,
        errorsCount: result.errors.length,
      });
    } catch (error: any) {
      logger.error("Error in daily safety meter check:", error);
      result.errors.push(`Global error: ${error.message}`);
    }

    return result;
  }

  async initializeLevelRewards(): Promise<void> {
    const defaultRewards: Partial<ILevelRewards>[] = [
      {
        level: 1,
        rewardType: RewardType.MYSTERY_BOX, // Use enum value
        mysteryBoxCount: 1,
        multiplierValue: 1, // Provide default value
        description: "Welcome mystery box",
      },
      {
        level: 2,
        rewardType: RewardType.MULTIPLIER, // Use enum value
        mysteryBoxCount: 0, // Provide default value
        multiplierValue: 1.1,
        description: "10% XP boost",
      },
      {
        level: 3,
        rewardType: RewardType.BOTH, // Use enum value
        mysteryBoxCount: 1,
        multiplierValue: 1.15,
        description: "Mystery box + 15% XP boost",
      },
      {
        level: 5,
        rewardType: RewardType.BOTH, // Use enum value
        mysteryBoxCount: 2,
        multiplierValue: 1.2,
        description: "2 Mystery boxes + 20% XP boost",
      },
      {
        level: 10,
        rewardType: RewardType.BOTH, // Use enum value
        mysteryBoxCount: 3,
        multiplierValue: 1.5,
        description: "3 Mystery boxes + 50% XP boost",
      },
    ];

    for (const reward of defaultRewards) {
      const existing = await this.userProgressRepository.findLevelRewards(
        reward.level!
      );
      if (!existing) {
        await this.userProgressRepository.createLevelReward(reward);
        logger.info(`Created level reward for level ${reward.level}`);
      }
    }
  }
}
