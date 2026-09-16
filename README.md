# css-feed

A single Node.js process that:

1. Runs a Discord bot connected to your server's Gateway (so it sees every message in real time).
2. Mirrors messages from whichever channels you pick into a local SQLite file, capped at the last 100 messages per channel.
3. Serves that data over a small JSON API that any other app can poll.

One process, one host, no separate database service, no frontend. It runs as a Docker container on
a plain Linux VM (this project's instance runs on an Oracle Cloud "Always Free" VM — genuinely
free forever, not a usage credit that runs out). Netlify/Railway/Fly aren't part of this: Netlify
Functions can't hold the persistent connection Discord's Gateway requires, and Railway/Fly both
turn into a real recurring bill for a process that has to stay up 24/7. Since the consuming "live
app" is a separate project that just polls this API, there's nothing for a PaaS to host here anyway.

## How channel selection works

There's no admin UI. Use Discord slash commands (restricted to members with **Manage Server**):

- `/watch #channel` — start mirroring a channel; also backfills up to the last 100 existing messages.
- `/unwatch #channel` — stop mirroring it and clear its cache.
- `/status` — list currently watched channels and how many messages are cached for each.

## The API

All endpoints are under `/api`. If `API_KEY` is set (it is, in production), every request except
`/api/health` needs an `X-Api-Key: <key>` header — `/api/health` is deliberately left open for
uptime checks.

- `GET /api/health` → `{ ok: true }` (no auth required)
- `GET /api/channels` → every text channel the bot can see, each flagged `watched: true/false`. Use this to build the frontend's channel selector — only `watched` channels have message data.
- `GET /api/channels/:channelId/messages` → `{ channelId, channelName, guildId, messages: [...] }`, oldest → newest, up to `MAX_MESSAGES_PER_CHANNEL` (default 100). 404 if that channel isn't watched.
- `GET /api/feed` → `{ channels: [{ id, name, guildId, messages: [...] }, ...] }` for *every* watched channel in one call — use this when you want to automatically process all watched channels without first calling `/api/channels` and looping. `/api/channels` + per-channel `/messages` still exist for when you only need one channel or the full unwatched channel list (e.g. building a selector to add new ones via `/watch`).

### Images: avatars vs. attachments

Both are already in every message object — `authorAvatar` (a direct CDN URL) and `attachments: [{
url, name, contentType }]`. Avatar URLs are stable and can be used directly in an `<img>` forever
(until the user changes their avatar). **Attachment URLs are not** — Discord signs them with a
short expiry (roughly 24h), and messages live in this feed's cache far longer than that. To handle
this, `/api/channels/:channelId/messages` and `/api/feed` both check every attachment URL on the
way out and, if it's expiring soon, call Discord's `/attachments/refresh-urls` endpoint to get a
fresh one before responding — and persist the refreshed URL back to SQLite so it doesn't need
refreshing again for another ~24h. This happens automatically; the consuming app doesn't need to
do anything special, just use `attachments[].url` as given in each response.

There's no push/websocket layer on purpose — least integration cost for the consuming app. Have it
poll `GET /api/channels/:channelId/messages` every few seconds with the `X-Api-Key` header set;
each response is the full current snapshot (edits and deletions just show up), so there's no
cursor/state to manage on the client. The "typewriter" live feel is a rendering choice in that app:
when it sees a message it hasn't shown before, animate the text in instead of just appending it —
no backend event needed for this.

## Discord app setup

1. Create an application at the Discord Developer Portal, add a Bot to it.
2. Under **Bot**, enable the **Message Content Intent** (required to read message text) — this is
   a toggle under "Privileged Gateway Intents" on the Bot page, separate from the Token.
