# Common Auth Service

A single, shared authentication microservice used by **every** project you build and
sell to clients. Each client project gets its own **dedicated database** — their
users, passwords, and sessions never touch another client's data — while you still
only run, deploy, and maintain **one** codebase and **one** running service.

This document explains what changed from the original version, how the new
architecture works, the full file structure, and how to set it up, onboard a
new client, and connect a brand-new project to it.

---

## 1. What changed, and why

The original version was already a generic, reusable auth service, but all clients
shared **one** MongoDB database and were separated only by an `appId` field on each
document. That's "logical" isolation: a bug, a bad query, or a leaked admin
credential could expose every client's users at once, and you couldn't give one
client their own backup schedule, region, or scaling.

This version adds **physical** isolation: every client project ("tenant") gets its
own MongoDB database — possibly even its own MongoDB cluster — and the service
figures out which one to use on every request. You still deploy **one** service;
new client databases are added by registering them, not by redeploying or copying
code.

| | Before | Now |
|---|---|---|
| Databases | 1 shared database for all clients | 1 dedicated database per client |
| Isolation | `appId` field per document | Separate physical database per tenant |
| Adding a client | Add rows to the same DB | Register a tenant (1 API call), gets its own DB |
| Tenant identified by | `appId` in the request body | `X-Tenant-Id` header |
| Used by new projects | Copy `jwt.ts` manually | Drop in the `sdk/` client (see §6) |

---

## 2. How it works (the mental model)

There are now **two kinds of database** in play:

1. **The master database** (one, owned by this service) — a small "phone book"
   that stores which tenant (client project) maps to which database connection
   string. This is the only database the service connects to automatically when
   it starts up.
2. **Tenant databases** (one per client) — where that client's actual `User` and
   `RefreshToken` documents live. The service connects to these *lazily*, the
   first time a request for that tenant arrives, and keeps the connection open
   and reuses it after that.

Every request to `/api/auth/*` must include an `X-Tenant-Id` header. A small
middleware (`src/middleware/tenant.ts`) reads that header, looks up the tenant in
the master database (cached in memory for a minute so this isn't a DB hit on every
single request), opens (or reuses) a connection to that tenant's own database, and
attaches it to `req.tenant`. Every controller and service function from then on
reads/writes through that connection only — there is no code path by which one
tenant's request can touch another tenant's data.

```
   X-Tenant-Id: fortunecms          ┌───────────────────────────┐
   ───────────────────────────────▶│    Common Auth Service     │
                                    │     (one deployment)       │
                                    │                            │
                                    │  1. looks up "fortunecms"  │──▶ Master DB
                                    │     in the master DB       │   (tenant registry)
                                    │  2. opens/reuses a         │
                                    │     connection to its      │──▶ fortunecms_db
                                    │     own database            │   (that client's
                                    └───────────────────────────┘    users & tokens)
```

A second, smaller client ("acmecorp") sending the same kind of request with
`X-Tenant-Id: acmecorp` gets routed to a completely different database —
`acmecorp_db` — automatically, with zero extra code.

---

## 3. Full directory structure

```
common-auth-service/
├── src/
│   ├── app.ts                     Express app: middleware, routes, swagger, rate limits
│   ├── server.ts                  Boot: connects master DB, starts HTTP server, graceful shutdown
│   ├── config/
│   │   ├── env.ts                 Loads & validates all environment variables
│   │   ├── db.ts                  Connects to the MASTER database only
│   │   ├── dbManager.ts           Core multi-tenancy engine: tenantId -> live DB connection
│   │   └── swagger.ts             OpenAPI spec generation (documents X-Tenant-Id / X-Admin-Key)
│   ├── middleware/
│   │   ├── tenant.ts              Reads X-Tenant-Id header, attaches req.tenant (id + connection)
│   │   ├── adminAuth.ts           Protects the tenant-management endpoints with X-Admin-Key
│   │   ├── auth.ts                Verifies JWT access tokens; cross-checks tenant on the token
│   │   ├── validate.ts            Generic Zod request validation
│   │   └── errorHandler.ts        404 + centralized error -> JSON response
│   ├── models/
│   │   ├── tenant.model.ts        Tenant registry schema (lives in the master DB)
│   │   ├── user.model.ts          User schema + per-connection model factory
│   │   └── token.model.ts         RefreshToken schema + per-connection model factory
│   ├── services/
│   │   ├── auth.service.ts        Register/login/refresh/logout/profile logic (takes a connection)
│   │   └── tenant.service.ts      Create/list/update/delete tenants, cache invalidation
│   ├── controllers/
│   │   ├── auth.controller.ts     HTTP layer for the auth endpoints
│   │   └── tenant.controller.ts   HTTP layer for the admin tenant endpoints
│   ├── routes/
│   │   ├── index.ts               Mounts /auth and /admin/tenants
│   │   ├── auth.routes.ts         /api/auth/* - register, login, refresh, logout, me
│   │   └── tenant.routes.ts       /api/admin/tenants/* - onboard/manage client projects
│   ├── validators/
│   │   ├── auth.validator.ts      Zod schemas for auth request bodies
│   │   └── tenant.validator.ts    Zod schemas for tenant admin request bodies
│   ├── utils/
│   │   ├── jwt.ts                 Sign/verify access & refresh tokens
│   │   ├── password.ts            bcrypt hashing
│   │   ├── apiError.ts            Typed HTTP errors
│   │   └── apiResponse.ts         Consistent { success, message, data } envelope
│   └── views/developerUX.ts       Landing page / health check HTML (unchanged, cosmetic)
├── sdk/                            Drop-in client for every NEW project to use this service
│   ├── src/index.ts                createAuthClient() + verifyAccessToken() middleware
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md                   Usage guide for integrating a new project
├── scripts/
│   └── createTenant.ts             CLI: register a new client without calling the HTTP API
├── .env.example                    Documents every required environment variable
├── docker-compose.yml              Local dev: master DB + an example tenant DB
├── Dockerfile                      Production image build (unchanged)
├── package.json
├── tsconfig.json
└── README.md                       This file
```

