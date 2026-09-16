import { REST, Routes } from "discord.js";
import { config } from "../config.js";
import { commandData } from "./commands/index.js";

const rest = new REST().setToken(config.discordToken);

export async function registerCommandsForGuild(guildId: string): Promise<void> {
  try {
    await rest.put(Routes.applicationGuildCommands(config.discordClientId, guildId), {
      body: commandData,
    });
    console.log(`Registered slash commands for guild ${guildId}`);
  } catch (err) {
    console.error(`Failed to register commands for guild ${guildId}:`, err);
  }
}
