import { Router } from "express";
import { UserProgressController } from "../../controllers/user.progress.controller";

const router = Router();
const userProgressController = new UserProgressController();

// User Progress Routes
router.get("/user-progress/:userId", userProgressController.getUserProgress);
router.post("/user-activity", userProgressController.updateUserActivity);
router.post("/quest-completion", userProgressController.processQuestCompletion);
router.post(
  "/check-meter-visibility",
  userProgressController.checkMeterVisibility
);

// Admin Routes
router.post("/admin/safety-check", userProgressController.runDailySafetyCheck);
router.post(
  "/admin/init-level-rewards",
  userProgressController.initializeLevelRewards
);
router.post(
  "/admin/trigger-safety-check",
  userProgressController.triggerSafetyCheck
);
router.get(
  "/admin/scheduler-status",
  userProgressController.getSchedulerStatus
);

export default router;
