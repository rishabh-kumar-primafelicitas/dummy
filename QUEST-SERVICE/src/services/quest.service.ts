import { Types } from "mongoose";
import { QuestRepository } from "../repositories/quest.repository";
import { executeGraphQLQuery } from "./graphql.service";
import {
  CONFLICTED_USER_PROFILE_QUERY,
  FETCH_CAMPAIGNS_QUERY,
  FETCH_QUESTS_QUERY,
  PARTICIPATE_EMAIL_ADDRESS_TASK_MUTATION,
  USER_TASK_PARTICIPATION_QUERY,
  TASKS_BY_PARENT_ID_QUERY,
  PARTICIPATE_QUIZ_PLAY_TASK_MUTATION,
} from "@utils/graphql.queries";
import { config } from "@config/server.config";
import axios from "axios";
import { UnauthorizedError, InternalServerError, NotFoundError } from "errors";
import { ValidationError } from "errors/validation.error";
import { PrerequisiteService } from "./prerequisite.service";

interface QuizQuestion {
  id: string;
  order: number;
  title: string;
  description: string | null;
  questionType: string;
  options: Array<{
    id: string;
    text: string;
  }>;
  points: number;
  xp: number;
  isAnswered: boolean;
  userAnswer?: string[];
  correctAnswer?: string[];
  isCorrect?: boolean;
  earnedPoints?: number;
  earnedXP?: number;
}

interface QuizDetails {
  id: string;
  title: string;
  description: string | null;
  totalQuestions: number;
  completedQuestions: number;
  correctAnswers: number;
  progress: number;
  isCompleted: boolean;
  totalPoints: number;
  earnedPoints: number;
  totalXP: number;
  earnedXP: number;
}

interface UserResponse {
  status: boolean;
  message: string;
  data: {
    user: {
      lockedUntil: null | string;
      id: string;
      username: string;
      email: string;
      oAuthProvider: null | string;
      oAuthId: null | string;
      roleId: string;
      status: string;
      walletAddress: null | string;
      walletConnected: boolean;
      lastLoginAt: string;
      loginAttempts: number;
      profilePicture: null | string;
      twoFactorEnabled: boolean;
      emailVerified: boolean;
      emailVerificationExpires: null | string;
      passwordResetExpires: null | string;
      createdAt: string;
      updatedAt: string;
      airLyftAuthToken: string;
    };
  };
}

export class QuestService {
  private questRepository: QuestRepository;
  private prerequisiteService: PrerequisiteService;

  constructor() {
    this.questRepository = new QuestRepository();
    this.prerequisiteService = new PrerequisiteService();
  }

  private async refreshUserParticipationData(
    userId: string,
    tentId: string
  ): Promise<void> {
    try {
      // Get tent by ID
      const tent = await this.questRepository.findTentById(
        new Types.ObjectId(tentId)
      );
      if (tent) {
        // Get user's airLyftAuthToken
        const userResponse = await axios.get(
          `${config.services.authServiceUrl}/api/v1/public/me`,
          { headers: { userid: userId } }
        );

        if (userResponse.data?.data?.user?.airLyftAuthToken) {
          // Refresh participation data
          await this.storeUserTaskParticipation(
            userId,
            tent.eventId,
            userResponse.data.data.user.airLyftAuthToken
          );
        }
      }
    } catch (error: any) {
      console.error("Error refreshing participation data:", error);
      // Don't throw - this is background refresh
    }
  }

  async processQuestXP(
    userResponse: any,
    eventId: string,
    taskId: string
  ): Promise<any> {
    try {
      const userId = userResponse.data.data.user.id;

      // Find the quest and tent info for XP processing
      const quest = await this.getQuestByTaskId(taskId);
      const tent = await this.getTentByEventId(eventId);

      if (quest && tent) {
        return await this.handleQuestCompletionWithXP(
          userId,
          quest,
          tent.tentType?.tentType
        );
      }

      return null;
    } catch (xpError: any) {
      console.error("Error processing XP for quest completion:", xpError);
      // Don't fail the whole request if XP processing fails
      return null;
    }
  }

  private isQuestCompletedByUser(
    taskId: string,
    allCompletedTasksByTent: Map<string, Set<string>>
  ): boolean {
    for (const completedTasks of allCompletedTasksByTent.values()) {
      if (completedTasks.has(taskId)) {
        return true;
      }
    }
    return false;
  }

  private async getUserInfo(authToken: string): Promise<{
    userId: string;
    airLyftAuthToken: string;
  }> {
    const userResponse = await axios.get<UserResponse>(
      `${config.services.authServiceUrl}/api/v1/me`,
      {
        headers: {
          Authorization: authToken,
        },
      }
    );

    if (
      !userResponse.data ||
      !userResponse.data.status ||
      !userResponse.data.data?.user?.airLyftAuthToken
    ) {
      throw new UnauthorizedError("Failed to retrieve user information");
    }

    return {
      userId: userResponse.data.data.user.id,
      airLyftAuthToken: userResponse.data.data.user.airLyftAuthToken,
    };
  }

