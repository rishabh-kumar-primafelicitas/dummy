import { Types } from "mongoose";
import { QuestRepository } from "../repositories/quest.repository";
import { executeGraphQLQuery } from "./graphql.service";
import {
  CONFLICTED_USER_PROFILE_QUERY,
  FETCH_CAMPAIGNS_QUERY,
  FETCH_QUESTS_QUERY,
  PARTICIPATE_EMAIL_ADDRESS_TASK_MUTATION,
  USER_TASK_PARTICIPATION_QUERY,
} from "@utils/graphql.queries";
import { config } from "@config/server.config";
import axios from "axios";
import { UnauthorizedError } from "@utils/errors";

interface UserResponse {
  status: boolean;
  message: string;
  data: {
    user: {
      lockedUntil: null | string;
      _id: string;
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

  constructor() {
    this.questRepository = new QuestRepository();
  }

  // async syncTentsAndQuests() {
  //   try {
  //     const projectId = process.env.AIRLYFT_PROJECT_ID;

  //     if (!projectId) {
  //       throw new Error("Project ID not configured in environment");
  //     }

  //     // Fetch campaigns (tents)
  //     const campaignVariables = {
  //       pagination: {
  //         skip: 0,
  //         take: 100,
  //       },
  //       where: {
  //         projectId: projectId,
  //         state: ["ONGOING"],
  //         visibility: ["PUBLIC"],
  //       },
  //     };

  //     const campaignResponse = await executeGraphQLQuery(
  //       FETCH_CAMPAIGNS_QUERY,
  //       campaignVariables,
  //       false
  //     );

  //     if (campaignResponse?.errors) {
  //       throw new Error(
  //         `Failed to fetch campaigns: ${campaignResponse.errors}`
  //       );
  //     }

  //     const campaigns = campaignResponse?.data?.exploreEvents?.data || [];
  //     const syncResults = {
  //       tentsCreated: 0,
  //       tentsUpdated: 0,
  //       questsCreated: 0,
  //       questsUpdated: 0,
  //       errors: [] as string[],
  //     };

  //     // Process each campaign
  //     for (const campaign of campaigns) {
  //       try {
  //         // Check if tent already exists
  //         let existingTent = await this.questRepository.findTentByAirlyftId(
  //           campaign.id
  //         );

  //         const tentData = {
  //           tentName: campaign.publicLink || campaign.title,
  //           title: campaign.title,
  //           description: campaign.description || null,
  //           airlyftId: campaign.id,
  //           startTime: campaign.startTime ? new Date(campaign.startTime) : null,
  //           endTime: campaign.endTime ? new Date(campaign.endTime) : null,
  //           publicLink: campaign.publicLink || null,
  //           bannerUrl: campaign.bannerUrl || null,
  //           state: campaign.state || "DRAFT",
  //           settlementFiles: campaign.settlementFiles || null,
  //           settledAt: campaign.settledAt ? new Date(campaign.settledAt) : null,
  //           eventType: campaign.eventType || "CAMPAIGN",
  //           visibilityType: campaign.visibility || "PUBLIC",
  //           mode: campaign.mode || null,
  //           summary: {
  //             totalParticipants: campaign.summary?.totalParticipants || 0,
  //             totalPoints: campaign.summary?.totalPoints || 0,
  //             totalPointsEarned: campaign.summary?.totalPointsEarned || 0,
  //             totalTaskParticipation:
  //               campaign.summary?.totalTaskParticipation || 0,
  //             totalTasks: campaign.summary?.totalTasks || 0,
  //             totalXP: campaign.summary?.totalXP || 0,
  //           },
  //           rewardTitle: campaign.rewardTitle || null,
  //           rewardSubtitle: campaign.rewardSubtitle || null,
  //           ipProtect: campaign.ipProtect || null,
  //           leaderboard: campaign.leaderboard || "NONE",
  //           seasonId: campaign.seasonId || null,
  //           tags: campaign.tags || null,
  //         };

  //         if (!existingTent) {
  //           existingTent = await this.questRepository.createTent(tentData);
  //           syncResults.tentsCreated++;
  //         } else {
  //           // Update existing tent
  //           Object.assign(existingTent, tentData);
  //           await existingTent.save();
  //           syncResults.tentsUpdated++;
  //         }

  //         // Fetch and process quests for this tent
  //         const questVariables = {
  //           eventId: campaign.id,
  //         };

  //         const questResponse = await executeGraphQLQuery(
  //           FETCH_QUESTS_QUERY,
  //           questVariables,
  //           false
  //         );

  //         if (questResponse?.data?.pTasks) {
  //           const questIds: Types.ObjectId[] = [];

  //           for (const task of questResponse.data.pTasks) {
  //             try {
  //               let existingQuest =
  //                 await this.questRepository.findQuestByAirlyftId(task.id);

  //               const questData = {
  //                 tentId: existingTent._id,
  //                 title: task.title,
  //                 description: task.description || null,
  //                 xpValue: task.xp || 0,
  //                 airlyftId: task.id,
  //                 order: task.order || 1,
  //                 points: task.points || 0,
  //                 iconUrl: task.iconUrl || null,
  //                 appType: task.appType || null,
  //                 taskType: task.taskType || null,
  //                 parentId: task.parentId || null,
  //                 frequency: task.frequency || "NONE",
  //                 xp: task.xp || 0,
  //                 appKey: task.appKey || null,
  //                 taskKey: task.taskKey || null,
  //                 verify: task.verify || "AUTO",
  //                 subTaskStats: {
  //                   count: task.subTaskStats?.count || null,
  //                   totalPoints: task.subTaskStats?.totalPoints || null,
  //                   totalXp: task.subTaskStats?.totalXp || null,
  //                 },
  //                 participantCount: task.participantCount || 0,
  //                 guardConfig: task.guardConfig || null,
  //                 info: task.info || null,
  //                 isCompleted: task.isCompleted || false,
  //                 locked: task.locked || false,
  //               };

  //               if (!existingQuest) {
  //                 existingQuest = await this.questRepository.createQuest(
  //                   questData
  //                 );
  //                 syncResults.questsCreated++;
  //               } else {
  //                 // Update existing quest
  //                 Object.assign(existingQuest, questData);
  //                 await existingQuest.save();
  //                 syncResults.questsUpdated++;
  //               }

  //               questIds.push(existingQuest._id);
  //             } catch (questError: any) {
  //               syncResults.errors.push(
  //                 `Error processing quest ${task.id}: ${questError.message}`
  //               );
  //             }
  //           }

  //           // Update tent with quest references
  //           if (questIds.length > 0) {
  //             existingTent.questIds = questIds;
  //             await existingTent.save();
  //           }
  //         }
  //       } catch (tentError: any) {
  //         syncResults.errors.push(
  //           `Error processing tent ${campaign.id}: ${tentError.message}`
  //         );
  //       }
  //     }

  //     return syncResults;
  //   } catch (error: any) {
  //     throw new Error(`Sync failed: ${error.message}`);
  //   }
  // }

  async syncTentsAndQuests() {
    try {
      const projectId = process.env.AIRLYFT_PROJECT_ID;

      if (!projectId) {
        throw new Error("Project ID not configured in environment");
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
        throw new Error(
          `Failed to fetch campaigns: ${campaignResponse.errors}`
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
        throw new Error(
          "Required tent types (Social/Educational) not found in database"
        );
      }

      // Store quest references for prerequisite mapping
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
                let existingQuest =
                  await this.questRepository.findQuestByTaskId(task.id);

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
                  prerequisites: [], // Will be set later based on logic
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

                // Store quest reference for prerequisite mapping
                const tentTypeName = tentTypeId.equals(socialTentType._id)
                  ? "Social"
                  : "Educational";
                const questKey = `${tentTypeName}_Quest_${task.order || 1}`;
                questsByTentAndOrder.set(questKey, existingQuest._id);

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

      // Now set prerequisites based on the logic
      await this.setQuestPrerequisites(questsByTentAndOrder);

      return syncResults;
    } catch (error: any) {
      throw new Error(`Sync failed: ${error.message}`);
    }
  }

  private async setQuestPrerequisites(
    questsByTentAndOrder: Map<string, Types.ObjectId>
  ) {
    try {
      // Get quest IDs
      const socialQuest1 = questsByTentAndOrder.get("Social_Quest_1");
      const socialQuest2 = questsByTentAndOrder.get("Social_Quest_2");
      const socialQuest3 = questsByTentAndOrder.get("Social_Quest_3");
      const educationalQuest1 = questsByTentAndOrder.get("Educational_Quest_1");
      const educationalQuest2 = questsByTentAndOrder.get("Educational_Quest_2");

      // Set prerequisites according to the logic
      if (socialQuest2 && socialQuest1) {
        // Social Quest 2 requires Social Quest 1
        await this.updateQuestPrerequisites(socialQuest2, [socialQuest1]);
      }

      if (educationalQuest1 && socialQuest1 && socialQuest2) {
        // Educational Quest 1 requires Social Quest 1 & 2
        await this.updateQuestPrerequisites(educationalQuest1, [
          socialQuest1,
          socialQuest2,
        ]);
      }

      if (socialQuest3 && socialQuest1 && socialQuest2 && educationalQuest1) {
        // Social Quest 3 requires Social Quest 1 & 2, and Educational Quest 1
        await this.updateQuestPrerequisites(socialQuest3, [
          socialQuest1,
          socialQuest2,
          educationalQuest1,
        ]);
      }

      if (
        educationalQuest2 &&
        socialQuest1 &&
        socialQuest2 &&
        socialQuest3 &&
        educationalQuest1
      ) {
        // Educational Quest 2 requires all previous quests
        await this.updateQuestPrerequisites(educationalQuest2, [
          socialQuest1,
          socialQuest2,
          socialQuest3,
          educationalQuest1,
        ]);
      }
    } catch (error: any) {
      console.error("Error setting quest prerequisites:", error);
    }
  }

  private async updateQuestPrerequisites(
    questId: Types.ObjectId,
    prerequisites: Types.ObjectId[]
  ) {
    try {
      await this.questRepository.updateQuestPrerequisites(
        questId,
        prerequisites
      );
    } catch (error: any) {
      console.error(
        `Error updating prerequisites for quest ${questId}:`,
        error
      );
    }
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
      throw new Error(`Failed to fetch participation: ${response.errors}`);
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
    try {
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
        throw new Error("Failed to retrieve user airLyftAuthToken");
      }

      const airLyftAuthToken = userResponse.data.data.user.airLyftAuthToken;
      const userId = userResponse.data.data.user._id;

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
    } catch (error: any) {
      console.error("Error fetching campaigns with status:", error);

      if (error.response?.status === 401) {
        throw new UnauthorizedError(
          error.response.data?.message || "Invalid or expired session"
        );
      }

      throw new Error(
        `Failed to fetch campaigns with status: ${error.message}`
      );
    }
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

  async fetchQuestsWithStatus(
    eventId: string,
    authToken: string
  ): Promise<{
    quests: any[];
    message: string;
  }> {
    try {
      // Get user information first
      const userInfo = await this.getUserInfo(authToken);

      // Store user task participation data before processing
      await this.storeUserTaskParticipation(
        userInfo.userId,
        eventId,
        userInfo.airLyftAuthToken
      );

      // Fetch tent and quests from database
      const tent = await this.questRepository.findTentByEventId(eventId);

      if (!tent) {
        throw new Error("Tent not found");
      }

      // Type assertion to access populated tentType
      const populatedTent = tent as any;

      if (!populatedTent.tentType || !populatedTent.tentType.tentType) {
        throw new Error("Tent type information not found");
      }

      // Get quests for this tent from database
      const dbQuests = await this.questRepository.getQuestsByTentId(
        tent._id.toString()
      );

      if (!dbQuests || dbQuests.length === 0) {
        return {
          quests: [],
          message: "No quests found for this tent",
        };
      }

      // Sort quests by order to ensure proper sequence
      const sortedQuests = dbQuests.sort(
        (a: any, b: any) => (a.order || 0) - (b.order || 0)
      );

      // Get all tents with quests for cross-tent dependency checking
      const allTents = await this.getAllTentsWithQuests();

      // Get user's participation data from database
      const userParticipations = await this.getUserAllParticipations(
        userInfo.userId
      );
      const allCompletedTasksByTent =
        this.buildCompletedQuestsMap(userParticipations);

      // Get completed tasks for current tent
      const currentTentParticipation = userParticipations.find(
        (p: any) => p.eventId === eventId
      );

      const completedTaskIds = new Set<string>();
      if (currentTentParticipation) {
        currentTentParticipation.participations.forEach((p: any) => {
          if (p.status === "VALID" && p.taskId) {
            completedTaskIds.add(p.taskId);
          }
        });
      }

      // Process quests with completion and lock status
      const questsWithStatus = this.processQuestsWithComplexLogicFromDB(
        sortedQuests,
        completedTaskIds,
        populatedTent.tentType.tentType, // Use the populated tent
        allCompletedTasksByTent,
        allTents
      );

      return {
        quests: questsWithStatus,
        message: "Quests fetched successfully",
      };
    } catch (error: any) {
      throw new Error(`Failed to fetch quests with status: ${error.message}`);
    }
  }

  private processQuestsWithComplexLogicFromDB(
    quests: any[],
    completedTaskIds: Set<string>,
    tentType: string,
    allCompletedTasksByTent: Map<string, Set<string>>,
    allTents: any[]
  ): any[] {
    return quests.map((quest: any, index: number) => {
      const isCompleted = completedTaskIds.has(quest.taskId);
      const isLocked = this.determineQuestLockStatusFromDB(
        quest,
        index,
        tentType,
        completedTaskIds,
        allCompletedTasksByTent,
        allTents
      );

      return {
        _id: quest._id,
        tentId: quest.tentId,
        title: quest.title,
        description: quest.description,
        xpValue: quest.xpValue,
        taskId: quest.taskId,
        order: quest.order,
        points: quest.points,
        iconUrl: quest.iconUrl,
        appType: quest.appType,
        taskType: quest.taskType,
        parentId: quest.parentId,
        frequency: quest.frequency,
        xp: quest.xp,
        appKey: quest.appKey,
        taskKey: quest.taskKey,
        verify: quest.verify,
        subTaskStats: quest.subTaskStats,
        participantCount: quest.participantCount,
        guardConfig: quest.guardConfig,
        info: quest.info,
        prerequisites: quest.prerequisites,
        isCompleted,
        isLocked,
        createdAt: quest.createdAt,
        updatedAt: quest.updatedAt,
      };
    });
  }

  private determineQuestLockStatusFromDB(
    quest: any,
    questIndex: number,
    tentType: string,
    currentTentCompletedTasks: Set<string>,
    allCompletedTasksByTent: Map<string, Set<string>>,
    allTents: any[]
  ): boolean {
    const questOrder = questIndex + 1; // Convert to 1-based indexing

    if (tentType === "Social") {
      return this.determineSocialQuestLockStatusFromDB(
        questOrder,
        currentTentCompletedTasks,
        allCompletedTasksByTent,
        allTents
      );
    } else if (tentType === "Educational") {
      return this.determineEducationalQuestLockStatusFromDB(
        questOrder,
        currentTentCompletedTasks,
        allCompletedTasksByTent,
        allTents
      );
    }

    // Default logic for unknown tent types
    return questIndex !== 0;
  }

  private determineSocialQuestLockStatusFromDB(
    questOrder: number,
    socialCompletedTasks: Set<string>,
    allCompletedTasksByTent: Map<string, Set<string>>,
    allTents: any[]
  ): boolean {
    const socialTent = allTents.find(
      (tent) => tent.tentType?.tentType === "Social"
    );
    if (!socialTent) return true;

    const socialQuests =
      socialTent.questIds?.sort(
        (a: any, b: any) => (a.order || 0) - (b.order || 0)
      ) || [];

    switch (questOrder) {
      case 1:
        // Social Quest 1: Always unlocked initially
        return false;

      case 2:
        // Social Quest 2: Requires Social Quest 1 completion
        if (socialQuests.length >= 1) {
          const socialQuest1TaskId = socialQuests[0]?.taskId;
          return (
            !socialQuest1TaskId || !socialCompletedTasks.has(socialQuest1TaskId)
          );
        }
        return true;

      case 3:
        // Social Quest 3: Requires Social Quest 1 & 2, and Educational Quest 1
        if (socialQuests.length >= 2) {
          const socialQuest1TaskId = socialQuests[0]?.taskId;
          const socialQuest2TaskId = socialQuests[1]?.taskId;

          const socialPrereqsMet =
            socialQuest1TaskId &&
            socialQuest2TaskId &&
            socialCompletedTasks.has(socialQuest1TaskId) &&
            socialCompletedTasks.has(socialQuest2TaskId);

          if (!socialPrereqsMet) return true;

          // Check Educational Quest 1 completion
          const educationalTent = allTents.find(
            (tent) => tent.tentType?.tentType === "Educational"
          );
          if (!educationalTent) return true;

          const educationalQuests =
            educationalTent.questIds?.sort(
              (a: any, b: any) => (a.order || 0) - (b.order || 0)
            ) || [];
          const educationalCompletedTasks =
            allCompletedTasksByTent.get(educationalTent.eventId) || new Set();

          if (educationalQuests.length >= 1) {
            const educationalQuest1TaskId = educationalQuests[0]?.taskId;
            return (
              !educationalQuest1TaskId ||
              !educationalCompletedTasks.has(educationalQuest1TaskId)
            );
          }
        }
        return true;

      default:
        return true;
    }
  }

  private determineEducationalQuestLockStatusFromDB(
    questOrder: number,
    educationalCompletedTasks: Set<string>,
    allCompletedTasksByTent: Map<string, Set<string>>,
    allTents: any[]
  ): boolean {
    const socialTent = allTents.find(
      (tent) => tent.tentType?.tentType === "Social"
    );
    if (!socialTent) return true;

    const socialQuests =
      socialTent.questIds?.sort(
        (a: any, b: any) => (a.order || 0) - (b.order || 0)
      ) || [];
    const socialCompletedTasks =
      allCompletedTasksByTent.get(socialTent.eventId) || new Set();

    switch (questOrder) {
      case 1:
        // Educational Quest 1: Requires Social Quest 1 & 2
        if (socialQuests.length >= 2) {
          const socialQuest1TaskId = socialQuests[0]?.taskId;
          const socialQuest2TaskId = socialQuests[1]?.taskId;

          return (
            !socialQuest1TaskId ||
            !socialQuest2TaskId ||
            !socialCompletedTasks.has(socialQuest1TaskId) ||
            !socialCompletedTasks.has(socialQuest2TaskId)
          );
        }
        return true;

      case 2:
        // Educational Quest 2: Requires Social Quest 1, 2 & 3, and Educational Quest 1
        // First check Social Quest 1, 2 & 3
        if (socialQuests.length >= 3) {
          const socialQuest1TaskId = socialQuests[0]?.taskId;
          const socialQuest2TaskId = socialQuests[1]?.taskId;
          const socialQuest3TaskId = socialQuests[2]?.taskId;

          const socialPrereqsMet =
            socialQuest1TaskId &&
            socialQuest2TaskId &&
            socialQuest3TaskId &&
            socialCompletedTasks.has(socialQuest1TaskId) &&
            socialCompletedTasks.has(socialQuest2TaskId) &&
            socialCompletedTasks.has(socialQuest3TaskId);

          if (!socialPrereqsMet) return true;

          // Check Educational Quest 1 completion
          const educationalTent = allTents.find(
            (tent) => tent.tentType?.tentType === "Educational"
          );
          if (!educationalTent) return true;

          const educationalQuests =
            educationalTent.questIds?.sort(
              (a: any, b: any) => (a.order || 0) - (b.order || 0)
            ) || [];

          if (educationalQuests.length >= 1) {
            const educationalQuest1TaskId = educationalQuests[0]?.taskId;
            return (
              !educationalQuest1TaskId ||
              !educationalCompletedTasks.has(educationalQuest1TaskId)
            );
          }
        }
        return true;

      default:
        return true;
    }
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
      throw new Error("Failed to retrieve user information");
    }

    return {
      userId: userResponse.data.data.user._id,
      airLyftAuthToken: userResponse.data.data.user.airLyftAuthToken,
    };
  }

  async sendEmailOTP(
    email: string,
    authToken: string
  ): Promise<{
    message: string;
    success: boolean;
    data?: any;
  }> {
    try {
      // Get user info to retrieve airLyftAuthToken
      const { airLyftAuthToken } = await this.getUserInfo(authToken);

      // Make request to AirLyft API
      const response = await axios.post(
        `${config.airLyft.restEndpoint}/auth/email/link-account?projectId=${config.airLyft.projectId}`,
        { email },
        {
          headers: {
            Authorization: `Bearer ${airLyftAuthToken}`,
            "api-key": config.airLyft.apiKey,
            "Content-Type": "application/json",
          },
        }
      );

      return {
        message: "OTP sent successfully",
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error("Error sending email OTP:", error);

      if (error.response?.status === 401) {
        throw new UnauthorizedError(
          error.response.data?.message || "Invalid or expired session"
        );
      }

      throw new Error(
        `Failed to send email OTP: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  }

  async verifyEmailOTP(
    email: string,
    code: number,
    authToken: string
  ): Promise<{
    message: string;
    success: boolean;
    data?: any;
  }> {
    try {
      // Get user info to retrieve airLyftAuthToken
      const { airLyftAuthToken } = await this.getUserInfo(authToken);

      // Verify OTP with AirLyft API
      const verifyResponse = await axios.post(
        `${config.airLyft.restEndpoint}/auth/email/verify-link-account?projectId=${config.airLyft.projectId}`,
        { email, code },
        {
          headers: {
            Authorization: `Bearer ${airLyftAuthToken}`,
            "api-key": config.airLyft.apiKey,
            "Content-Type": "application/json",
          },
        }
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
        airLyftAuthToken
      );

      console.log("Conflict check response:", conflictCheckResponse);

      // if (conflictCheckResponse?.errors) {
      //   throw new Error("Conflict check failed");
      // }

      // If conflictedUserProfile is not null, there's a conflict
      if (conflictCheckResponse?.data?.conflictedUserProfile !== null) {
        throw new Error("Account linking conflict detected");
      }

      return {
        message: "OTP verified successfully",
        success: true,
        data: verifyResponse.data,
      };
    } catch (error: any) {
      console.error("Error verifying email OTP:", error);

      if (error.response?.status === 401) {
        throw new UnauthorizedError(
          error.response.data?.message || "Invalid or expired session"
        );
      }

      throw new Error(
        `Failed to verify email OTP: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  }

  async participateEmailAddressTask(
    eventId: string,
    taskId: string,
    providerId: string,
    authToken: string
  ): Promise<{
    message: string;
    success: boolean;
    data?: any;
  }> {
    try {
      // Get user info to retrieve airLyftAuthToken
      const { airLyftAuthToken } = await this.getUserInfo(authToken);

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
        airLyftAuthToken
      );

      if (response?.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(response.errors)}`);
      }

      const participationResult = response?.data?.participateEmailAddressTask;

      if (!participationResult) {
        throw new Error("No participation result returned from API");
      }

      return {
        message: "Email address task participation successful",
        success: true,
        data: participationResult,
      };
    } catch (error: any) {
      console.error("Error participating in email address task:", error);

      if (error.response?.status === 401) {
        throw new UnauthorizedError(
          error.response.data?.message || "Invalid or expired session"
        );
      }

      throw new Error(
        `Failed to participate in email address task: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  }
}
