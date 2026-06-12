# Auth Microservice

A generic, reusable authentication microservice built with Node.js, TypeScript, Express, and MongoDB.
Designed to be shared across multiple applications using the `appId` field — each app's users are isolated by `appId`.

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in real values:
   ```
   cp .env.example .env
   ```
   - Set `MONGO_URI` with your actual DB password and a database name.
   - Set `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` to long random strings
     (e.g. run `openssl rand -hex 64` twice).

3. Run in development:
   ```
   npm run dev
   ```

4. Build & run in production:
   ```
   npm run build
   npm start
   ```

## API Endpoints

Base path: `/api/auth`

| Method | Endpoint    | Auth required | Description                      |
|--------|-------------|---------------|-----------------------------------|
| POST   | /register   | No            | Create a new user for an app      |
| POST   | /login      | No            | Login, returns access+refresh tokens |
| POST   | /refresh    | No            | Exchange refresh token for new pair |
| POST   | /logout     | No            | Revoke a refresh token             |
| GET    | /me         | Yes (Bearer)  | Get current user's profile         |

### Request bodies

**POST /register**
```json
{
  "appId": "fortunecms",
  "name": "John Doe",
  "email": "john@example.com",
  "password": "Passw0rd123"
}
```

**POST /login**
```json
{
  "appId": "fortunecms",
  "email": "john@example.com",
  "password": "Passw0rd123"
}
```

**POST /refresh**
```json
{ "refreshToken": "<refresh_token>" }
```

**POST /logout**
```json
{ "refreshToken": "<refresh_token>" }
```

**GET /me**
Header: `Authorization: Bearer <access_token>`

## Using this service from other microservices

Other services only need `JWT_ACCESS_SECRET` and the `verifyAccessToken` logic
(copy `src/utils/jwt.ts`'s `verifyAccessToken` + `TokenPayload`, or call this
service's `/api/auth/me` endpoint) to validate incoming requests.