  private async storeUserParticipationForAllTents(
    tents: any[],
    userId: string,
    airLyftAuthToken: string
  ): Promise<void> {
    const participationPromises = tents.map(async (tent: any) => {
      try {
        if (tent.eventId) {
          await this.storeUserTaskParticipation(
            userId,
            tent.eventId,
            airLyftAuthToken
          );
        }
      } catch (error) {
        console.error(
          `Error storing participation for tent ${tent.eventId}:`,
          error
        );
        // Continue processing even if one fails
      }
    });

    // Wait for all participation data to be stored
    await Promise.allSettled(participationPromises);
  }

  private buildCompletedQuestsMap(
    userParticipations: any[]
  ): Map<string, Set<string>> {
    const completedQuestsByTent = new Map<string, Set<string>>();

    userParticipations.forEach((participation: any) => {
      if (participation.eventId) {
        const completedQuests = new Set<string>();
        participation.participations.forEach((p: any) => {
          if (p.status === "VALID" && p.taskId) {
            completedQuests.add(p.taskId);
          }
        });
        completedQuestsByTent.set(participation.eventId, completedQuests);
      }
    });

    return completedQuestsByTent;
  }

  private processTentsWithStatus(
    tents: any[],
    completedQuestsByTent: Map<string, Set<string>>
  ): any[] {
    return tents.map((tent: any) => {
      const completedQuests =
        completedQuestsByTent.get(tent.eventId) || new Set<string>();
      const totalQuests = tent.questIds?.length || 0;

      // Count completed quests for this tent
      const completedQuestCount = this.countCompletedQuests(
        tent,
        completedQuests
      );

      // Check if tent is complete (all quests completed)
      const isCompleted =
        totalQuests > 0 && completedQuestCount === totalQuests;

      // Determine if tent is locked based on tent type and prerequisites
      const isLocked = this.determineTentLockStatus(
        tent,
        completedQuestsByTent,
        tents
      );

      return {
        _id: tent._id,
        tentName: tent.tentName,
        title: tent.title,
        description: tent.description,
        eventId: tent.eventId,
        startTime: tent.startTime,
        endTime: tent.endTime,
        publicLink: tent.publicLink,
        bannerUrl: tent.bannerUrl,
        state: tent.state,
        eventType: tent.eventType,
        visibilityType: tent.visibilityType,
        tentType: tent.tentType,
        summary: tent.summary,
        rewardTitle: tent.rewardTitle,
        rewardSubtitle: tent.rewardSubtitle,
        questCount: totalQuests,
        completedQuestCount,
        isCompleted,
        isLocked,
        createdAt: tent.createdAt,
        updatedAt: tent.updatedAt,
      };
    });
  }

  private countCompletedQuests(
    tent: any,
    completedQuests: Set<string>
  ): number {
    let completedQuestCount = 0;
    if (tent.questIds) {
      tent.questIds.forEach((quest: any) => {
        if (quest.taskId && completedQuests.has(quest.taskId)) {
          completedQuestCount++;
        }
      });
    }
    return completedQuestCount;
  }

  private determineTentLockStatus(
    tent: any,
    completedQuestsByTent: Map<string, Set<string>>,
    allTents: any[]
  ): boolean {
    if (!tent.tentType || !tent.tentType.tentType) {
      return true; // Default to locked if tent type is not defined
    }

    const tentType = tent.tentType.tentType;

    if (tentType === "Social") {
      // Social tent is initially unlocked
      return false;
    } else if (tentType === "Educational") {
      // Educational tent is unlocked after completing Social Quest 1 & 2
      return !this.checkEducationalTentUnlocked(
        completedQuestsByTent,
        allTents
      );
    }

    // Default to locked for unknown tent types
    return true;
  }

  private checkEducationalTentUnlocked(
    completedQuestsByTent: Map<string, Set<string>>,
    tents: any[]
  ): boolean {
    // Find Social tent
    const socialTent = tents.find(
      (tent: any) => tent.tentType?.tentType === "Social"
    );

    if (!socialTent || !socialTent.eventId) {
      return false;
    }

    const socialCompletedQuests =
      completedQuestsByTent.get(socialTent.eventId) || new Set();

    // Get Social tent's first two quests (Quest 1 & Quest 2)
    const socialQuests =
      socialTent.questIds?.sort(
        (a: any, b: any) => (a.order || 0) - (b.order || 0)
      ) || [];

    if (socialQuests.length < 2) {
      return false;
    }

    // Check if both Social Quest 1 and Quest 2 are completed
    const socialQuest1Completed =
      socialQuests[0]?.taskId &&
      socialCompletedQuests.has(socialQuests[0].taskId);
    const socialQuest2Completed =
      socialQuests[1]?.taskId &&
      socialCompletedQuests.has(socialQuests[1].taskId);

    return socialQuest1Completed && socialQuest2Completed;
  }

  private async processDynamicPrerequisites(
    allQuestsByTaskId: Map<string, Types.ObjectId>
  ): Promise<void> {
    const questsWithGuardConfig =
      await this.questRepository.getQuestsWithPrerequisites();

    for (const quest of questsWithGuardConfig) {
      if (quest.guardConfig) {
        try {
          const { prerequisites, condition } =
            await this.prerequisiteService.parseTaskIdRules(
              quest.guardConfig,
              allQuestsByTaskId
            );

          if (prerequisites.length > 0) {
            await this.questRepository.updateQuestDynamicPrerequisites(
              quest._id,
              prerequisites,
              condition
            );
          }
        } catch (error: any) {
          console.error(
            `Error processing prerequisites for quest ${quest._id}:`,
            error.message
          );
        }
      }
    }
  }

