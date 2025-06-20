import { NextFunction, Request, Response } from "express";
import {
  CREATE_EVENT_CONNECTION_MUTATION,
  FETCH_CAMPAIGNS_QUERY,
  FETCH_CONNECTION_TOKEN_QUERY,
  FETCH_QUESTS_QUERY,
  ME_QUERY,
  PARTICIPATE_DISCORD_JOIN_TASK_MUTATION,
  PARTICIPATE_LINK_TASK_MUTATION,
  PARTICIPATE_TWITTER_FOLLOW_TASK_MUTATION,
  USER_EVENT_CONNECTIONS_QUERY,
  USER_TASK_PARTICIPATION_QUERY,
} from "@utils/graphql.queries";
import { executeGraphQLQuery } from "@services/graphql.service";
import { config } from "@config/server.config";
import axios from "axios";
import { QuestService } from "@services/quest.service";
import { ValidationError } from "@utils/errors/validation.error";
import {
  ConfigurationError,
  NotFoundError,
  UnauthorizedError,
} from "@utils/errors";
import { asyncHandler } from "@utils/async.handler.util";
import { Types } from "mongoose";

// Interface for user response
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

interface AuthUser {
  userId: string;
  provider: string;
  providerId: string;
  firstName: string | null;
  lastName: string | null;
  picture: string | null;
  username: string;
  isPrimary: boolean;
  verified: boolean;
  updatedAt: string;
  __typename: string;
}

interface AuthDetails extends AuthUser {
  createdAt: string;
}

interface MeResponse {
  auth: AuthUser[];
  createdAt: string;
  email: string | null;
  firstName: string;
  id: string;
  lastName: string;
  auths: AuthDetails[];
}

export class QuestController {
  private questService: QuestService;

  constructor() {
    this.questService = new QuestService();
  }

  private getClientIp(req: Request): string | undefined {
    return (
      (req.headers["x-forwarded-for"] as string) ||
      (req.headers["x-real-ip"] as string) ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress
    );
  }

  private async processQuestXP(
    userResponse: any,
    eventId: string,
    taskId: string
  ): Promise<any> {
    try {
      const userId = userResponse.data.data.user.id;

      // Find the quest and tent info for XP processing
      const quest = await this.questService.getQuestByTaskId(taskId);
      const tent = await this.questService.getTentByEventId(eventId);

      if (quest && tent) {
        return await this.questService.handleQuestCompletionWithXP(
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

  fetchCampaigns = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      // Get authorization token from headers (mandatory)
      const authToken = req.headers.authorization;

      if (!authToken) {
        throw new UnauthorizedError("Authorization token is required");
      }

      // Call service method with auth token
      const result = await this.questService.fetchCampaignsWithStatus(
        authToken
      );

      res.status(200).json({
        status: true,
        data: result.tents,
        message: result.message,
      });
    }
  );

  fetchCampaignsViaAirLyft = asyncHandler(
    async (
      _req: Request,
      res: Response,
      _next: NextFunction
    ): Promise<void> => {
      const projectId = process.env.AIRLYFT_PROJECT_ID;

      if (!projectId) {
        throw new ConfigurationError(
          "Project ID not configured in environment"
        );
      }

      const variables = {
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

      const response = await executeGraphQLQuery(
        FETCH_CAMPAIGNS_QUERY,
        variables,
        false
      );

      if (response?.errors) {
        throw new ValidationError(
          { graphql: response.errors },
          "GraphQL query failed"
        );
      }

      const campaigns = response?.data?.exploreEvents?.data || [];

      // Fetch quest count for each campaign
      const campaignsWithQuestCount = await Promise.all(
        campaigns.map(async (campaign: any) => {
          try {
            const questVariables = {
              eventId: campaign.id,
            };

            const questResponse = await executeGraphQLQuery(
              FETCH_QUESTS_QUERY,
              questVariables,
              false
            );

            const questCount = questResponse?.data?.pTasks?.length || 0;

            return {
              ...campaign,
              questCount,
            };
          } catch (questError) {
            console.error(
              `Error fetching quest count for campaign ${campaign.id}:`,
              questError
            );
            return {
              ...campaign,
              questCount: 0,
            };
          }
        })
      );

      res.status(200).json({
        status: true,
        data: campaignsWithQuestCount,
        message: "Campaigns fetched successfully",
      });
    }
  );

  fetchAllQuests = asyncHandler(
    async (
      _req: Request,
      res: Response,
      _next: NextFunction
    ): Promise<void> => {
      const projectId = process.env.AIRLYFT_PROJECT_ID;

      if (!projectId) {
        throw new ConfigurationError(
          "Project ID not configured in environment"
        );
      }

      // First, fetch all campaigns
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
        throw new ValidationError(
          { graphql: campaignResponse.errors },
          "Failed to fetch campaigns"
        );
      }

      const campaigns = campaignResponse?.data?.exploreEvents?.data || [];

      // Fetch quests for each campaign
      const allQuests: any[] = [];

      for (const campaign of campaigns) {
        try {
          const questVariables = {
            eventId: campaign.id,
          };

          const questResponse = await executeGraphQLQuery(
            FETCH_QUESTS_QUERY,
            questVariables,
            false
          );

          if (questResponse?.data?.pTasks) {
            const questsWithCampaignInfo = questResponse.data.pTasks.map(
              (quest: any) => ({
                ...quest,
                tentId: campaign.id,
                tentTitle: campaign.title,
                tentState: campaign.state,
              })
            );

            allQuests.push(...questsWithCampaignInfo);
          }
        } catch (questError) {
          console.error(
            `Error fetching quests for campaign ${campaign.id}:`,
            questError
          );
          // Continue with other campaigns even if one fails
        }
      }

      res.status(200).json({
        status: true,
        data: allQuests,
        totalQuests: allQuests.length,
        message: "All quests fetched successfully",
      });
    }
  );

  fetchQuests = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      const { eventId } = req.params;

      if (!eventId) {
        throw new ValidationError(
          { eventId: "Event ID is required" },
          "Missing required fields"
        );
      }

      // Get authorization token from headers (mandatory)
      const authToken = req.headers.authorization;

      if (!authToken) {
        throw new UnauthorizedError("Authorization token is required");
      }

      // Call service method to fetch quests with status
      const result = await this.questService.fetchQuestsWithStatus(
        eventId,
        authToken
      );

      res.status(200).json({
        status: true,
        data: result.quests,
        message: result.message,
      });
    }
  );

