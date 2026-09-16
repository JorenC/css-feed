import { Router } from "express";
import { getWatchedChannel } from "../../db/channels.js";
import { getLastMessages } from "../../db/messages.js";

export const messagesRouter = Router();

messagesRouter.get("/:channelId/messages", (req, res) => {
  const { channelId } = req.params;
  const channel = getWatchedChannel(channelId);
  if (!channel) {
    res.status(404).json({ error: "Channel is not watched (or does not exist)" });
    return;
  }

  const messages = getLastMessages(channelId);
  res.json({
    channelId,
    channelName: channel.name,
    guildId: channel.guild_id,
    messages,
  });
});
