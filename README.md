# css-feed

A single Node.js process that:

1. Runs a Discord bot connected to your server's Gateway (so it sees every message in real time).
2. Mirrors messages from whichever channels you pick into a local SQLite file, capped at the last 100 messages per channel.
3. Serves that data over a small JSON API that any other app can poll.

One process, one host (Railway), no separate database service, no frontend. Netlify isn't
part of this: Netlify Functions can't hold the persistent connection Discord's Gateway requires,
and since the consuming "live app" is a separate project that just polls this API, there's nothing
for Netlify to host here.

## How channel selection works

There's no admin UI. Use Discord slash commands (restricted to members with **Manage Server**):

- `/watch #channel` — start mirroring a channel; also backfills up to the last 100 existing messages.
- `/unwatch #channel` — stop mirroring it and clear its cache.
- `/status` — list currently watched channels and how many messages are cached for each.

## The API

All endpoints are under `/api`. If `API_KEY` is set, every request needs an `X-Api-Key` header.

- `GET /api/health` → `{ ok: true }`
- `GET /api/channels` → every text channel the bot can see, each flagged `watched: true/false`. Use this to build the frontend's channel selector — only `watched` channels have message data.
- `GET /api/channels/:channelId/messages` → `{ channelId, channelName, guildId, messages: [...] }`, oldest → newest, up to `MAX_MESSAGES_PER_CHANNEL` (default 100). 404 if that channel isn't watched.

There's no push/websocket layer on purpose — you asked for whatever has the least integration
cost for the consuming app. Have it poll `GET /api/channels/:channelId/messages` every few
seconds; each response is the full current snapshot (edits and deletions just show up), so there's
no cursor/state to manage on the client. The "typewriter" live feel you wanted is a rendering
choice in that app: when it sees a message it hasn't shown before, animate the text in instead of
just appending it — no backend event for this is needed.

## Discord app setup

1. Create an application at the Discord Developer Portal, add a Bot to it.
2. Under **Bot**, enable the **Message Content Intent** (required to read message text).
3. Grab the bot **Token** (`DISCORD_TOKEN`) and the application's **Client ID** (`DISCORD_CLIENT_ID`).
4. Invite it to your server with the `bot` and `applications.commands` scopes, and these
   permissions: View Channels, Read Message History, Send Messages, Use Slash Commands.

## Local dev

```bash
cp .env.example .env   # fill in DISCORD_TOKEN / DISCORD_CLIENT_ID
npm install
npm run dev
```

## Deploying to Railway

1. Push this repo to GitHub, create a new Railway project from it (or `railway up` from the CLI).
2. Set the env vars from `.env.example` in the Railway service (at minimum `DISCORD_TOKEN` and
   `DISCORD_CLIENT_ID`).
3. Attach a **Volume** to the service, mounted at e.g. `/data`, and set `DB_PATH=/data/css-feed.db`.
   Without a volume, the SQLite file lives on the container's ephemeral disk and both the watched
   channel list and cached messages are lost on every redeploy (the bot doesn't auto-reseed —
   you'd just re-run `/watch` per channel).
4. Railway auto-detects the Node app via Nixpacks, runs `npm run build`, then `npm start`.
5. Point the consuming live app's `fetch()` calls at your Railway service's public URL.
