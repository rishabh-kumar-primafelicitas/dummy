import { QuestController } from "@controllers/quest.controller";
import { Router } from "express";

const router = Router();
const questController = new QuestController();

router.get("/quests/:eventId", questController.fetchQuests);

// Campaigns and Quests
router.get("/campaigns", questController.fetchCampaigns);
router.get("/campaigns/all", questController.fetchCampaignsViaAirLyft);
router.get("/quests", questController.fetchAllQuests);

// Generate Connection Token
router.get("/connection-token/:provider", questController.fetchConnectionToken);

// User Info
router.get("/me", questController.fetchMe);
router.get(
  "/user-task-participation/:eventId",
  questController.fetchUserTaskParticipation
);

// Event Connections
router.get(
  "/event-connections/:eventId",
  questController.fetchEventConnections
);
router.post("/create-event-connection", questController.createEventConnection);

// Participate in Task
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

// Sync endpoints
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

// Get stored participation data
router.get(
  "/stored-participation/:eventId",
  questController.getUserStoredParticipation
);

// Email OTP endpoints
router.post("/send-otp", questController.sendEmailOTP);
router.post("/verify-otp", questController.verifyEmailOTP);

export default router;