  /**
   * Determines if a quest should be stored for cross-campaign prerequisite rules
   * based on enhanced conditions including parentId and __typename validation
   */
  private shouldStoreQuestForCrossCampaignRules(
    task: any,
    tentTypeName: string
  ): boolean {
    // First condition: parentId should be null for all Social and Educational tasks
    if (task.parentId !== null && task.parentId !== undefined) {
      return false;
    }

    // Get the __typename from task.info
    const infoTypeName = task.info?.__typename;

    if (!infoTypeName) {
      return false;
    }

    // Enhanced conditions based on tent type and quest order
    if (tentTypeName === "Social") {
      switch (task.order) {
        case 1:
          // Social_Quest_1 - should have info.__typename = TwitterFollowTaskData
          return infoTypeName === "TwitterFollowTaskData";
        case 2:
          // Social_Quest_2 - should have info.__typename = DiscordJoinTaskData
          return infoTypeName === "DiscordJoinTaskData";
        case 3:
          // Social_Quest_3 - should have info.__typename = NullableTaskData
          return infoTypeName === "NullableTaskData";
        default:
          return false;
      }
    } else if (tentTypeName === "Educational") {
      switch (task.order) {
        case 1:
          // Educational_Quest_1 - should have info.__typename = LinkTaskData
          return infoTypeName === "LinkTaskData";
        case 2:
          // Educational_Quest_2 - should have info.__typename = QuizTaskData
          // and info.questionType should not be a key in the quest
          if (infoTypeName === "QuizTaskData") {
            // Check that questionType is not a key in the quest (parent quiz, not individual question)
            return !task.info.questionType;
          }
          return false;
        default:
          return false;
      }
    }

    return false;
  }

