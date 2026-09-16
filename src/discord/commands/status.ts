import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { listWatchedChannels } from "../../db/channels.js";
import { getLastMessages } from "../../db/messages.js";

export const data = new SlashCommandBuilder()
  .setName("status")
  .setDescription("List channels currently feeding the live app")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction: ChatInputCommandInteraction) {
  const watched = listWatchedChannels();
  if (watched.length === 0) {
    await interaction.reply({ content: "No channels are being watched yet. Use `/watch` to add one.", ephemeral: true });
    return;
  }

  const lines = watched.map((c) => {
    const count = getLastMessages(c.channel_id).length;
    return `• #${c.name} — ${count} cached message(s)`;
  });

  await interaction.reply({ content: lines.join("\n"), ephemeral: true });
}
