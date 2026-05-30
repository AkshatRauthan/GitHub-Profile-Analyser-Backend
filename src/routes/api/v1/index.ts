import express, { Router } from 'express';
import authRoutes from "@v1routes/authRoutes";

const router: Router = express.Router();


router.use("/auth", authRoutes);

export default router;