  // async fetchQuests(req: Request, res: Response): Promise<void> {
  //   try {
  //     const { eventId } = req.params;

  //     if (!eventId) {
  //       res.status(400).json({
  //         success: false,
  //         message: "Event ID is required",
  //       });
  //       return;
  //     }

  //     // Get authorization token from headers
  //     const authToken = req.headers.authorization;

  //     const variables = {
  //       eventId: eventId,
  //     };

  //     // Fetch quests
  //     const response = await executeGraphQLQuery(
  //       FETCH_QUESTS_QUERY,
  //       variables,
  //       false
  //     );

  //     if (response?.errors) {
  //       res.status(400).json({
  //         status: false,
  //         message: "GraphQL query failed",
  //         errors: response.errors,
  //       });
  //       return;
  //     }

  //     let quests = response?.data?.pTasks || [];

  //     // If authorization token is present, fetch user task participation
  //     let completedTaskIds: Set<string> = new Set();

  //     if (authToken) {
  //       try {
  //         // Fetch user details to get airLyftAuthToken
  //         const userResponse = await axios.get<UserResponse>(
  //           `${config.services.authServiceUrl}/api/v1/me`,
  //           {
  //             headers: {
  //               Authorization: authToken,
  //             },
  //           }
  //         );

  //         if (
  //           userResponse.data &&
  //           userResponse.data.status &&
  //           userResponse.data.data?.user?.airLyftAuthToken
  //         ) {
  //           const airLyftAuthToken =
  //             userResponse.data.data.user.airLyftAuthToken;

  //           // Fetch user task participation
  //           const participationResponse = await executeGraphQLQuery(
  //             USER_TASK_PARTICIPATION_QUERY,
  //             { eventId },
  //             true,
  //             true,
  //             airLyftAuthToken
  //           );

  //           console.log("participate", participationResponse);

  //           if (participationResponse?.data?.userTaskParticipation) {
  //             // Extract completed task IDs
  //             participationResponse.data.userTaskParticipation.forEach(
  //               (participation: any) => {
  //                 if (participation.status === "VALID") {
  //                   completedTaskIds.add(participation.taskId);
  //                 }
  //               }
  //             );
  //           }
  //         }
  //       } catch (participationError) {
  //         console.error(
  //           "Error fetching user task participation:",
  //           participationError
  //         );
  //         // Continue without participation data if there's an error
  //       }
  //     }
  //     console.log("Fetched Quests:", quests);
  //     console.log("Completed Task IDs:", completedTaskIds);

  //     // Sort quests by order to ensure proper sequence
  //     quests = quests.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

