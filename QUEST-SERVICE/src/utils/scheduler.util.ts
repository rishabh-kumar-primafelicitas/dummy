import { CronJob } from "cron";
import { UserProgressService } from "@services/user.progress.service";
import { logger } from "@utils/logger";

export class SchedulerUtil {
  private userProgressService: UserProgressService;
  private jobs: CronJob[];

  constructor() {
    this.userProgressService = new UserProgressService();
    this.jobs = [];
  }

  initializeScheduledJobs(): void {
    // Daily safety meter check at midnight (UTC)
    const dailySafetyCheckJob = new CronJob(
      "0 0 * * *", // Run at 00:00 every day
      async () => {
        logger.info("Starting daily safety meter degradation check");

        try {
          const result =
            await this.userProgressService.processDailySafetyMeterCheck();
          logger.info(
            "Daily safety meter check completed successfully",
            result
          );
        } catch (error: any) {
          logger.error("Daily safety meter check failed:", error);
        }
      },
      null, // onComplete
      true, // start immediately
      "UTC" // timezone
    );

    // Store job reference for potential cleanup
    this.jobs.push(dailySafetyCheckJob);

    logger.info("Scheduled jobs initialized successfully", {
      totalJobs: this.jobs.length,
      jobDetails: [
        {
          name: "Daily Safety Meter Check",
          schedule: "0 0 * * *",
          timezone: "UTC",
          running: dailySafetyCheckJob.running,
        },
      ],
    });
  }

  stopAllJobs(): void {
    logger.info("Stopping all scheduled jobs");

    this.jobs.forEach((job, index) => {
      try {
        job.stop();
        logger.debug(`Stopped job ${index + 1}`);
      } catch (error: any) {
        logger.error(`Error stopping job ${index + 1}:`, error);
      }
    });

    logger.info(`Stopped ${this.jobs.length} scheduled jobs`);
  }

  getJobsStatus(): any[] {
    return this.jobs.map((job, index) => ({
      jobIndex: index + 1,
      running: job.running,
      lastDate: job.lastDate(),
      nextDate: job.nextDate(),
      cronTime: job.cronTime.source,
    }));
  }

  // Method to manually trigger safety meter check (for testing/admin purposes)
  async triggerSafetyMeterCheck(): Promise<any> {
    logger.info("Manually triggering safety meter check");

    try {
      const result =
        await this.userProgressService.processDailySafetyMeterCheck();
      logger.info("Manual safety meter check completed successfully", result);
      return result;
    } catch (error: any) {
      logger.error("Manual safety meter check failed:", error);
      throw error;
    }
  }
}
