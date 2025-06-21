import { QuestController } from "@controllers/quest.controller";
import { Router } from "express";

const router = Router();
const questController = new QuestController();

// Campaigns Routes
router.get("/tents", questController.fetchCampaigns);
router.get("/tents/all", questController.fetchCampaignsViaAirLyft);

// Quests Routes
router.get("/quests", questController.fetchAllQuests);
router.get("/quests/:eventId", questController.fetchQuests);

// Quiz Routes
router.get("/quizzes/:quizId/details", questController.fetchQuizDetails);
router.post(
  "/quizzes/:quizId/questions/:questionId/answer",
  questController.submitQuestionAnswer
);
// router.get("/quizzes/:quizId/progress", questController.getQuizProgress);

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
router.get(
  "/user-participations/:userId",
  questController.getUserAllParticipations
);
router.get(
  "/completed-quests-count/:userId",
  questController.getCompletedQuestsCount
);

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

export default router;