  //     // Add completion status and improved locking logic
  //     const questsWithStatus = quests.map((quest: any, index: number) => {
  //       const isCompleted = completedTaskIds.has(quest.id);
  //       let isLocked = true;

  //       if (index === 0) {
  //         // First quest is always unlocked
  //         isLocked = false;
  //       } else if (index > 0) {
  //         // Check if previous quest is completed to unlock this one
  //         const previousQuestId = quests[index - 1].id;
  //         const isPreviousCompleted = completedTaskIds.has(previousQuestId);
  //         isLocked = !isPreviousCompleted;
  //       }

  //       return {
  //         ...quest,
  //         isCompleted,
  //         locked: isLocked,
  //       };
  //     });

  //     res.status(200).json({
  //       status: true,
  //       data: questsWithStatus,
  //       message: "Quests fetched successfully",
  //     });
  //   } catch (error: any) {
  //     console.error("Error fetching quests:", error);
  //     res.status(500).json({
  //       status: false,
  //       message: "Internal server error",
  //       error: error.message,
  //     });
  //   }
  // }

  // async fetchQuests(req: Request, res: Response): Promise<void> {
  //   try {
  //     const { eventId } = req.params;

  //     if (!eventId) {
  //       res.status(400).json({
  //         success: false,
  //         message: "Event ID is required",
  //       });
  //       return;
  //     }

  //     const variables = {
  //       eventId: eventId,
  //     };

  //     const response = await executeGraphQLQuery(
  //       FETCH_QUESTS_QUERY,
  //       variables,
  //       false
  //     );

  //     if (response?.errors) {
  //       res.status(400).json({
  //         status: false,
  //         message: "GraphQL query failed",
  //         errors: response.errors,
  //       });
  //       return;
  //     }

  //     res.status(200).json({
  //       status: true,
  //       data: response?.data?.pTasks,
  //       message: "Quests fetched successfully",
  //     });
  //   } catch (error: any) {
  //     console.error("Error fetching quests:", error);
  //     res.status(500).json({
  //       status: false,
  //       message: "Internal server error",
  //       error: error.message,
  //     });
  //   }
  // }

  fetchConnectionToken = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      const { provider } = req.params;
      const projectId = config.airLyft.projectId;

      if (!provider) {
        throw new ValidationError(
          { provider: "Provider is required" },
          "Missing required fields"
        );
      }

      if (!projectId) {
        throw new ConfigurationError(
          "Project ID not configured in environment"
        );
      }

      // Get authorization token from headers
      const authToken = req.headers.authorization;

      if (!authToken) {
        throw new UnauthorizedError("Authorization token is required");
      }

