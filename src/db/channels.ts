import { db } from "./index.js";

export interface WatchedChannel {
  channel_id: string;
  guild_id: string;
  name: string;
  watched_at: string;
}

const insertStmt = db.prepare(`
  INSERT INTO watched_channels (channel_id, guild_id, name, watched_at)
  VALUES (@channel_id, @guild_id, @name, @watched_at)
  ON CONFLICT(channel_id) DO UPDATE SET name = excluded.name
`);

const deleteStmt = db.prepare(`DELETE FROM watched_channels WHERE channel_id = ?`);
const deleteMessagesStmt = db.prepare(`DELETE FROM messages WHERE channel_id = ?`);
const getStmt = db.prepare(`SELECT * FROM watched_channels WHERE channel_id = ?`);
const listStmt = db.prepare(`SELECT * FROM watched_channels ORDER BY watched_at ASC`);

export function watchChannel(channel: { channelId: string; guildId: string; name: string }): void {
  insertStmt.run({
    channel_id: channel.channelId,
    guild_id: channel.guildId,
    name: channel.name,
    watched_at: new Date().toISOString(),
  });
}

export function unwatchChannel(channelId: string): void {
  deleteStmt.run(channelId);
  deleteMessagesStmt.run(channelId);
}

export function isWatched(channelId: string): boolean {
  return !!getStmt.get(channelId);
}

export function getWatchedChannel(channelId: string): WatchedChannel | undefined {
  return getStmt.get(channelId) as WatchedChannel | undefined;
}

export function listWatchedChannels(): WatchedChannel[] {
  return listStmt.all() as WatchedChannel[];
}