Everything under `config/dbManager.ts`, `middleware/tenant.ts`, `models/tenant.model.ts`,
`sdk/`, and `scripts/createTenant.ts` is new in this version; everything else is the
original code, adjusted to work per-tenant instead of against one global connection.

---

## 4. Setup

```bash
npm install
cp .env.example .env
```

Fill in `.env`:
- `MASTER_MONGO_URI` — connection string for the master/control-plane database
  (this can be a small free-tier MongoDB Atlas cluster; it only ever stores a
  handful of tenant documents).
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — generate with `openssl rand -hex 64`,
  run twice.
- `ADMIN_API_KEY` — generate the same way; this guards the tenant-onboarding
  endpoints, treat it like a root password.

Run it:
```bash
npm run dev      # development, auto-restart
npm run build && npm start   # production
```

On boot, the service connects **only** to `MASTER_MONGO_URI`. No client database
is touched until a request for that client arrives.

---

## 5. Onboarding a new client project (creating its dedicated database)

You don't redeploy or change code to add a client — you register a tenant.

**Option A — CLI (no server running required, good for deploy scripts):**
```bash
npm run create-tenant -- --id fortunecms --name "Fortune CMS" --uri "mongodb+srv://user:pass@cluster.mongodb.net/fortunecms_db"
```

**Option B — Admin HTTP API (good for an internal admin dashboard later):**
```bash
curl -X POST http://localhost:4000/api/admin/tenants \
  -H "X-Admin-Key: <your ADMIN_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "fortunecms",
    "name": "Fortune CMS",
    "dbUri": "mongodb+srv://user:pass@cluster.mongodb.net/fortunecms_db"
  }'
```

Other admin endpoints (all require `X-Admin-Key`):
- `GET /api/admin/tenants` — list every client
- `GET /api/admin/tenants/:tenantId` — view one
- `PATCH /api/admin/tenants/:tenantId` — rotate its `dbUri`, rename it, or set
  `"status": "suspended"` to instantly cut off a non-paying client without
  deleting their data
- `DELETE /api/admin/tenants/:tenantId` — remove the registry entry (their actual
  database is untouched — delete/back it up separately, on your own schedule)

That `dbUri` can point anywhere — see §7 for the tradeoffs.

---

## 6. Connecting a new project to this service (the part you asked about: "when I create something new, it will be connected to this service only")

Every new project you build should **not** reimplement login/registration — it
should call this one service. The `sdk/` folder is the standard way to do that
consistently across every project:

```ts
import { createAuthClient, verifyAccessToken } from "@yourorg/auth-client";

const authClient = createAuthClient({
  baseUrl: "https://auth.yourcompany.com/api",
  tenantId: "fortunecms", // the tenantId you registered in §5
});

// Anywhere in the new project:
const { user, tokens } = await authClient.login({ email, password });
```

To protect the new project's *own* routes (e.g. `GET /orders`), don't call this
service over the network on every request — verify the JWT locally and instantly
using the same `JWT_ACCESS_SECRET`:

```ts
app.get("/orders", verifyAccessToken(process.env.JWT_ACCESS_SECRET!), (req, res) => {
  // req.user = { userId, appId, roles }
});
```

Practically: copy the `sdk/` folder into each new project (or publish it once to
a private npm registry — GitHub Packages or Verdaccio both work well for a small
team — and `npm install @yourorg/auth-client` everywhere instead of copying
files). Full usage guide: `sdk/README.md`.

---

## 7. Choosing how isolated each client's database is