  async syncTentsAndQuests() {
    const projectId = config.airLyft.projectId;

    if (!projectId) {
      throw new InternalServerError("Project ID not configured in environment");
    }

    // Fetch campaigns (tents)
    const campaignVariables = {
      pagination: {
        skip: 0,
        take: 100,
      },
      where: {
        projectId: projectId,
        state: ["ONGOING"],
        visibility: ["PUBLIC"],
      },
    };

    const campaignResponse = await executeGraphQLQuery(
      FETCH_CAMPAIGNS_QUERY,
      campaignVariables,
      false
    );

    if (campaignResponse?.errors) {
      throw new InternalServerError(
        `Failed to fetch campaigns: ${JSON.stringify(campaignResponse.errors)}`
      );
    }

    const campaigns = campaignResponse?.data?.exploreEvents?.data || [];
    const syncResults = {
      tentsCreated: 0,
      tentsUpdated: 0,
      questsCreated: 0,
      questsUpdated: 0,
      errors: [] as string[],
    };

    // Get tent types
    const socialTentType = await this.questRepository.findTentTypeByName(
      "Social"
    );
    const educationalTentType = await this.questRepository.findTentTypeByName(
      "Educational"
    );

    if (!socialTentType || !educationalTentType) {
      throw new InternalServerError(
        "Required tent types (Social/Educational) not found in database"
      );
    }

    // Create a map to track all quests by task ID for prerequisite resolution
    const allQuestsByTaskId = new Map<string, Types.ObjectId>();

    // Store quest references for cross-campaign prerequisite mapping
    const questsByTentAndOrder: Map<string, Types.ObjectId> = new Map();

    // Process each campaign
    for (const campaign of campaigns) {
      try {
        // Check if tent already exists
        let existingTent = await this.questRepository.findTentByEventId(
          campaign.id
        );

        // Determine tent type based on title
        let tentTypeId: Types.ObjectId;
        if (campaign.title.toLowerCase().includes("social")) {
          tentTypeId = socialTentType._id;
        } else if (campaign.title.toLowerCase().includes("educational")) {
          tentTypeId = educationalTentType._id;
        } else {
          // Default to Social if no specific type found
          tentTypeId = socialTentType._id;
        }

        const tentData = {
          tentName: campaign.publicLink || campaign.title,
          title: campaign.title,
          description: campaign.description || null,
          eventId: campaign.id,
          startTime: campaign.startTime ? new Date(campaign.startTime) : null,
          endTime: campaign.endTime ? new Date(campaign.endTime) : null,
          publicLink: campaign.publicLink || null,
          bannerUrl: campaign.bannerUrl || null,
          state: campaign.state || "DRAFT",
          settlementFiles: campaign.settlementFiles || null,
          settledAt: campaign.settledAt ? new Date(campaign.settledAt) : null,
          eventType: campaign.eventType || "CAMPAIGN",
          visibilityType: campaign.visibility || "PUBLIC",
          mode: campaign.mode || null,
          tentType: tentTypeId,
          summary: {
            totalParticipants: campaign.summary?.totalParticipants || 0,
            totalPoints: campaign.summary?.totalPoints || 0,
            totalPointsEarned: campaign.summary?.totalPointsEarned || 0,
            totalTaskParticipation:
              campaign.summary?.totalTaskParticipation || 0,
            totalTasks: campaign.summary?.totalTasks || 0,
            totalXP: campaign.summary?.totalXP || 0,
          },
          rewardTitle: campaign.rewardTitle || null,
          rewardSubtitle: campaign.rewardSubtitle || null,
          ipProtect: campaign.ipProtect || null,
          leaderboard: campaign.leaderboard || "NONE",
          seasonId: campaign.seasonId || null,
          tags: campaign.tags || null,
        };

        if (!existingTent) {
          existingTent = await this.questRepository.createTent(tentData);
          syncResults.tentsCreated++;
        } else {
          // Update existing tent
          Object.assign(existingTent, tentData);
          await existingTent.save();
          syncResults.tentsUpdated++;
        }

        // Fetch and process quests for this tent
        const questVariables = {
          eventId: campaign.id,
        };

        const questResponse = await executeGraphQLQuery(
          FETCH_QUESTS_QUERY,
          questVariables,
          false
        );

        if (questResponse?.data?.pTasks) {
          const questIds: Types.ObjectId[] = [];

          for (const task of questResponse.data.pTasks) {
            try {
              let existingQuest = await this.questRepository.findQuestByTaskId(
                task.id
              );

              const questData = {
                tentId: existingTent._id,
                title: task.title,
                description: task.description || null,
                xpValue: task.xp || 0,
                taskId: task.id,
                order: task.order || 1,
                points: task.points || 0,
                iconUrl: task.iconUrl || null,
                appType: task.appType || null,
                taskType: task.taskType || null,
                parentId: task.parentId || null,
                frequency: task.frequency || "NONE",
                xp: task.xp || 0,
                appKey: task.appKey || null,
                taskKey: task.taskKey || null,
                verify: task.verify || "AUTO",
                subTaskStats: {
                  count: task.subTaskStats?.count || null,
                  totalPoints: task.subTaskStats?.totalPoints || null,
                  totalXp: task.subTaskStats?.totalXp || null,
                },
                participantCount: task.participantCount || 0,
                guardConfig: task.guardConfig || null,
                info: task.info || null,
                // Initialize prerequisites - will be set after all quests are processed
                dynamicPrerequisites: [],
                customPrerequisites: [],
                prerequisiteCondition: task.guardConfig?.condition || "AND",
              };

              if (!existingQuest) {
                existingQuest = await this.questRepository.createQuest(
                  questData
                );
                syncResults.questsCreated++;
              } else {
                // Update existing quest
                Object.assign(existingQuest, questData);
                await existingQuest.save();
                syncResults.questsUpdated++;
              }

              // Store in maps for prerequisite processing
              allQuestsByTaskId.set(task.id, existingQuest._id);

              // Store quest reference for cross-campaign prerequisite mapping
              const tentTypeName = tentTypeId.equals(socialTentType._id)
                ? "Social"
                : "Educational";

              // Enhanced logic for Social and Educational quest classification
              const shouldStoreQuest =
                this.shouldStoreQuestForCrossCampaignRules(task, tentTypeName);

              if (shouldStoreQuest) {
                const questKey = `${tentTypeName}_Quest_${task.order || 1}`;
                questsByTentAndOrder.set(questKey, existingQuest._id);
              }

              questIds.push(existingQuest._id);
            } catch (questError: any) {
              syncResults.errors.push(
                `Error processing quest ${task.id}: ${questError.message}`
              );
            }
          }

          // Update tent with quest references
          if (questIds.length > 0) {
            existingTent.questIds = questIds;
            await existingTent.save();
          }
        }
      } catch (tentError: any) {
        syncResults.errors.push(
          `Error processing tent ${campaign.id}: ${tentError.message}`
        );
      }
    }

    // Now process dynamic prerequisites from guardConfig
    await this.processDynamicPrerequisites(allQuestsByTaskId);

    // Set custom cross-campaign prerequisites
    await this.prerequisiteService.setCustomCrossCampaignRules(
      questsByTentAndOrder
    );

    return syncResults;
  }

  async getAllTentsWithQuests() {
    return await this.questRepository.getAllTents();
  }

