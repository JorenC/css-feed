import {
  ChannelType,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { isWatched, unwatchChannel } from "../../db/channels.js";

export const data = new SlashCommandBuilder()
  .setName("unwatch")
  .setDescription("Stop mirroring a channel and clear its cached messages")
  .addChannelOption((opt) =>
    opt
      .setName("channel")
      .setDescription("Channel to stop watching")
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction: ChatInputCommandInteraction) {
  const channel = interaction.options.getChannel("channel", true);

  if (!isWatched(channel.id)) {
    await interaction.reply({ content: `#${channel.name} isn't being watched.`, ephemeral: true });
    return;
  }

  unwatchChannel(channel.id);
  await interaction.reply({ content: `Stopped watching **#${channel.name}** and cleared its cache.`, ephemeral: true });
}
