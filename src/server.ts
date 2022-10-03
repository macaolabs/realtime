import * as dotenv from "dotenv";
dotenv.config();

import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";
import app from "./app";
const cors = require("cors");
const localtunnel = require("localtunnel");

const PORT = process.env.PORT || 3000;
app.set("port", PORT);
app.use(
  cors({
    origin: `http://localhost:${PORT}`,
    credentials: true,
  })
);
const http = require("http").Server(app);
const io = require("socket.io")(http);

const pubClient = createClient({
  url: process.env.REDIS_URL,
  password: process.env.REDIS_PASSWORD,
});
const subClient = pubClient.duplicate();
const db = pubClient.duplicate();

app.get("/status", (req: any, res: any) => {
  res.send({
    status: "ok",
  });
});

app.get("/", (req: any, res: any) => {
  res.sendFile("index.html", {
    root: __dirname,
  });
});

(async () => {
  await Promise.all([pubClient.connect(), subClient.connect(), db.connect()]);

  io.adapter(createAdapter(pubClient, subClient));
  io.on("connection", async (socket: any) => {
    await db.LPUSH("u", `${socket.id}`);
    console.log("a user connected", socket.id);
    socket.on("disconnect", () => {
      console.log(`a user disconnected [${socket.id}]`);
      db.LREM(`u`, 1, `${socket.id}`);
    });
    io.emit("users", {
      message: "users",
      data: await db.LRANGE("u", 0, -1),
    });
    socket.on("c:move", (move: any) => {
      console.log("c:move" + move);
      io.emit("s:status", {
        message: "pong",
        data: {},
        id: socket.id,
      });
    });
  });

  http.listen(PORT, async () => {
    console.log(`listening on *:${PORT}`);
    if (process.env.NODE_ENV === "development") {
      const tunnel = await localtunnel({ port: PORT, subdomain: "swt-bank" });
      console.log("Server listening on http://localhost:" + PORT);
      console.log("Tunnel:https://" + tunnel.clientId + ".loca.lt");
      tunnel.on("close", () => {
        console.log("Tunnel closed");
      });
      process.on("exit", () => {
        tunnel.close();
      });
    }
  });
})();
