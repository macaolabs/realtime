import * as dotenv from "dotenv";
dotenv.config();

import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";
import app from "./app";

const PORT = process.env.PORT || 3000;
app.set("port", PORT);
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
    io.emit("users", await db.LRANGE("u", 0, -1));
    socket.on("c:move", (move: any) => {
      console.log("c:move" + move);
      io.emit("s:status", {
        id: socket.id,
        move,
      });
    });
  });

  http.listen(3000, function () {
    console.log("listening on *:3000");
  });
})();
