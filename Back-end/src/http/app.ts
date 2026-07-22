import express, { type ErrorRequestHandler } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRoutes from "../auth/auth.routes";
import matchesRoutes from "./matches.routes";
import decksRoutes from "./decks.routes";

export const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

const configuredOrigins = (process.env.FRONTEND_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

app.use(cors({
  credentials: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type"],
  origin(origin, callback) {
    if (!origin || configuredOrigins.includes(origin.replace(/\/$/, ""))) {
      callback(null, true);
      return;
    }
    callback(new Error("Origin is not allowed by CORS."));
  }
}));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ success: true, service: "chrono-http-backend" });
});
app.use("/auth", authRoutes);
app.use("/matches", matchesRoutes);
app.use("/decks", decksRoutes);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found." });
});

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  console.error("Unhandled HTTP API error:", error);
  const isCorsError = error instanceof Error && error.message.includes("CORS");
  res.status(isCorsError ? 403 : 500).json({
    success: false,
    message: isCorsError ? "Origin is not allowed." : "Internal server error."
  });
};
app.use(errorHandler);
