import { Router } from "express";
import { ChannelType } from "discord.js";
import { client } from "../../discord/client.js";
import { listWatchedChannels } from "../../db/channels.js";

export const channelsRouter = Router();

channelsRouter.get("/", (_req, res) => {
  const watchedIds = new Set(listWatchedChannels().map((c) => c.channel_id));

  const channels = [...client.channels.cache.values()]
    .filter((c) => c.type === ChannelType.GuildText)
    .map((c: any) => ({
      id: c.id,
      name: c.name,
      guildId: c.guildId,
      guildName: c.guild?.name ?? null,
      position: c.position ?? null,
      watched: watchedIds.has(c.id),
    }))
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  res.json({ channels });
});
