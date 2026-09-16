import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const config = {
  discordToken: required("DISCORD_TOKEN"),
  discordClientId: required("DISCORD_CLIENT_ID"),
  port: Number(process.env.PORT ?? 3000),
  apiKey: process.env.API_KEY || null,
  allowedOrigin: process.env.ALLOWED_ORIGIN || "*",
  dbPath: process.env.DB_PATH || "./data/css-feed.db",
  maxMessagesPerChannel: Number(process.env.MAX_MESSAGES_PER_CHANNEL ?? 100),
};