3. Grab the bot **Token** (`DISCORD_TOKEN`, under the "Token" section of the Bot page — click
   **Reset Token** if it's not already visible) and the application's **Client ID**
   (`DISCORD_CLIENT_ID`, under **OAuth2 → General**).
4. Under **OAuth2 → URL Generator**: check scopes `bot` and `applications.commands`; check
   permissions **View Channels**, **Read Message History**, **Send Messages**, **Use Slash
   Commands**. Use the generated URL to invite the bot to your server.

## Local dev

```bash
cp .env.example .env   # fill in DISCORD_TOKEN / DISCORD_CLIENT_ID
npm install
npm run dev
```

## Deploying (Docker on any Linux VM)

This is how it's actually deployed — a Docker container on a plain Ubuntu VM, driven by
`docker-compose.yml` (builds from the repo's `Dockerfile`, mounts a named volume at `/data` for
the SQLite file so data survives restarts/redeploys, `restart: always` so it survives reboots).

### Provisioning the VM (Oracle Cloud Always Free)

1. Sign up at oracle.com/cloud/free. A card is required for identity verification but Always Free
   resources are never billed.
2. Compute → Instances → Create Instance. Image: **Canonical Ubuntu** (swap out the Oracle Linux
   default). Shape: **VM.Standard.E2.1.Micro**, confirmed "Always Free eligible" (more reliably
   available than the bigger Ampere A1 free shape, which often shows capacity errors).
3. Networking: if this is the account's first instance, there's no VCN/subnet yet — use the
   inline **"Create new virtual cloud network"** option, subnet type **Public**.
4. Security: "Shielded Instance" toggle — leave it **off**. It protects against boot-level/firmware
   tampering, which isn't this project's threat model, and makes the instance harder to debug if
   anything goes wrong at boot, for no benefit here. (The real security boundary is the firewall
   rules below plus keeping secrets out of git.)
5. SSH keys: **"Generate a key pair for me"**, then **Save Private Key** — this downloads a `.pem`
   used for `ssh -i <file> ubuntu@<public-ip>`.
6. **Gotcha we actually hit**: the instance-creation wizard's "Automatically assign public IPv4
   address" toggle can come out disabled/unset even when the subnet is public, so the instance can
   come up with **no public IP**. After creation, check **Instance → Networking**: if "Public IPv4
   address" shows `-`, go to **Networking → IP administration → (⋯ on the primary IP) → Edit**,
   set **Public IP type** to **Reserved public IP** (stable, won't change) → **Create new Reserved
   IP Address**. There's also a **"Connect public subnet to internet"** quick action on the
   instance's Networking tab that creates the internet gateway + a Network Security Group — run
   that too if it hasn't already (it only creates networking plumbing, not the IP itself).
7. Open the firewall — two layers, both required:
   - **Cloud level**: instance → subnet link → **Default Security List** → **Add Ingress Rules**:
     source `0.0.0.0/0`, TCP, destination port `3000` (port 22/SSH is open by default already).
   - **OS level** (once SSH'd in, see below): `sudo iptables -I INPUT 6 -m state --state NEW -p tcp
     --dport 3000 -j ACCEPT && sudo netfilter-persistent save`. Oracle's Ubuntu image ships with
     iptables rules that drop non-SSH traffic by default; ufw is not what's active here.

### Deploying the app

```bash
ssh -i <your-key>.pem ubuntu@<public-ip>

curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
exit   # log back in so the docker group takes effect

git clone https://github.com/JorenC/css-feed.git
cd css-feed
nano .env   # DISCORD_TOKEN, DISCORD_CLIENT_ID, API_KEY, ALLOWED_ORIGIN, MAX_MESSAGES_PER_CHANNEL
            # leave PORT and DB_PATH out — docker-compose.yml already sets those correctly

docker compose up -d --build
docker compose logs -f   # look for "Logged in as ..." and "Feed API listening on port 3000"
```

To redeploy after a code change: `git pull && docker compose up -d --build` on the VM.

### Verifying it's live

```bash
curl -i http://<public-ip>:3000/api/health                                    # no key needed, expect 200
curl -i http://<public-ip>:3000/api/channels                                  # expect 401 (key enforced)
curl -i -H "X-Api-Key: <key>" http://<public-ip>:3000/api/channels            # expect 200 + channel list
```
