import type { Message } from "discord.js";
import type { NormalizedMessage } from "../db/messages.js";

export function normalizeMessage(message: Message): NormalizedMessage {
  return {
    id: message.id,
    channelId: message.channelId,
    authorId: message.author?.id ?? "unknown",
    authorName: message.author?.username ?? "unknown",
    authorAvatar: message.author?.displayAvatarURL?.() ?? null,
    content: message.content ?? "",
    createdAt: message.createdAt.toISOString(),
    editedAt: message.editedAt ? message.editedAt.toISOString() : null,
    attachments: [...message.attachments.values()].map((a) => ({
      url: a.url,
      name: a.name,
      contentType: a.contentType ?? null,
    })),
  };
}
