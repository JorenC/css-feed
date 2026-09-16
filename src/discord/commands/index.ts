import type { ChatInputCommandInteraction } from "discord.js";
import * as watch from "./watch.js";
import * as unwatch from "./unwatch.js";
import * as status from "./status.js";

export const commands = [watch, unwatch, status];

export const commandData = commands.map((c) => c.data.toJSON());

const byName = new Map(commands.map((c) => [c.data.name, c.execute]));

export async function dispatch(interaction: ChatInputCommandInteraction) {
  const execute = byName.get(interaction.commandName);
  if (!execute) return;
  try {
    await execute(interaction);
  } catch (err) {
    console.error(`Command /${interaction.commandName} failed:`, err);
    const payload = { content: "Something went wrong running that command.", ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(payload.content);
    } else {
      await interaction.reply(payload);
    }
  }
}
