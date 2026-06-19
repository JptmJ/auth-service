import { z } from "zod";

const tenantIdSchema = z
  .string()
  .min(2, "tenantId must be at least 2 characters")
  .regex(/^[a-z0-9-]+$/, "tenantId may only contain lowercase letters, numbers, and hyphens");

export const createTenantSchema = z.object({
  body: z.object({
    tenantId: tenantIdSchema,
    name: z.string().min(1, "name is required"),
    dbUri: z.string().min(1, "dbUri is required"),
  }),
});

export const updateTenantSchema = z.object({
  params: z.object({
    tenantId: tenantIdSchema,
  }),
  body: z
    .object({
      name: z.string().min(1).optional(),
      dbUri: z.string().min(1).optional(),
      status: z.enum(["active", "suspended"]).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "Provide at least one field to update",
    }),
});

export const tenantIdParamSchema = z.object({
  params: z.object({
    tenantId: tenantIdSchema,
  }),
});
