import express from "express";
import cors from "cors";
import { config } from "../config.js";
import { requireApiKey } from "./auth.js";
import { channelsRouter } from "./routes/channels.js";
import { messagesRouter } from "./routes/messages.js";

export function createServer() {
  const app = express();

  app.use(cors({ origin: config.allowedOrigin }));
  app.use(express.json());

  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  app.use("/api/channels", requireApiKey, channelsRouter);
  app.use("/api/channels", requireApiKey, messagesRouter);

  return app;
}
