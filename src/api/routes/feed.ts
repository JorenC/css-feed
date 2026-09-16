import { Router } from "express";
import { listWatchedChannels } from "../../db/channels.js";
import { getLastMessages, updateAttachments } from "../../db/messages.js";
import { refreshExpiringAttachmentUrls } from "../../discord/attachments.js";

export const feedRouter = Router();

feedRouter.get("/", async (_req, res) => {
  const channels = listWatchedChannels().map((c) => ({
    id: c.channel_id,
    name: c.name,
    guildId: c.guild_id,
    messages: getLastMessages(c.channel_id),
  }));

  const allMessages = channels.flatMap((c) => c.messages);
  await refreshExpiringAttachmentUrls(allMessages, updateAttachments);

  res.json({ channels });
});
