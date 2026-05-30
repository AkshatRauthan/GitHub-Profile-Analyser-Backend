import express, { Router } from 'express';
import authRoutes from "@v1routes/auth.routes";
import profileRoutes from "@v1routes/profile.routes";

const router: Router = express.Router();


router.use("/auth", authRoutes);
router.use("/profiles", profileRoutes);

export default router;