  async storeUserTaskParticipation(
    userId: string,
    eventId: string,
    airLyftAuthToken: string
  ): Promise<{
    message: string;
    stored: boolean;
    data: any;
    stats: {
      totalParticipations: number;
      completedTasksCount: number;
      totalPoints: number;
      totalXp: number;
    };
    xpResults?: any[];
  }> {
    // 1) Fetch raw participation data from external API
    const response = await executeGraphQLQuery(
      USER_TASK_PARTICIPATION_QUERY,
      { eventId },
      true,
      true,
      airLyftAuthToken
    );

    if (response?.errors) {
      throw new InternalServerError(
        `Failed to fetch participation: ${JSON.stringify(response.errors)}`
      );
    }

    const rawParticipations: any[] = response.data?.userTaskParticipation || [];

    // 2) Load related tent and quests to build questId map
    const tent = await this.questRepository.findTentByEventId(eventId);
    const quests = await this.questRepository.findQuestsByEventId(eventId);
    const questMap = new Map<string, Types.ObjectId>(
      quests.map((q) => [q.taskId, q._id])
    );

    // 3) Define a typed Participation
    interface Participation {
      taskId: string;
      questId: Types.ObjectId | null;
      points: number;
      xp: number;
      status: string;
      providerId: string | null;
      participatedAt: Date;
      taskData: any;
    }

    // 4) Build the typed array
    const participations: Participation[] = rawParticipations.map(
      (part: any) => ({
        taskId: part.taskId,
        questId: questMap.get(part.taskId) ?? null,
        points: part.points ?? 0,
        xp: part.xp ?? 0,
        status: part.status,
        providerId: part.providerId ?? null,
        participatedAt: new Date(part.createdAt),
        taskData: { task: part.task, info: part.info },
      })
    );

    // 5) Compute summary stats with typed reduces
    const totalPoints = participations.reduce<number>(
      (sum: number, p: Participation) => sum + p.points,
      0
    );
    const totalXp = participations.reduce<number>(
      (sum: number, p: Participation) => sum + p.xp,
      0
    );
    const completedTasksCount = participations.filter(
      (p: Participation) => p.status === "VALID"
    ).length;

    // 6) Upsert into your collection
    const result =
      await this.questRepository.createOrUpdateUserTaskParticipation({
        userId,
        eventId,
        tentId: tent?._id?.toString(),
        participations,
      });

    // Process XP for newly completed quests
    // const xpResults = [];
    // for (const participation of participations) {
    //   if (participation.status === "VALID" && participation.questId) {
    //     try {
    //       const quest = await this.questRepository.findQuestById(
    //         participation.questId
    //       );
    //       if (quest) {
    //         const tentTypeObj = await this.questRepository.findTentByEventId(
    //           eventId
    //         );
    //         const tentTypeName =
    //           (tentTypeObj?.tentType as any)?.tentType || "Unknown";

    //         const xpResult = await this.handleQuestCompletionWithXP(
    //           userId,
    //           quest,
    //           tentTypeName
    //         );
    //         xpResults.push(xpResult);
    //       }
    //     } catch (error: any) {
    //       console.error(
    //         `Error processing XP for quest ${participation.taskId}:`,
    //         error
    //       );
    //     }
    //   }
    // }

    // 7) Return a structured response
    return {
      message: "User task participation stored successfully",
      stored: true,
      data: result,
      stats: {
        totalParticipations: participations.length,
        completedTasksCount,
        totalPoints,
        totalXp,
      },
      // xpResults,
    };
  }

  async getUserTaskParticipationFromDB(userId: string, eventId: string) {
    return await this.questRepository.getUserTaskParticipation(userId, eventId);
  }

  async getUserAllParticipations(userId: string) {
    return await this.questRepository.getUserAllParticipations(userId);
  }

  async fetchCampaignsWithStatus(authToken: string): Promise<{
    tents: any[];
    message: string;
  }> {
    // Fetch user details to get airLyftAuthToken and userId
    const userResponse = await axios.get<UserResponse>(
      `${config.services.authServiceUrl}/api/v1/me`,
      {
        headers: {
          Authorization: authToken,
        },
      }
    );

    if (
      !userResponse.data ||
      !userResponse.data.status ||
      !userResponse.data.data?.user?.airLyftAuthToken
    ) {
      throw new InternalServerError("Failed to retrieve user airLyftAuthToken");
    }

    const airLyftAuthToken = userResponse.data.data.user.airLyftAuthToken;
    const userId = userResponse.data.data.user.id;

    // Fetch all tents from database
    const tents = await this.getAllTentsWithQuests();

    if (!tents || tents.length === 0) {
      return {
        tents: [],
        message: "No tents found",
      };
    }

    // Store user task participation for each tent before processing
    await this.storeUserParticipationForAllTents(
      tents,
      userId,
      airLyftAuthToken
    );

    // Get user's stored participation data for all tents
    const userParticipations = await this.getUserAllParticipations(userId);

    // Create a map of completed quests by tent
    const completedQuestsByTent =
      this.buildCompletedQuestsMap(userParticipations);

    // Process tents with completion and lock status
    const tentsWithStatus = this.processTentsWithStatus(
      tents,
      completedQuestsByTent
    );

    return {
      tents: tentsWithStatus,
      message: "Tents fetched successfully",
    };
  }

  async fetchQuestsWithStatus(
    eventId: string,
    authToken: string
  ): Promise<{ quests: any[]; message: string }> {
    const userInfo = await this.getUserInfo(authToken);
    await this.storeUserTaskParticipation(
      userInfo.userId,
      eventId,
      userInfo.airLyftAuthToken
    );

    const tent = await this.questRepository.findTentByEventId(eventId);
    if (!tent) {
      throw new NotFoundError("Tent not found");
    }

    const dbQuests = await this.questRepository.getQuestsByTentId(
      tent._id.toString()
    );

    // Filter out quiz questions (only show parent quizzes)
    const parentQuests = dbQuests.filter(
      (quest) => quest.parentId === null || quest.parentId === undefined
    );

    const sortedQuests = parentQuests.sort(
      (a: any, b: any) => (a.order || 0) - (b.order || 0)
    );

    const userParticipations = await this.getUserAllParticipations(
      userInfo.userId
    );
    const allCompletedTasksByTent =
      this.buildCompletedQuestsMap(userParticipations);
    const questTaskIdMap =
      await this.questRepository.createQuestIdToTaskIdMap();

    const questsWithStatus = await Promise.all(
      sortedQuests.map(async (quest: any) => {
        let isCompleted = false;

        // For quiz tasks, check if all questions are completed
        if (this.isQuizParent(quest)) {
          const progress = await this.questRepository.getQuizProgressByUserId(
            userInfo.userId,
            quest.taskId
          );
          isCompleted = progress.isCompleted;
        } else {
          // For regular tasks, use existing logic
          isCompleted = this.isQuestCompletedByUser(
            quest.taskId,
            allCompletedTasksByTent
          );
        }

        const isLocked = this.prerequisiteService.isQuestLocked(
          quest,
          allCompletedTasksByTent,
          questTaskIdMap
        );

        return {
          ...quest.toObject(),
          isCompleted,
          isLocked,
          questType: this.isQuizParent(quest) ? "QUIZ" : "REGULAR",
        };
      })
    );

    return {
      quests: questsWithStatus,
      message: "Quests fetched successfully",
    };
  }

