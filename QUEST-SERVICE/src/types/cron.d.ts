import "cron";

declare module "cron" {
  interface CronJob {
    /** whether the job is currently running */
    running: boolean;
  }
}
