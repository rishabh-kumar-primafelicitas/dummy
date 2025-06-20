import { Request, Response, NextFunction } from "express";
import { UserProgressService } from "@services/user.progress.service";
import { ValidationError } from "errors/validation.error";
import { ActivityType } from "@models/interfaces/IUserProgress";
import { asyncHandler } from "@utils/async.handler.util";

export class UserProgressController {
  private userProgressService: UserProgressService;

  constructor() {
    this.userProgressService = new UserProgressService();
  }

  getUserProgress = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      const { userId } = req.params;

      if (!userId) {
        throw new ValidationError(
          { userId: "User ID is required" },
          "Missing required fields"
        );
      }

      const userProgress = await this.userProgressService.getUserProgress(
        userId
      );

      res.status(200).json({
        status: true,
        message: "User progress retrieved successfully",
        data: userProgress,
      });
    }
  );

  updateUserActivity = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      if (!req.body) {
        throw new ValidationError(
          { body: "Request body is required" },
          "Missing required fields"
        );
      }

      const { userId, activityType, questData } = req.body;

      const errors: Record<string, string> = {};
      if (!userId) errors.userId = "User ID is required";
      if (!activityType) errors.activityType = "Activity type is required";

      if (Object.keys(errors).length > 0) {
        throw new ValidationError(errors, "Missing required fields");
      }

      // Validate activity type
      if (!Object.values(ActivityType).includes(activityType)) {
        throw new ValidationError(
          {
            activityType: `Must be one of: ${Object.values(ActivityType).join(
              ", "
            )}`,
          },
          "Invalid activity type"
        );
      }

      await this.userProgressService.updateUserActivity(
        userId,
        activityType,
        questData
      );

      res.status(200).json({
        status: true,
        message: "User activity updated successfully",
      });
    }
  );

  processQuestCompletion = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      if (!req.body) {
        throw new ValidationError(
          { body: "Request body is required" },
          "Missing required fields"
        );
      }

      const { userId, quest, tentType } = req.body;

      const errors: Record<string, string> = {};
      if (!userId) errors.userId = "User ID is required";
      if (!quest) errors.quest = "Quest data is required";

      if (Object.keys(errors).length > 0) {
        throw new ValidationError(errors, "Missing required fields");
      }

      const result = await this.userProgressService.processQuestCompletion(
        userId,
        quest,
        tentType
      );

      res.status(200).json({
        status: true,
        message: "Quest completion processed successfully",
        data: result,
      });
    }
  );

  runDailySafetyCheck = asyncHandler(
    async (
      _req: Request,
      res: Response,
      _next: NextFunction
    ): Promise<void> => {
      const result =
        await this.userProgressService.processDailySafetyMeterCheck();

      res.status(200).json({
        status: true,
        message: "Daily safety meter check completed",
        data: result,
      });
    }
  );

  initializeLevelRewards = asyncHandler(
    async (
      _req: Request,
      res: Response,
      _next: NextFunction
    ): Promise<void> => {
      await this.userProgressService.initializeLevelRewards();

      res.status(200).json({
        status: true,
        message: "Level rewards initialized successfully",
      });
    }
  );

  triggerSafetyCheck = asyncHandler(
    async (
      _req: Request,
      res: Response,
      _next: NextFunction
    ): Promise<void> => {
      const { SchedulerUtil } = await import("@utils/scheduler.util");
      const scheduler = new SchedulerUtil();

      const result = await scheduler.triggerSafetyMeterCheck();

      res.status(200).json({
        status: true,
        message: "Safety meter check triggered manually",
        data: result,
      });
    }
  );

  getSchedulerStatus = asyncHandler(
    async (
      _req: Request,
      res: Response,
      _next: NextFunction
    ): Promise<void> => {
      const { SchedulerUtil } = await import("@utils/scheduler.util");
      const scheduler = new SchedulerUtil();

      const status = scheduler.getJobsStatus();

      res.status(200).json({
        status: true,
        message: "Scheduler status retrieved successfully",
        data: status,
      });
    }
  );

  checkMeterVisibility = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      if (!req.body) {
        throw new ValidationError(
          { body: "Request body is required" },
          "Missing required fields"
        );
      }

      const { userId } = req.body;

      if (!userId) {
        throw new ValidationError(
          { userId: "User ID is required" },
          "Missing required fields"
        );
      }

      await this.userProgressService.checkMeterVisibility(userId);

      res.status(200).json({
        status: true,
        message: "Meter visibility checked successfully",
      });
    }
  );
}
