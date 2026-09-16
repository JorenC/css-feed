import { db } from "./index.js";
import { config } from "../config.js";

export interface NormalizedMessage {
  id: string;
  channelId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  content: string;
  createdAt: string;
  editedAt: string | null;
  attachments: { url: string; name: string; contentType: string | null }[];
}

export interface StoredMessage {
  id: string;
  channelId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  content: string;
  createdAt: string;
  editedAt: string | null;
  attachments: NormalizedMessage["attachments"];
}

const upsertStmt = db.prepare(`
  INSERT INTO messages (id, channel_id, author_id, author_name, author_avatar, content, created_at, edited_at, attachments)
  VALUES (@id, @channelId, @authorId, @authorName, @authorAvatar, @content, @createdAt, @editedAt, @attachments)
  ON CONFLICT(id, channel_id) DO UPDATE SET
    content = excluded.content,
    edited_at = excluded.edited_at,
    attachments = excluded.attachments
`);

const trimStmt = db.prepare(`
  DELETE FROM messages
  WHERE channel_id = ?
    AND seq NOT IN (
      SELECT seq FROM messages WHERE channel_id = ? ORDER BY seq DESC LIMIT ?
    )
`);

const updateContentStmt = db.prepare(`
  UPDATE messages SET content = ?, edited_at = ? WHERE id = ? AND channel_id = ?
`);

const deleteStmt = db.prepare(`DELETE FROM messages WHERE id = ? AND channel_id = ?`);

const updateAttachmentsStmt = db.prepare(`
  UPDATE messages SET attachments = ? WHERE id = ? AND channel_id = ?
`);

const listStmt = db.prepare(`
  SELECT * FROM messages WHERE channel_id = ? ORDER BY seq DESC LIMIT ?
`);

function rowToMessage(row: any): StoredMessage {
  return {
    id: row.id,
    channelId: row.channel_id,
    authorId: row.author_id,
    authorName: row.author_name,
    authorAvatar: row.author_avatar,
    content: row.content,
    createdAt: row.created_at,
    editedAt: row.edited_at,
    attachments: row.attachments ? JSON.parse(row.attachments) : [],
  };
}

export function upsertMessage(msg: NormalizedMessage): void {
  upsertStmt.run({
    id: msg.id,
    channelId: msg.channelId,
    authorId: msg.authorId,
    authorName: msg.authorName,
    authorAvatar: msg.authorAvatar,
    content: msg.content,
    createdAt: msg.createdAt,
    editedAt: msg.editedAt,
    attachments: JSON.stringify(msg.attachments),
  });
  trimStmt.run(msg.channelId, msg.channelId, config.maxMessagesPerChannel);
}

export function updateMessageContent(id: string, channelId: string, content: string, editedAt: string): void {
  updateContentStmt.run(content, editedAt, id, channelId);
}

export function deleteMessage(id: string, channelId: string): void {
  deleteStmt.run(id, channelId);
}

export function updateAttachments(id: string, channelId: string, attachments: NormalizedMessage["attachments"]): void {
  updateAttachmentsStmt.run(JSON.stringify(attachments), id, channelId);
}

export function getLastMessages(channelId: string, limit = config.maxMessagesPerChannel): StoredMessage[] {
  const rows = listStmt.all(channelId, limit) as any[];
  return rows.map(rowToMessage).reverse(); // oldest -> newest
}
