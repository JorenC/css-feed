import { Events, type Message, type PartialMessage } from "discord.js";
import { client } from "./client.js";
import { registerCommandsForGuild } from "./registerCommands.js";
import { dispatch } from "./commands/index.js";
import { isWatched } from "../db/channels.js";
import { upsertMessage, updateMessageContent, deleteMessage } from "../db/messages.js";
import { normalizeMessage } from "./normalize.js";

export function registerEventHandlers() {
  client.once(Events.ClientReady, async (c) => {
    console.log(`Logged in as ${c.user.tag}`);
    for (const guild of c.guilds.cache.values()) {
      await registerCommandsForGuild(guild.id);
    }
  });

  client.on(Events.GuildCreate, async (guild) => {
    await registerCommandsForGuild(guild.id);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    await dispatch(interaction);
  });

  client.on(Events.MessageCreate, (message: Message) => {
    if (!isWatched(message.channelId)) return;
    upsertMessage(normalizeMessage(message));
  });

  client.on(Events.MessageUpdate, async (_old, newMessage: Message | PartialMessage) => {
    if (!isWatched(newMessage.channelId)) return;
    const full = newMessage.partial ? await newMessage.fetch().catch(() => null) : newMessage;
    if (!full) return;
    updateMessageContent(
      full.id,
      full.channelId,
      full.content ?? "",
      (full.editedAt ?? new Date()).toISOString()
    );
  });

  client.on(Events.MessageDelete, (message: Message | PartialMessage) => {
    if (!isWatched(message.channelId)) return;
    deleteMessage(message.id, message.channelId);
  });
}