  async setCustomPrerequisites(
    questId: Types.ObjectId,
    prerequisites: Types.ObjectId[]
  ): Promise<{ success: boolean; message: string; data?: any }> {
    const validation =
      await this.prerequisiteService.validateCustomPrerequisites(
        questId,
        prerequisites
      );

    if (!validation.valid) {
      throw new ValidationError(
        { prerequisites: validation.error || "Invalid prerequisites" },
        "Prerequisite validation failed"
      );
    }

    await this.prerequisiteService.setCustomPrerequisites(
      questId,
      prerequisites
    );

    return {
      success: true,
      message: "Custom prerequisites set successfully",
    };
  }

  async setPredefinedCrossCampaignRules(): Promise<{
    success: boolean;
    message: string;
  }> {
    const tents = await this.getAllTentsWithQuests();
    const questsByTentAndOrder = new Map<string, Types.ObjectId>();

    for (const tent of tents) {
      // Fix: Add type check and assertion for populated tentType
      if (
        tent.tentType &&
        tent.questIds &&
        typeof tent.tentType === "object" &&
        "tentType" in tent.tentType
      ) {
        const tentTypeName = (tent.tentType as any).tentType;
        const sortedQuests = tent.questIds.sort(
          (a: any, b: any) => (a.order || 0) - (b.order || 0)
        );

        sortedQuests.forEach((quest: any, index: number) => {
          const questKey = `${tentTypeName}_Quest_${index + 1}`;
          questsByTentAndOrder.set(questKey, quest._id);
        });
      }
    }

    await this.prerequisiteService.setCustomCrossCampaignRules(
      questsByTentAndOrder
    );

    return {
      success: true,
      message: "Predefined cross-campaign rules set successfully",
    };
  }

  async getQuestById(questId: Types.ObjectId): Promise<any> {
    return await this.questRepository.findQuestById(questId);
  }

  async getAllQuestsWithPrerequisites(): Promise<any[]> {
    return await this.questRepository.getQuestsWithPrerequisites();
  }

  async validatePrerequisites(
    questId: Types.ObjectId,
    prerequisites: Types.ObjectId[]
  ): Promise<{ valid: boolean; error?: string }> {
    return await this.prerequisiteService.validateCustomPrerequisites(
      questId,
      prerequisites
    );
  }

  async sendEmailOTP(
    email: string,
    authToken: string,
    clientIp?: string
  ): Promise<{
    message: string;
    success: boolean;
    data?: any;
  }> {
    // Get user info to retrieve airLyftAuthToken
    const { airLyftAuthToken } = await this.getUserInfo(authToken);

    // Make request to AirLyft API with client IP
    const headers: any = {
      Authorization: `Bearer ${airLyftAuthToken}`,
      "api-key": config.airLyft.apiKey,
      "Content-Type": "application/json",
    };

    // Add X-Forwarded-For header if clientIp is provided
    if (clientIp) {
      headers["X-Forwarded-For"] = clientIp;
    }

    const response = await axios.post(
      `${config.airLyft.restEndpoint}/auth/email/link-account?projectId=${config.airLyft.projectId}`,
      { email },
      { headers }
    );

    return {
      message: "OTP sent successfully",
      success: true,
      data: response.data,
    };
  }

  async verifyEmailOTP(
    email: string,
    code: number,
    authToken: string,
    clientIp?: string
  ): Promise<{
    message: string;
    success: boolean;
    data?: any;
  }> {
    // Get user info to retrieve airLyftAuthToken
    const { airLyftAuthToken } = await this.getUserInfo(authToken);

    // Verify OTP with AirLyft API
    const headers: any = {
      Authorization: `Bearer ${airLyftAuthToken}`,
      "api-key": config.airLyft.apiKey,
      "Content-Type": "application/json",
    };

    // Add X-Forwarded-For header if clientIp is provided
    if (clientIp) {
      headers["X-Forwarded-For"] = clientIp;
    }

    const verifyResponse = await axios.post(
      `${config.airLyft.restEndpoint}/auth/email/verify-link-account?projectId=${config.airLyft.projectId}`,
      { email, code },
      { headers }
    );

    // Check for conflicted user profile
    const conflictCheckResponse = await executeGraphQLQuery(
      CONFLICTED_USER_PROFILE_QUERY,
      {
        provider: "MAGIC_LINK",
        providerId: email,
      },
      true,
      true,
      airLyftAuthToken,
      clientIp
    );

    console.log("Conflict check response:", conflictCheckResponse);

    // If conflictedUserProfile is not null, there's a conflict
    if (conflictCheckResponse?.data?.conflictedUserProfile !== null) {
      throw new ValidationError(
        { conflict: "Account linking conflict detected" },
        "Account linking conflict detected"
      );
    }

    return {
      message: "OTP verified successfully",
      success: true,
      data: verifyResponse.data,
    };
  }

