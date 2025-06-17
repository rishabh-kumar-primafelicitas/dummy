import { Router } from "express";
import { AuthController } from "@controllers/auth.controller";
import { authenticate } from "middlewares/auth.middleware";
import { requireSuperAdmin } from "middlewares/authorization.middleware";

const router = Router();
const authController = new AuthController();

// Public routes
router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/refresh", authController.refreshToken);
router.get("/verify-email/:token", authController.verifyEmail);
router.post("/check-username", authController.checkUsername);
router.get("/public/me", authController.publicMe);

// Protected routes
router.post("/logout", authenticate, authController.logout);
router.get("/me", authenticate, authController.me);

// Forgot password routes
router.post("/send-otp", authController.sendPasswordResetOtp);
router.post("/verify-otp", authController.verifyOtp);
router.post("/forgot-password", authController.forgotPassword);

// Super admin only routes
router.post(
  "/support-managers",
  authenticate,
  requireSuperAdmin,
  authController.createSupportManager
);
router.get(
  "/support-managers",
  authenticate,
  requireSuperAdmin,
  authController.getAllSupportManager
);
router.delete(
  "/support-managers/:id",
  authenticate,
  requireSuperAdmin,
  authController.deleteSupportManager
);
router.get(
  "/players",
  authenticate,
  requireSuperAdmin,
  authController.getAllPlayers
);
router.delete(
  "/players/:id",
  authenticate,
  requireSuperAdmin,
  authController.deletePlayer
);

export default router;
