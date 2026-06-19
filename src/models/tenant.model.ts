import { Schema, model, Document } from "mongoose";

/**
 * Lives in the MASTER database only.
 * One document per client project you sell this auth service to.
 *
 * `tenantId` is the value every request to this service must send in the
 * `X-Tenant-Id` header so the service knows which client's database to use.
 * `dbUri` is a full MongoDB connection string — it can point to:
 *   - a different database name on the SAME shared MongoDB cluster
 *     (cheapest, still fully separate data files), or
 *   - a completely separate MongoDB cluster dedicated to that one client
 *     (maximum isolation, more cost/ops — good for a client who pays for it
 *     or has compliance requirements).
 * Both are just "a connection string" to this service, so you can mix and
 * match per client without any code changes.
 */
export interface ITenant extends Document {
  tenantId: string;
  name: string;
  dbUri: string;
  status: "active" | "suspended";
  createdAt: Date;
  updatedAt: Date;
}

const tenantSchema = new Schema<ITenant>(
  {
    tenantId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    dbUri: {
      type: String,
      required: true,
      select: false, // never include in default queries/JSON responses
    },
    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
    },
  },
  { timestamps: true }
);

export const Tenant = model<ITenant>("Tenant", tenantSchema);