  async participateEmailAddressTask(
    eventId: string,
    taskId: string,
    providerId: string,
    authToken: string,
    clientIp?: string
  ): Promise<{
    message: string;
    success: boolean;
    data?: any;
  }> {
    // Get user info to retrieve airLyftAuthToken
    const userResponse = await this.getUserInfo(authToken);

    // Execute the GraphQL mutation
    const response = await executeGraphQLQuery(
      PARTICIPATE_EMAIL_ADDRESS_TASK_MUTATION,
      {
        eventId,
        taskId,
        providerId,
      },
      true,
      true,
      userResponse.airLyftAuthToken,
      clientIp
    );

    if (response?.errors) {
      throw new InternalServerError(
        `GraphQL errors: ${JSON.stringify(response.errors)}`
      );
    }

    const participationResult = response?.data?.participateEmailAddressTask;

    if (!participationResult) {
      throw new InternalServerError(
        "No participation result returned from API"
      );
    }

    // Process XP
    const xpResult = await this.processQuestXP(userResponse, eventId, taskId);

    return {
      message: "Email address task participation successful",
      success: true,
      data: {
        participation: participationResult,
        xpResult: xpResult,
      },
    };
  }

  async getQuestByTaskId(taskId: string): Promise<any> {
    return await this.questRepository.findQuestByTaskId(taskId);
  }

  async getTentByEventId(eventId: string): Promise<any> {
    return await this.questRepository.findTentByEventId(eventId);
  }

  async handleQuestCompletionWithXP(
    userId: string,
    quest: any,
    tentType?: string
  ): Promise<any> {
    try {
      // Store participation data
      await this.refreshUserParticipationData(userId, quest.tentId);

      const xpServiceUrl = config.services.xpServiceUrl;
      const response = await axios.post(
        `${xpServiceUrl}/api/v1/quest-completion`,
        {
          userId,
          quest,
          tentType,
        }
      );

      const xpResult = response.data.data;

      // Check if meters should become visible
      await axios.post(`${xpServiceUrl}/api/v1/check-meter-visibility`, {
        userId,
      });

      return {
        ...xpResult,
        questId: quest.taskId,
        tentType,
      };
    } catch (error: any) {
      console.error("Error handling quest completion with XP:", error);
      throw new InternalServerError(
        `Failed to process quest completion: ${error.message}`
      );
    }
  }

