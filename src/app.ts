import express, { Application, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";
import { healthPage, homePage } from "./views/developerUX";

import { env } from "./config/env";
import routes from "./routes";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler";

const app: Application = express();

// Security & utility middleware
app.use(helmet());
app.use(
  cors({
    origin: env.allowedOrigins,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(morgan(env.nodeEnv === "development" ? "dev" : "combined"));

// Rate limiter for auth endpoints to prevent brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests, please try again later.",
});
app.use("/api/auth", authLimiter);

// Tighter limiter for the admin (tenant onboarding) endpoints
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests, please try again later.",
});
app.use("/api/admin", adminLimiter);

// Health check
app.get("/health", (_req: Request, res: Response) => {
  const uptime = Math.floor(process.uptime());

  res.send(healthPage(uptime));
});

// Landing page
app.get("/", (_req, res) => {
  res.send(homePage());
});

// Swagger JSON
app.get("/swagger.json", (_req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

// Swagger UI
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API routes
app.use("/api", routes);

// 404 + error handler (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
