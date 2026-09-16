import { Router } from "express";
import { listWatchedChannels } from "../../db/channels.js";
import { getLastMessages } from "../../db/messages.js";

export const feedRouter = Router();

feedRouter.get("/", (_req, res) => {
  const channels = listWatchedChannels().map((c) => ({
    id: c.channel_id,
    name: c.name,
    guildId: c.guild_id,
    messages: getLastMessages(c.channel_id),
  }));

  res.json({ channels });
});