  async getCompletedQuestsCount(userId: string): Promise<number> {
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
      console.error(
        `Error getting completed quests count for user ${userId}:`,
        error
      );
      return 0;
    }
  }

  async fetchQuizDetails(
    quizTaskId: string,
    authToken: string
  ): Promise<{
    quiz: QuizDetails;
    questions: QuizQuestion[];
    message: string;
  }> {
    // Get user info
    const userInfo = await this.getUserInfo(authToken);

    // Find quiz in database
    const quiz = await this.questRepository.findQuizByTaskId(quizTaskId);
    if (!quiz) {
      throw new NotFoundError("Quiz not found");
    }

    // Get quiz questions from AirLyft
    const questionsResponse = await executeGraphQLQuery(
      TASKS_BY_PARENT_ID_QUERY,
      { parentId: quizTaskId },
      false
    );

    if (questionsResponse?.errors) {
      throw new InternalServerError(
        `Failed to fetch quiz questions: ${JSON.stringify(
          questionsResponse.errors
        )}`
      );
    }

    const airLyftQuestions = questionsResponse?.data?.pTasksByParentId || [];

    // Get user's participation status
    const participation = await this.questRepository.getQuizParticipationStatus(
      userInfo.userId,
      quizTaskId
    );

    // Get quiz progress
    const progress = await this.questRepository.getQuizProgressByUserId(
      userInfo.userId,
      quizTaskId
    );

    // Format questions with user progress - Fixed typing
    const questionsWithProgress: QuizQuestion[] = airLyftQuestions.map(
      (question: any) => {
        const userParticipation = participation?.participations.find(
          (p: any) => p.taskId === question.id
        );

        // Create base question object with proper typing
        const formattedQuestion: QuizQuestion = {
          id: question.id,
          order: question.order,
          title: question.title,
          description: question.description,
          questionType: question.info?.questionType,
          options:
            question.info?.options?.map((option: any) => ({
              id: option.id,
              text: option.text,
              // Deliberately exclude isCorrect to hide answers
            })) || [],
          points: question.points || 0,
          xp: question.xp || 0,
          isAnswered: !!userParticipation,
        };

        // Add answer details only if question was answered
        if (userParticipation) {
          formattedQuestion.userAnswer = userParticipation.answers || [];
          formattedQuestion.correctAnswer =
            userParticipation.correctAnswers || [];
          formattedQuestion.isCorrect = userParticipation.status === "VALID";
          formattedQuestion.earnedPoints = userParticipation.points || 0;
          formattedQuestion.earnedXP = userParticipation.xp || 0;
        }

        return formattedQuestion;
      }
    );

    // Format quiz details with proper typing
    const quizDetails: QuizDetails = {
      id: quiz.taskId,
      title: quiz.title,
      description: quiz.description,
      totalQuestions: progress.totalQuestions,
      completedQuestions: progress.answeredQuestions,
      correctAnswers: progress.correctAnswers,
      progress: Math.round(progress.progress),
      isCompleted: progress.isCompleted,
      totalPoints: progress.totalPoints,
      earnedPoints: progress.earnedPoints,
      totalXP: progress.totalXP,
      earnedXP: progress.earnedXP,
    };

    return {
      quiz: quizDetails,
      questions: questionsWithProgress,
      message: "Quiz details fetched successfully",
    };
  }

  async submitQuestionAnswer(
    quizTaskId: string,
    questionTaskId: string,
    answers: string[],
    eventId: string,
    authToken: string,
    clientIp?: string
  ): Promise<{
    questionId: string;
    userAnswers: string[];
    correctAnswers: string[];
    isCorrect: boolean;
    pointsEarned: number;
    xpEarned: number;
    progress: {
      completedQuestions: number;
      totalQuestions: number;
      percentage: number;
      isQuizCompleted: boolean;
    };
    airLyftResponse: any;
    xpResult?: any;
    message: string;
  }> {
    // Get user info
    const userInfo = await this.getUserInfo(authToken);

    // Validate quiz exists
    const quiz = await this.questRepository.findQuizByTaskId(quizTaskId);
    if (!quiz) {
      throw new NotFoundError("Quiz not found");
    }

    // Validate question exists and belongs to quiz
    const question = await this.questRepository.findQuestionByTaskId(
      questionTaskId
    );
    if (!question || question.parentId !== quizTaskId) {
      throw new ValidationError(
        { questionId: "Question not found or doesn't belong to this quiz" },
        "Invalid question"
      );
    }

    // Check if question already answered
    const existingParticipation =
      await this.questRepository.getQuizParticipationStatus(
        userInfo.userId,
        quizTaskId
      );

    const alreadyAnswered = existingParticipation?.participations.some(
      (p: any) => p.taskId === questionTaskId
    );

    if (alreadyAnswered) {
      throw new ValidationError(
        { questionId: "Question already answered" },
        "Question already answered"
      );
    }

    // Submit answer to AirLyft
    const airLyftResponse = await executeGraphQLQuery(
      PARTICIPATE_QUIZ_PLAY_TASK_MUTATION,
      {
        eventId,
        taskId: questionTaskId,
        data: { answers },
      },
      true,
      true,
      userInfo.airLyftAuthToken,
      clientIp
    );

    if (airLyftResponse?.errors) {
      throw new InternalServerError(
        `Failed to submit answer to AirLyft: ${JSON.stringify(
          airLyftResponse.errors
        )}`
      );
    }

    const participationResult = airLyftResponse?.data?.participateQuizPlayTask;
    if (!participationResult) {
      throw new InternalServerError("No participation result from AirLyft");
    }

    const correctAnswers = participationResult.correctAnswers || [];
    const pointsEarned = participationResult.points || 0;
    const xpEarned = participationResult.xp || 0;
    const isCorrect = pointsEarned > 0;
    const airLyftParticipationId =
      participationResult.insertResult?.identifiers?.[0]?.id || "";

    // Store participation in local database
    await this.questRepository.updateQuestionParticipation(
      userInfo.userId,
      eventId,
      {
        taskId: questionTaskId,
        questId: question._id,
        quizParentId: quizTaskId,
        answers,
        correctAnswers,
        isCorrect,
        points: pointsEarned,
        xp: xpEarned,
        status: isCorrect ? "VALID" : "INVALID",
        airLyftParticipationId,
        participatedAt: new Date(),
      }
    );

    // Process XP if question answered correctly
    let xpResult = null;
    if (isCorrect && xpEarned > 0) {
      try {
        const tent = await this.getTentByEventId(eventId);
        xpResult = await this.processQuestXP(
          { data: { data: { user: { id: userInfo.userId } } } },
          eventId,
          questionTaskId
        );
      } catch (xpError: any) {
        console.error("Error processing XP for question:", xpError);
        // Continue even if XP processing fails
      }
    }

    // Get updated progress
    const updatedProgress = await this.questRepository.getQuizProgressByUserId(
      userInfo.userId,
      quizTaskId
    );

    // Check if quiz is now complete and process bonus XP
    if (updatedProgress.isCompleted && !existingParticipation) {
      try {
        // Process quiz completion XP
        await this.processQuestXP(
          { data: { data: { user: { id: userInfo.userId } } } },
          eventId,
          quizTaskId
        );
      } catch (xpError: any) {
        console.error("Error processing quiz completion XP:", xpError);
      }
    }

    return {
      questionId: questionTaskId,
      userAnswers: answers,
      correctAnswers,
      isCorrect,
      pointsEarned,
      xpEarned,
      progress: {
        completedQuestions: updatedProgress.answeredQuestions,
        totalQuestions: updatedProgress.totalQuestions,
        percentage: Math.round(updatedProgress.progress),
        isQuizCompleted: updatedProgress.isCompleted,
      },
      airLyftResponse: participationResult,
      xpResult,
      message: isCorrect
        ? "Correct answer!"
        : "Incorrect answer. Try again next time!",
    };
  }

  // Helper method to check if a quest is a quiz parent
  isQuizParent(quest: any): boolean {
    return (
      quest.taskType === "QUIZ_PLAY" &&
      (quest.parentId === null || quest.parentId === undefined)
    );
  }

  // Helper method to check if a quest is a quiz question
  isQuizQuestion(quest: any): boolean {
    return quest.taskType === "QUIZ_PLAY" && quest.parentId !== null;
  }
}
