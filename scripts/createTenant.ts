/**
 * Usage:
 *   npm run create-tenant -- --id fortunecms --name "Fortune CMS" --uri "mongodb+srv://.../fortunecms_db"
 *
 * IMPORTANT: --uri must include a database name in its path
 * (".../fortunecms_db"), not just the bare cluster host. Without one,
 * MongoDB silently defaults to a shared database called "test" and every
 * tenant ends up colliding in the same database instead of getting its own.
 *
 * Connects to the master DB and delegates to tenantService.create() — the
 * SAME function the admin HTTP API uses — so the CLI and the HTTP route can
 * never drift apart or provision tenants differently. That function:
 *   1. Validates the dbUri has a real database name.
 *   2. Opens the tenant's own database and creates its `users` and
 *      `refreshtokens` collections (with indexes) immediately, instead of
 *      waiting for the first real signup.
 *   3. Only THEN writes the tenant's registry entry into the master DB.
 */
import mongoose from "mongoose";
import { env } from "../src/config/env";
import { tenantService, extractDbName } from "../src/services/tenant.service";

const parseArgs = () => {
  const args = process.argv.slice(2);
  const result: Record<string, string> = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, "");
    result[key] = args[i + 1];
  }

  return result;
};

const printDeveloperInfo = (tenantId: string, name: string, dbUri: string) => {
  const dbName = extractDbName(dbUri);
  const baseUrl = `http://localhost:${env.port}/api`;
  const header = `X-Tenant-Id: ${tenantId}`;

  console.log("");
  console.log(`✅ Tenant "${tenantId}" (${name}) created and provisioned.`);
  console.log(`   Database: "${dbName}" (collections: users, refreshtokens)`);
  console.log("");
  console.log("──────────────────────────────────────────────────────────");
  console.log(" DEVELOPER INFO — save this for whoever integrates this app");
  console.log("──────────────────────────────────────────────────────────");
  console.log(`tenantId:   ${tenantId}`);
  console.log(`baseUrl:    ${baseUrl}`);
  console.log(`header:     ${header}`);
  console.log("");
  console.log("Example .env for the consuming project's SDK config:");
  console.log("──────────────────────────────────────────────────────────");
  console.log(`AUTH_BASE_URL=${baseUrl}`);
  console.log(`AUTH_TENANT_ID=${tenantId}`);
  console.log("");
  console.log("curl examples:");
  console.log("──────────────────────────────────────────────────────────");
  console.log(`# Register
curl -X POST ${baseUrl}/auth/register \\
  -H "Content-Type: application/json" \\
  -H "${header}" \\
  -d '{"email":"user@example.com","password":"Str0ngP@ss!","name":"Jane Doe"}'

# Login
curl -X POST ${baseUrl}/auth/login \\
  -H "Content-Type: application/json" \\
  -H "${header}" \\
  -d '{"email":"user@example.com","password":"Str0ngP@ss!"}'

# Refresh
curl -X POST ${baseUrl}/auth/refresh \\
  -H "Content-Type: application/json" \\
  -H "${header}" \\
  -d '{"refreshToken":"<refresh_token_from_login>"}'

# Me
curl -X GET ${baseUrl}/auth/me \\
  -H "${header}" \\
  -H "Authorization: Bearer <access_token_from_login>"`);
  console.log("──────────────────────────────────────────────────────────");
  console.log("");
};

const main = async () => {
  const { id, name, uri } = parseArgs();

  if (!id || !name || !uri) {
    console.error('Usage: npm run create-tenant -- --id <tenantId> --name "<name>" --uri "<mongo uri>"');
    process.exit(1);
  }

  await mongoose.connect(env.masterMongoUri);

  try {
    // tenantService.create() validates the dbUri has a real database name,
    // provisions the tenant's collections/indexes, and THEN writes the
    // registry doc — all in one place, shared with the HTTP admin API.
    await tenantService.create({ tenantId: id, name, dbUri: uri });
    printDeveloperInfo(id, name, uri);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`❌ Failed to create tenant: ${message}`);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

main().catch((error) => {
  console.error("❌ Failed to create tenant:", error);
  process.exit(1);
});
