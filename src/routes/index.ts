import { Router } from "express";
import authRoutes from "./auth.routes";
import tenantRoutes from "./tenant.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/admin/tenants", tenantRoutes);

export default router;
