import { createServer } from "node:http";
import mongoose from "mongoose";
import { createApp } from "./app.js";
import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";
import { initSocket } from "./socket.js";

async function main() {
  await connectDB();
  const server = createServer(createApp());
  const io = initSocket(server);
  server.listen(env.PORT, () => console.log(`API on http://localhost:${env.PORT}`));

  const shutdown = () => {
    // closes the socket server and the underlying HTTP server
    void io.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});