A tenant's `dbUri` is just a MongoDB connection string, so you can mix strategies
per client depending on what they're paying for / require:

- **Same shared MongoDB cluster, different database name** — e.g.
  `mongodb+srv://cluster.mongodb.net/clientA_db` and `.../clientB_db` on the same
  cluster. Cheapest, still fully separate collections/data files, good default
  for most clients.
- **Fully separate MongoDB cluster per client** — a dedicated Atlas project/
  cluster (or self-hosted instance) just for one client. Maximum isolation
  (separate backups, separate scaling, separate region if needed) — use this for
  a client who specifically pays for or requires it (common with healthcare/
  finance clients, or just your bigger accounts).

Nothing in the code needs to change either way — it's purely what string you put
in `dbUri` when you register that tenant.

---

## 8. Security notes

- **Admin API**: `ADMIN_API_KEY` is the master switch for creating/suspending
  client databases. In production, also restrict `/api/admin/*` at the network
  level (VPN, IP allow-list, or a separate internal-only ingress) — a single
  shared secret is enough to get started but shouldn't be your only layer once
  you have real clients depending on this.
- **JWT secret is shared across tenants.** This is intentional and safe *because*
  isolation comes from routing to separate databases, not from the secret. A
  token's `appId` claim is also cross-checked against the `X-Tenant-Id` header
  on every authenticated request (`src/middleware/auth.ts`), so a token issued
  for one client can never be replayed against another client's data even if it
  somehow ended up in the wrong place.
- **`dbUri` is never returned by the admin API**, even right after you create a
  tenant — only `tenantId`, `name`, `status`, timestamps.
- Keep `.env` and the master database backups outside of source control — losing
  the master database means losing the map of which client's data lives where.

---

## 9. API reference

Base path: `/api`

### Auth — every request needs `X-Tenant-Id: <tenantId>`

| Method | Endpoint | Auth | Body |
|---|---|---|---|
| POST | /auth/register | — | `{ name, email, password }` |
| POST | /auth/login | — | `{ email, password }` |
| POST | /auth/refresh | — | `{ refreshToken }` |
| POST | /auth/logout | — | `{ refreshToken }` |
| GET  | /auth/me | Bearer token | — |

### Admin — every request needs `X-Admin-Key: <key>`

| Method | Endpoint | Body |
|---|---|---|
| POST | /admin/tenants | `{ tenantId, name, dbUri }` |
| GET | /admin/tenants | — |
| GET | /admin/tenants/:tenantId | — |
| PATCH | /admin/tenants/:tenantId | any of `{ name, dbUri, status }` |
| DELETE | /admin/tenants/:tenantId | — |

Full interactive docs at `/docs` once the service is running (Swagger UI).

---

## 10. Migration notes if you had the old version running

- `MONGO_URI` is gone — replaced by `MASTER_MONGO_URI` (a different, much
  smaller database — don't point it at your old shared users database).
- `appId` is no longer accepted in the `/register` and `/login` request bodies —
  it now comes from the `X-Tenant-Id` header instead. Update any existing
  callers.
- Every existing client's data (currently mixed together by `appId` in one
  database) needs a one-time migration: export each `appId`'s documents and
  import them into that client's new dedicated database, then register that
  client as a tenant pointing at it. Happy to help write that migration script
  if you want it — it's a quick one.

---

## 11. Other improvements worth doing (not implemented yet — flagging per your "let me know what else to change")

These are genuinely good next steps, roughly in priority order, that weren't
built into this pass to keep the change reviewable:

1. **Email verification & password reset flows.** Right now `isVerified` exists
   on the user model but nothing ever sets it. Needs an email-sending dependency
   (Resend, SES, Postmark) and two new endpoints plus short-lived signed tokens.
2. **Per-tenant rate limiting**, not just global — so one noisy/abused client
   can't degrade the service for everyone else. `express-rate-limit` supports a
   custom `keyGenerator`; trivial to key by `req.tenant.id`.
3. **Audit logging** of admin actions (who created/suspended/deleted which
   tenant, and when) — important once more than one person has the admin key.
4. **Replace the single `ADMIN_API_KEY`** with real admin accounts (their own
   login, via this same service, with an `admin` role) once more than one person
   needs access — much better than everyone sharing one secret.
5. **Move secrets out of `.env`** into a proper secrets manager (Doppler, AWS
   Secrets Manager, Vault) once there are more than a couple of client `dbUri`
   values to track — `.env` files get unwieldy and risky fast.
6. **Structured logging + monitoring** (e.g. pino + a hosted log sink, and
   uptime/error alerting) so a problem with one client's database doesn't go
   unnoticed.
7. **Optional: per-tenant JWT secrets** instead of one shared secret, if a
   client specifically requires their tokens be cryptographically independent
   from every other client's (most won't need this — the database separation
   already provides real isolation).

Happy to implement any of these next — just say which one(s).
