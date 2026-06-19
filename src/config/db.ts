import mongoose from "mongoose";
import { env } from "./env";

/**
 * Connects the default mongoose connection to the MASTER database.
 * The master database is the control plane: it stores the tenant registry
 * (src/models/tenant.model.ts) — i.e. which client/project maps to which
 * dedicated database. It does NOT store any client's actual users/tokens.
 *
 * Each client's own users/tokens live in a separate database, connected to
 * lazily and on demand by src/config/dbManager.ts.
 */
export const connectMasterDB = async (): Promise<void> => {
  try {
    mongoose.set("strictQuery", true);

    await mongoose.connect(env.masterMongoUri);

    console.log("✅ Master DB (tenant registry) connected successfully");

    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️  Master DB disconnected");
    });

    mongoose.connection.on("error", (err) => {
      console.error("❌ Master DB connection error:", err);
    });
  } catch (error) {
    console.error("❌ Failed to connect to master DB:", error);
    process.exit(1);
  }
};