      // Fetch user details to get airLyftAuthToken
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
        throw new ValidationError(
          { airLyftAuthToken: "User airLyftAuthToken not found" },
          "Failed to retrieve user airLyftAuthToken"
        );
      }

      const airLyftAuthToken = userResponse.data.data.user.airLyftAuthToken;

      // Validate provider enum
      const validProviders = ["TWITTER", "TELEGRAM", "DISCORD"];
      const upperCaseProvider = provider.toUpperCase();

      if (!validProviders.includes(upperCaseProvider)) {
        throw new ValidationError(
          { provider: `Must be one of: ${validProviders.join(", ")}` },
          `Invalid provider. Must be one of: ${validProviders.join(", ")}`
        );
      }

      const clientIp = this.getClientIp(req);

      const variables = {
        provider: upperCaseProvider,
        projectId: projectId,
      };

      const response = await executeGraphQLQuery(
        FETCH_CONNECTION_TOKEN_QUERY,
        variables,
        true,
        true,
        airLyftAuthToken,
        clientIp
      );

      if (response?.errors) {
        throw new ValidationError(
          { graphql: response.errors },
          "GraphQL query failed"
        );
      }

      const connectionToken = response?.data?.connectionToken;

      if (!connectionToken) {
        throw new ValidationError(
          { connectionToken: "Not found" },
          "Connection token not found"
        );
      }

      res.status(200).json({
        status: true,
        data: {
          connectionToken: connectionToken,
          provider: upperCaseProvider,
        },
        message: "Connection token fetched successfully",
      });
    }
  );

  participateTwitterFollow = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      // Get authorization token from headers
      const authToken = req.headers.authorization;

      if (!authToken) {
        throw new UnauthorizedError("Authorization token is required");
      }

      console.log("Authorization token:", authToken);

      // Fetch user details to get airLyftAuthToken
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
        !userResponse.data?.status ||
        !userResponse.data?.data?.user?.airLyftAuthToken
      ) {
        throw new ValidationError(
          { airLyftAuthToken: "User airLyftAuthToken not found" },
          "Failed to retrieve user airLyftAuthToken"
        );
      }

      const airLyftAuthToken = userResponse.data.data.user.airLyftAuthToken;

      if (!req.body) {
        throw new ValidationError(
          { body: "Request body is required" },
          "Missing request fields"
        );
      }

      // Get values from request body
      const { eventId, providerId, taskId } = req.body;

      const errors: Record<string, string> = {};
      if (!eventId) errors.eventId = "Event ID is required";
      if (!providerId) errors.providerId = "Provider ID is required";
      if (!taskId) errors.taskId = "Task ID is required";

      if (Object.keys(errors).length > 0) {
        throw new ValidationError(errors, "Missing required fields");
      }

      const clientIp = this.getClientIp(req);

      const variables = {
        eventId,
        providerId,
        taskId,
      };

      const response = await executeGraphQLQuery(
        PARTICIPATE_TWITTER_FOLLOW_TASK_MUTATION,
        variables,
        true,
        true,
        airLyftAuthToken,
        clientIp
      );

      console.log("GraphQL response:", response);

      if (response?.errors) {
        throw new ValidationError(
          { graphql: response.errors },
          "Twitter follow task participation failed"
        );
      }

      const participationResult = response?.data?.participateTwitterFollowTask;

      if (!participationResult) {
        throw new ValidationError(
          { result: "No participation result returned" },
          "No participation result returned"
        );
      }

      // Process XP
      const xpResult = await this.processQuestXP(userResponse, eventId, taskId);

      res.status(200).json({
        status: true,
        data: {
          participation: participationResult,
          xpResult, // Will be null if processing failed
        },
        message: "Twitter follow task participated successfully",
      });
    }
  );

  fetchEventConnections = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      const { eventId } = req.params;

      if (!eventId) {
        throw new ValidationError(
          { eventId: "Event ID is required" },
          "Missing required fields"
        );
      }

      // Get authorization token from headers
      const authToken = req.headers.authorization;

      if (!authToken) {
        throw new UnauthorizedError("Authorization token is required");
      }

      // Fetch user details to get airLyftAuthToken
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
        throw new ValidationError(
          { airLyftAuthToken: "User airLyftAuthToken not found" },
          "Failed to retrieve user airLyftAuthToken"
        );
      }

      const airLyftAuthToken = userResponse.data.data.user.airLyftAuthToken;

      const variables = { eventId };

      const response = await executeGraphQLQuery(
        USER_EVENT_CONNECTIONS_QUERY,
        variables,
        true,
        true,
        airLyftAuthToken
      );

      if (response?.errors) {
        throw new ValidationError(
          { graphql: response.errors },
          "Failed to fetch event connections"
        );
      }

      const eventConnections = response?.data?.eventConnections || [];

      res.status(200).json({
        status: true,
        data: {
          eventConnections,
        },
        message: "Event connections fetched successfully",
      });
    }
  );

  fetchMe = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      // Get authorization token from headers
      const authToken = req.headers.authorization;

      if (!authToken) {
        throw new UnauthorizedError("Authorization token is required");
      }

      // Fetch user details to get airLyftAuthToken
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
        throw new ValidationError(
          { airLyftAuthToken: "User airLyftAuthToken not found" },
          "Failed to retrieve user airLyftAuthToken"
        );
      }

      const airLyftAuthToken = userResponse.data.data.user.airLyftAuthToken;
      const projectId = config.airLyft.projectId;

      const variables = projectId ? { projectId } : {};

      const response = await executeGraphQLQuery(
        ME_QUERY,
        variables,
        true,
        true,
        airLyftAuthToken
      );

      if (response?.errors) {
        throw new ValidationError(
          { graphql: response.errors },
          "Failed to fetch user profile"
        );
      }

      const meData = response?.data?.me;

      if (!meData) {
        throw new ValidationError(
          { me: "User profile not found" },
          "User profile not found"
        );
      }

      res.status(200).json({
        status: true,
        data: {
          me: meData,
        },
        message: "User profile fetched successfully",
      });
    }
  );

  fetchUserTaskParticipation = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      const { eventId } = req.params;

      if (!eventId) {
        throw new ValidationError(
          { eventId: "Event ID is required" },
          "Missing required fields"
        );
      }

      // Get authorization token from headers
      const authToken = req.headers.authorization;
      console.log("Authorization token:", authToken);

      if (!authToken) {
        throw new UnauthorizedError("Authorization token is required");
      }

      // Fetch user details to get airLyftAuthToken
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
        throw new ValidationError(
          { airLyftAuthToken: "User airLyftAuthToken not found" },
          "Failed to retrieve user airLyftAuthToken"
        );
      }

      const airLyftAuthToken = userResponse.data.data.user.airLyftAuthToken;
      const userId = userResponse.data.data.user._id;

      const variables = { eventId };

      const response = await executeGraphQLQuery(
        USER_TASK_PARTICIPATION_QUERY,
        variables,
        true,
        true,
        airLyftAuthToken
      );

      if (response?.errors) {
        throw new ValidationError(
          { graphql: response.errors },
          "Failed to fetch user task participation"
        );
      }

      const userTaskParticipation = response?.data?.userTaskParticipation || [];

      // Store the participation data in database
      try {
        const storeResult = await this.questService.storeUserTaskParticipation(
          userId,
          eventId,
          airLyftAuthToken
        );

        console.log("Storage result:", storeResult);
      } catch (storeError: any) {
        console.error(
          "Error storing user task participation:",
          storeError.message
        );
        // Continue with the response even if storage fails
      }

      res.status(200).json({
        status: true,
        data: {
          userTaskParticipation,
        },
        message: "User task participation fetched successfully",
      });
    }
  );

  // async fetchUserTaskParticipation(req: Request, res: Response): Promise<void> {
  //   try {
  //     const { eventId } = req.params;

  //     if (!eventId) {
  //       res.status(400).json({
  //         status: false,
  //         message: "Event ID is required",
  //       });
  //       return;
  //     }

  //     // Get authorization token from headers to fetch user's airLyftAuthToken
  //     const authToken = req.headers.authorization;

  //     if (!authToken) {
  //       res.status(401).json({
  //         status: false,
  //         message: "Authorization token is required",
  //       });
  //       return;
  //     }

  //     // Fetch user details to get airLyftAuthToken
  //     const userResponse = await axios.get<UserResponse>(
  //       `${config.services.authServiceUrl}/api/v1/me`,
  //       {
  //         headers: {
  //           Authorization: authToken,
  //         },
  //       }
  //     );

  //     if (
  //       !userResponse.data ||
  //       !userResponse.data.status ||
  //       !userResponse.data.data?.user?.airLyftAuthToken
  //     ) {
  //       res.status(400).json({
  //         status: false,
  //         message: "Failed to retrieve user airLyftAuthToken",
  //       });
  //       return;
  //     }

  //     const airLyftAuthToken = userResponse.data.data.user.airLyftAuthToken;

  //     const variables = { eventId };

  //     const response = await executeGraphQLQuery(
  //       USER_TASK_PARTICIPATION_QUERY,
  //       variables,
  //       true,
  //       true,
  //       airLyftAuthToken
  //     );

  //     if (response?.errors) {
  //       res.status(400).json({
  //         status: false,
  //         message: "Failed to fetch user task participation",
  //         errors: response.errors,
  //       });
  //       return;
  //     }

  //     const userTaskParticipation = response?.data?.userTaskParticipation || [];

  //     res.status(200).json({
  //       status: true,
  //       data: {
  //         userTaskParticipation,
  //       },
  //       message: "User task participation fetched successfully",
  //     });
  //   } catch (error: any) {
  //     console.error("Error fetching user task participation:", error);
  //     res.status(500).json({
  //       status: false,
  //       message: "Internal server error",
  //       error: error.message,
  //     });
  //   }
  // }

  createEventConnection = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      if (!req.body) {
        throw new ValidationError(
          { body: "Request body is required" },
          "Missing request fields"
        );
      }

      const { eventId, provider, providerId } = req.body;

      // Validate required fields
      const errors: Record<string, string> = {};
      if (!eventId) errors.eventId = "Event ID is required";
      if (!provider) errors.provider = "Provider is required";
      if (!providerId) errors.providerId = "Provider ID is required";

      if (Object.keys(errors).length > 0) {
        throw new ValidationError(errors, "Missing required fields");
      }

      // Get authorization token from headers
      const authToken = req.headers.authorization;

      if (!authToken) {
        throw new UnauthorizedError("Authorization token is required");
      }

      // Fetch user details to get airLyftAuthToken
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
        throw new ValidationError(
          { airLyftAuthToken: "User airLyftAuthToken not found" },
          "Failed to retrieve user airLyftAuthToken"
        );
      }

      const airLyftAuthToken = userResponse.data.data.user.airLyftAuthToken;

      // Validate provider enum
      const validProviders = [
        "TWITTER",
        "TELEGRAM",
        "DISCORD",
        "CAMP_HAVEN",
        "MAGIC_LINK",
      ];
      const upperCaseProvider = provider.toUpperCase();

      if (!validProviders.includes(upperCaseProvider)) {
        throw new ValidationError(
          { provider: `Must be one of: ${validProviders.join(", ")}` },
          "Invalid provider"
        );
      }

      const clientIp = this.getClientIp(req);

      const variables = {
        eventId,
        provider: upperCaseProvider,
        providerId,
      };

      const response = await executeGraphQLQuery(
        CREATE_EVENT_CONNECTION_MUTATION,
        variables,
        true,
        true,
        airLyftAuthToken,
        clientIp
      );

      if (response?.errors) {
        throw new ValidationError(
          { graphql: response.errors },
          "Failed to create event connection"
        );
      }

      const eventConnection = response?.data?.createEventConnection;

      if (!eventConnection) {
        throw new ValidationError(
          { result: "Event connection creation failed" },
          "No event connection returned"
        );
      }

      res.status(201).json({
        status: true,
        data: {
          createEventConnection: eventConnection,
        },
        message: "Event connection created successfully",
      });
    }
  );

  syncTentsAndQuests = asyncHandler(
    async (
      _req: Request,
      res: Response,
      _next: NextFunction
    ): Promise<void> => {
      const syncResults = await this.questService.syncTentsAndQuests();

      res.status(200).json({
        status: true,
        message: "Tents and quests synced successfully",
        data: syncResults,
      });
    }
  );

  getAllTentsWithQuests = asyncHandler(
    async (
      _req: Request,
      res: Response,
      _next: NextFunction
    ): Promise<void> => {
      const tents = await this.questService.getAllTentsWithQuests();

      res.status(200).json({
        status: true,
        message: "Tents with quests fetched successfully",
        data: tents,
      });
    }
  );

  getUserStoredParticipation = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      const { eventId } = req.params;

      if (!eventId) {
        throw new ValidationError(
          { eventId: "Event ID is required" },
          "Missing required fields"
        );
      }

      const authToken = req.headers.authorization;

      if (!authToken) {
        throw new UnauthorizedError("Authorization token is required");
      }

      // Get user ID from auth service
      const userResponse = await axios.get<UserResponse>(
        `${config.services.authServiceUrl}/api/v1/me`,
        {
          headers: {
            Authorization: authToken,
          },
        }
      );

      if (!userResponse.data?.status || !userResponse.data.data?.user?._id) {
        throw new ValidationError(
          { user: "User information not found" },
          "Failed to retrieve user information"
        );
      }

      const userId = userResponse.data.data.user._id;

      const participation =
        await this.questService.getUserTaskParticipationFromDB(userId, eventId);

      res.status(200).json({
        status: true,
        data: participation,
        message: "User participation data retrieved successfully",
      });
    }
  );

  participateDiscordJoin = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      // Get authorization token from headers
      const authToken = req.headers.authorization;

      if (!authToken) {
        throw new UnauthorizedError("Authorization token is required");
      }

      // Fetch user details to get airLyftAuthToken
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
        !userResponse.data?.status ||
        !userResponse.data?.data?.user?.airLyftAuthToken
      ) {
        throw new ValidationError(
          { airLyftAuthToken: "User airLyftAuthToken not found" },
          "Failed to retrieve user airLyftAuthToken"
        );
      }

      const airLyftAuthToken = userResponse.data.data.user.airLyftAuthToken;

      if (!req.body) {
        throw new ValidationError(
          { body: "Request body is required" },
          "Missing request fields"
        );
      }

      // Get values from request body
      const { eventId, providerId, taskId } = req.body;

      const errors: Record<string, string> = {};
      if (!eventId) errors.eventId = "Event ID is required";
      if (!providerId) errors.providerId = "Provider ID is required";
      if (!taskId) errors.taskId = "Task ID is required";

      if (Object.keys(errors).length > 0) {
        throw new ValidationError(errors, "Missing required fields");
      }

      const clientIp = this.getClientIp(req);

      const variables = {
        eventId,
        providerId,
        taskId,
      };

      const response = await executeGraphQLQuery(
        PARTICIPATE_DISCORD_JOIN_TASK_MUTATION,
        variables,
        true,
        true,
        airLyftAuthToken,
        clientIp
      );

      if (response?.errors) {
        throw new ValidationError(
          { graphql: response.errors },
          "Discord join task participation failed"
        );
      }

      const participationResult = response?.data?.participateDiscordJoinTask;

      if (!participationResult) {
        throw new ValidationError(
          { result: "No participation result returned" },
          "No participation result returned"
        );
      }

      // Process XP
      const xpResult = await this.processQuestXP(userResponse, eventId, taskId);

      res.status(200).json({
        status: true,
        data: {
          participation: participationResult,
          xpResult,
        },
        message: "Discord join task participated successfully",
      });
    }
  );

  participateLinkTask = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      // Get authorization token from headers
      const authToken = req.headers.authorization;

      if (!authToken) {
        throw new UnauthorizedError("Authorization token is required");
      }

      // Fetch user details to get airLyftAuthToken
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
        !userResponse.data?.status ||
        !userResponse.data?.data?.user?.airLyftAuthToken
      ) {
        throw new ValidationError(
          { airLyftAuthToken: "User airLyftAuthToken not found" },
          "Failed to retrieve user airLyftAuthToken"
        );
      }

      const airLyftAuthToken = userResponse.data.data.user.airLyftAuthToken;

      if (!req.body) {
        throw new ValidationError(
          { body: "Request body is required" },
          "Missing request fields"
        );
      }

      // Get values from request body
      const { eventId, taskId } = req.body;

      const errors: Record<string, string> = {};
      if (!eventId) errors.eventId = "Event ID is required";
      if (!taskId) errors.taskId = "Task ID is required";

      if (Object.keys(errors).length > 0) {
        throw new ValidationError(errors, "Missing required fields");
      }

      const clientIp = this.getClientIp(req);

      const variables = {
        eventId,
        taskId,
      };

      const response = await executeGraphQLQuery(
        PARTICIPATE_LINK_TASK_MUTATION,
        variables,
        true,
        true,
        airLyftAuthToken,
        clientIp
      );

      if (response?.errors) {
        throw new ValidationError(
          { graphql: response.errors },
          "Link task participation failed"
        );
      }

      const participationResult = response?.data?.participateLinkTask;

      if (!participationResult) {
        throw new ValidationError(
          { result: "No participation result returned" },
          "No participation result returned"
        );
      }

      // Process XP
      const xpResult = await this.processQuestXP(userResponse, eventId, taskId);

      res.status(200).json({
        status: true,
        data: {
          participation: participationResult,
          xpResult,
        },
        message: "Link task participated successfully",
      });
    }
  );

  sendEmailOTP = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      // Get authorization token from headers
      const authToken = req.headers.authorization;

      if (!authToken) {
        throw new UnauthorizedError("Authorization token is required");
      }

      // Check if body exists
      if (!req.body) {
        throw new ValidationError(
          { body: "Request body is required" },
          "Missing request fields"
        );
      }

      // Check if email exists in body
      const { email } = req.body;
      if (!email) {
        throw new ValidationError(
          { email: "Email is required" },
          "Missing required fields"
        );
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new ValidationError(
          { email: "Invalid email format" },
          "Invalid email format"
        );
      }

      const clientIp = this.getClientIp(req);

      const result = await this.questService.sendEmailOTP(
        email,
        authToken,
        clientIp
      );

      res.status(200).json({
        status: true,
        message: result.message,
        data: result.data,
      });
    }
  );

  verifyEmailOTP = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      // Get authorization token from headers
      const authToken = req.headers.authorization;

      if (!authToken) {
        throw new UnauthorizedError("Authorization token is required");
      }

      console.log("request body:", req.body);

      // Check if body exists
      if (!req.body) {
        throw new ValidationError(
          { body: "Request body is required" },
          "Missing request fields"
        );
      }

      const { email, code } = req.body;
      const errors: Record<string, string> = {};

      // Required field validation
      if (!email) errors.email = "Email is required";
      if (code === undefined) errors.code = "Code is required";

      // If required fields are missing, throw error
      if (Object.keys(errors).length > 0) {
        throw new ValidationError(errors, "Missing required fields");
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new ValidationError(
          { email: "Invalid email format" },
          "Invalid email format"
        );
      }

      // Code validation and conversion
      let numericCode: number;

      if (typeof code === "string") {
        if (!/^\d+$/.test(code)) {
          throw new ValidationError(
            { code: "Code must contain only digits" },
            "Invalid code"
          );
        }
        numericCode = parseInt(code, 10);
      } else if (typeof code === "number") {
        if (!Number.isInteger(code) || code < 0) {
          throw new ValidationError(
            { code: "Code must be a valid positive integer" },
            "Invalid code"
          );
        }
        numericCode = code;
      } else {
        throw new ValidationError(
          { code: "Code must be a string or number" },
          "Invalid code"
        );
      }

      // OTP length validation
      if (numericCode < 100000 || numericCode > 999999) {
        throw new ValidationError(
          { code: "Code must be a 6-digit number" },
          "Invalid code"
        );
      }

      const clientIp = this.getClientIp(req);

      const result = await this.questService.verifyEmailOTP(
        email,
        numericCode,
        authToken,
        clientIp
      );

      res.status(200).json({
        status: true,
        message: result.message,
        data: result.data,
      });
    }
  );

  participateEmailAddressTask = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      // Get authorization token from headers
      const authToken = req.headers.authorization;

      if (!authToken) {
        throw new UnauthorizedError("Authorization token is required");
      }

      if (!req.body) {
        throw new ValidationError(
          { body: "Request body is required" },
          "Missing request fields"
        );
      }

      // Get values from request body
      const { eventId, taskId, providerId } = req.body;

      const errors: Record<string, string> = {};
      if (!eventId) errors.eventId = "Event ID is required";
      if (!taskId) errors.taskId = "Task ID is required";
      if (!providerId) errors.providerId = "Provider ID is required";

      if (Object.keys(errors).length > 0) {
        throw new ValidationError(errors, "Missing required fields");
      }

      // Validate email format for providerId
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(providerId)) {
        throw new ValidationError(
          { providerId: "Provider ID must be a valid email address" },
          "Invalid email"
        );
      }

      const clientIp = this.getClientIp(req);

      const result = await this.questService.participateEmailAddressTask(
        eventId,
        taskId,
        providerId,
        authToken,
        clientIp
      );

      res.status(200).json({
        status: true,
        message: result.message,
        data: result.data,
      });
    }
  );

  setCustomPrerequisites = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      const { questId, customPrerequisites, action = "set" } = req.body;

      const errors: Record<string, string> = {};
      if (!questId) errors.questId = "Quest ID is required";
      if (!customPrerequisites || !Array.isArray(customPrerequisites)) {
        errors.customPrerequisites = "Custom prerequisites array is required";
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationError(errors, "Missing required fields");
      }

      // Fix: Add explicit typing to the map function
      let questObjectId: Types.ObjectId;
      let prerequisiteObjectIds: Types.ObjectId[];

      try {
        questObjectId = Types.ObjectId.createFromHexString(questId);
        prerequisiteObjectIds = customPrerequisites.map((id: string) =>
          Types.ObjectId.createFromHexString(id)
        );
      } catch (error) {
        throw new ValidationError(
          { ids: "Invalid ObjectId format" },
          "Invalid ID format"
        );
      }

      const result = await this.questService.setCustomPrerequisites(
        questObjectId,
        prerequisiteObjectIds
      );

      res.status(200).json({
        status: true,
        message: result.message,
        data: result.data,
      });
    }
  );

  setPredefinedCrossCampaignRules = asyncHandler(
    async (
      _req: Request,
      res: Response,
      _next: NextFunction
    ): Promise<void> => {
      const result = await this.questService.setPredefinedCrossCampaignRules();

      res.status(200).json({
        status: true,
        message: result.message,
      });
    }
  );

  getQuestPrerequisites = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      const { questId } = req.params;

      if (!questId) {
        throw new ValidationError(
          { questId: "Quest ID is required" },
          "Missing required fields"
        );
      }

      let questObjectId: Types.ObjectId;
      try {
        questObjectId = Types.ObjectId.createFromHexString(questId);
      } catch (error) {
        throw new ValidationError(
          { questId: "Invalid Quest ID format" },
          "Invalid ID format"
        );
      }

      const quest = await this.questService.getQuestById(questObjectId);

      if (!quest) {
        throw new NotFoundError("Quest not found");
      }

      res.status(200).json({
        status: true,
        data: {
          questId: quest._id,
          title: quest.title,
          dynamicPrerequisites: quest.dynamicPrerequisites || [],
          customPrerequisites: quest.customPrerequisites || [],
          prerequisiteCondition: quest.prerequisiteCondition || "AND",
          guardConfig: quest.guardConfig,
        },
        message: "Quest prerequisites retrieved successfully",
      });
    }
  );

  getAllQuestsWithPrerequisites = asyncHandler(
    async (
      _req: Request,
      res: Response,
      _next: NextFunction
    ): Promise<void> => {
      const quests = await this.questService.getAllQuestsWithPrerequisites();

      res.status(200).json({
        status: true,
        data: quests,
        message: "All quests with prerequisites retrieved successfully",
      });
    }
  );
}
