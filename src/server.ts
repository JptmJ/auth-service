import app from "./app";
import { connectMasterDB } from "./config/db";
import { closeAllTenantConnections } from "./config/dbManager";
import { env } from "./config/env";

const startServer = async () => {
  // Only the master (control-plane) DB connects at boot. Each client's own
  // database is connected to lazily, the first time a request for that
  // tenant arrives — see src/config/dbManager.ts.
  await connectMasterDB();

  const server = app.listen(env.port, () => {
    console.log(`🚀 Common auth service running on port ${env.port} [${env.nodeEnv}]`);
  });

  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received, shutting down gracefully...`);
    server.close(async () => {
      await closeAllTenantConnections();
      process.exit(0);
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
};

startServer().catch((error) => {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
});
