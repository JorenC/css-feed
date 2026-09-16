import {
  ChannelType,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { watchChannel } from "../../db/channels.js";
import { upsertMessage } from "../../db/messages.js";
import { normalizeMessage } from "../normalize.js";
import { config } from "../../config.js";

export const data = new SlashCommandBuilder()
  .setName("watch")
  .setDescription("Start mirroring a channel into the live feed")
  .addChannelOption((opt) =>
    opt
      .setName("channel")
      .setDescription("Channel to watch")
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction: ChatInputCommandInteraction) {
  const channel = interaction.options.getChannel("channel", true);
  if (channel.type !== ChannelType.GuildText || !interaction.guildId) {
    await interaction.reply({ content: "Please pick a text channel in this server.", ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const fullChannel = await interaction.guild!.channels.fetch(channel.id);
  if (!fullChannel || !fullChannel.isTextBased()) {
    await interaction.editReply("Couldn't access that channel.");
    return;
  }

  watchChannel({ channelId: channel.id, guildId: interaction.guildId, name: fullChannel.name ?? channel.id });

  let seeded = 0;
  try {
    const history = await fullChannel.messages.fetch({ limit: config.maxMessagesPerChannel });
    const chronological = [...history.values()].reverse();
    for (const msg of chronological) {
      upsertMessage(normalizeMessage(msg));
      seeded++;
    }
  } catch (err) {
    console.error(`Failed to seed history for #${channel.name}:`, err);
  }

  await interaction.editReply(
    `Now watching **#${channel.name}**. Seeded ${seeded} historical message(s); new messages will stream in from here.`
  );
}
