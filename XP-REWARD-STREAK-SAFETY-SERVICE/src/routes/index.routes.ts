import { Router } from "express";
import v1Routes from "./v1/index";

const router = Router();

// Register v1 routes
router.use("/v1", v1Routes);

export { router as indexRoutes };
export default router;
