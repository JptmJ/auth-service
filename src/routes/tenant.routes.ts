import { Router } from "express";
import { tenantController } from "../controllers/tenant.controller";
import { requireAdminKey } from "../middleware/adminAuth";
import { validate } from "../middleware/validate";
import {
  createTenantSchema,
  updateTenantSchema,
  tenantIdParamSchema,
} from "../validators/tenant.validator";

const router = Router();

router.use(requireAdminKey);

/**
 * @swagger
 * tags:
 *   - name: Admin - Tenants
 *     description: Onboard/manage client projects (each tenant = one client's dedicated database)
 */

/**
 * @swagger
 * /admin/tenants:
 *   post:
 *     summary: Register a new client project (tenant) and its database
 *     tags: [Admin - Tenants]
 *     security:
 *       - adminKey: []
 *     responses:
 *       201:
 *         description: Tenant created
 */
router.post("/", validate(createTenantSchema), tenantController.create);

/**
 * @swagger
 * /admin/tenants:
 *   get:
 *     summary: List all registered tenants
 *     tags: [Admin - Tenants]
 *     security:
 *       - adminKey: []
 *     responses:
 *       200:
 *         description: List of tenants
 */
router.get("/", tenantController.list);

/**
 * @swagger
 * /admin/tenants/{tenantId}:
 *   get:
 *     summary: Get a single tenant
 *     tags: [Admin - Tenants]
 *     security:
 *       - adminKey: []
 *     responses:
 *       200:
 *         description: Tenant details
 */
router.get("/:tenantId", validate(tenantIdParamSchema), tenantController.getOne);

/**
 * @swagger
 * /admin/tenants/{tenantId}:
 *   patch:
 *     summary: Update a tenant (rotate its dbUri, rename it, or suspend it)
 *     tags: [Admin - Tenants]
 *     security:
 *       - adminKey: []
 *     responses:
 *       200:
 *         description: Tenant updated
 */
router.patch("/:tenantId", validate(updateTenantSchema), tenantController.update);

/**
 * @swagger
 * /admin/tenants/{tenantId}:
 *   delete:
 *     summary: Remove a tenant
 *     tags: [Admin - Tenants]
 *     security:
 *       - adminKey: []
 *     responses:
 *       200:
 *         description: Tenant deleted
 */
router.delete("/:tenantId", validate(tenantIdParamSchema), tenantController.remove);

export default router;
