import { client } from "./client.js";
import type { StoredMessage } from "../db/messages.js";

const REFRESH_BUFFER_MS = 60 * 60 * 1000; // refresh anything expiring within an hour
const BATCH_SIZE = 25; // Discord's refresh-urls endpoint caps how many URLs per call

function expiresAt(url: string): number | null {
  try {
    const ex = new URL(url).searchParams.get("ex");
    return ex ? parseInt(ex, 16) * 1000 : null;
  } catch {
    return null;
  }
}

function isExpiringSoon(url: string): boolean {
  const exp = expiresAt(url);
  return exp !== null && Date.now() + REFRESH_BUFFER_MS >= exp;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Discord signs attachment CDN URLs with a short-lived expiry (~24h). Messages in our cache can
 * live for much longer than that, so on the way out we refresh any URL that's expiring soon via
 * Discord's dedicated endpoint, mutate the message objects in place, and persist the fresh URLs.
 */
export async function refreshExpiringAttachmentUrls(
  messages: StoredMessage[],
  persist: (id: string, channelId: string, attachments: StoredMessage["attachments"]) => void
): Promise<void> {
  const staleUrls = new Set<string>();
  for (const msg of messages) {
    for (const a of msg.attachments) {
      if (isExpiringSoon(a.url)) staleUrls.add(a.url);
    }
  }
  if (staleUrls.size === 0) return;

  const urlMap = new Map<string, string>();
  for (const batch of chunk([...staleUrls], BATCH_SIZE)) {
    try {
      const result = (await client.rest.post("/attachments/refresh-urls", {
        body: { attachment_urls: batch },
      })) as { refreshed_urls: { original: string; refreshed: string }[] };
      for (const { original, refreshed } of result.refreshed_urls) {
        urlMap.set(original, refreshed);
      }
    } catch (err) {
      console.error("Failed to refresh attachment URLs:", err);
    }
  }
  if (urlMap.size === 0) return;

  for (const msg of messages) {
    let changed = false;
    for (const a of msg.attachments) {
      const fresh = urlMap.get(a.url);
      if (fresh) {
        a.url = fresh;
        changed = true;
      }
    }
    if (changed) persist(msg.id, msg.channelId, msg.attachments);
  }
}
