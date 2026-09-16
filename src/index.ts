import { config } from "./config.js";
import "./db/index.js";
import { client } from "./discord/client.js";
import { registerEventHandlers } from "./discord/events.js";
import { createServer } from "./api/server.js";

registerEventHandlers();

await client.login(config.discordToken);

const app = createServer();
app.listen(config.port, () => {
  console.log(`Feed API listening on port ${config.port}`);
});

function shutdown() {
  console.log("Shutting down...");
  client.destroy();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
