import { QuestController } from "@controllers/quest.controller";
import { UserProgressController } from "@controllers/user.progress.controller";
import { Router } from "express";

const router = Router();
const questController = new QuestController();
const userProgressController = new UserProgressController();

// Campaigns Routes
router.get("/tents", questController.fetchCampaigns);
router.get("/tents/all", questController.fetchCampaignsViaAirLyft);

// Quests Routes
router.get("/quests", questController.fetchAllQuests);
router.get("/quests/:eventId", questController.fetchQuests);

// Connection Token Route
router.get("/connection-token/:provider", questController.fetchConnectionToken);

// Player Info Routes
router.get("/me", questController.fetchMe);
router.get(
  "/user-task-participation/:eventId",
  questController.fetchUserTaskParticipation
);
router.get(
  "/stored-participation/:eventId",
  questController.getUserStoredParticipation
);
router.get("/user-progress/:userId", userProgressController.getUserProgress);

// Event Connections Routes
router.get(
  "/event-connections/:eventId",
  questController.fetchEventConnections
);
router.post("/create-event-connection", questController.createEventConnection);

// Participate in Quest Routes
router.post(
  "/participate/twitter-follow",
  questController.participateTwitterFollow
);
router.post(
  "/participate/discord-join",
  questController.participateDiscordJoin
);
router.post("/participate/link-task", questController.participateLinkTask);
router.post(
  "/participate/email-task",
  questController.participateEmailAddressTask
);

// Sync Tents and Quests Routes
router.post("/sync/tents-and-quests", questController.syncTentsAndQuests);
router.get("/tents-with-quests", questController.getAllTentsWithQuests);
router.post(
  "/quests/custom-prerequisites",
  questController.setCustomPrerequisites
);
router.get(
  "/quests/:questId/prerequisites",
  questController.getQuestPrerequisites
);
router.post(
  "/quests/set-cross-campaign-rules",
  questController.setPredefinedCrossCampaignRules
);
router.get(
  "/quests/all-with-prerequisites",
  questController.getAllQuestsWithPrerequisites
);

// Email OTP Routes
router.post("/send-otp", questController.sendEmailOTP);
router.post("/verify-otp", questController.verifyEmailOTP);

router.post("/user-activity", userProgressController.updateUserActivity);
router.post("/quest-completion", userProgressController.processQuestCompletion);
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
