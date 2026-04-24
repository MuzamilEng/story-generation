import { createServer } from "http";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import { setIO } from "./src/lib/socket";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new SocketIOServer(httpServer, {
    path: "/api/socketio",
    addTrailingSlash: false,
    cors: {
      origin: dev ? "*" : false,
    },
  });

  // Store the io instance globally so the logger can use it
  setIO(io);

  // Admin logs namespace — only admins should connect
  const adminLogs = io.of("/admin-logs");

  adminLogs.on("connection", (socket) => {
    console.log("[socket.io] Admin connected to /admin-logs:", socket.id);

    socket.on("disconnect", () => {
      console.log("[socket.io] Admin disconnected:", socket.id);
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Socket.IO server running on path /api/socketio`);
  });
});
