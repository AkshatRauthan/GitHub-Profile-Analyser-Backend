import express, { Router } from 'express';
import apiRoutes from "@routes/apiRoutes";

const router: Router = express.Router();


router.use("/api", apiRoutes);

export default router;