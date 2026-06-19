# @yourorg/auth-client

The standard way every new project connects to the common auth service.
Copy this `sdk/` folder into a new project (or publish it once to a private
npm registry and `npm install @yourorg/auth-client` everywhere instead).

## Setup in a new project

```ts
import { createAuthClient, verifyAccessToken } from "@yourorg/auth-client";

const authClient = createAuthClient({
  baseUrl: "https://auth.yourcompany.com/api",
  tenantId: "fortunecms", // this project's tenant id, created once via the admin API
});
```

## Talking to the auth service (register/login/refresh/logout)

```ts
const { user, tokens } = await authClient.login({
  email: "john@example.com",
  password: "Passw0rd123",
});
```

## Protecting this project's OWN routes

Don't call the auth service over the network on every request — verify the
JWT locally instead (fast, no extra network hop). Use the same
`JWT_ACCESS_SECRET` value this project's `.env` has configured (it must
match the auth service's secret):

```ts
import express from "express";
const app = express();

app.get(
  "/orders",
  verifyAccessToken(process.env.JWT_ACCESS_SECRET!),
  (req, res) => {
    // req.user = { userId, appId, roles }
    res.json({ orders: [] });
  }
);
```
