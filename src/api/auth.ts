import type { NextFunction, Request, Response } from "express";
import { config } from "../config.js";

export function requireApiKey(req: Request, res: Response, next: NextFunction) {
  if (!config.apiKey) {
    next();
    return;
  }
  const provided = req.header("x-api-key");
  if (provided !== config.apiKey) {
    res.status(401).json({ error: "Invalid or missing X-Api-Key header" });
    return;
  }
  next();
}
