import type { Server as SocketIOServer } from "socket.io";

// Use globalThis so the Socket.IO instance is shared between
// the custom server (server.ts) and Next.js API routes,
// which run in separate module contexts.
const globalForSocket = globalThis as unknown as {
  __socketIO?: SocketIOServer;
};

export function setIO(server: SocketIOServer) {
  globalForSocket.__socketIO = server;
}

export function getIO(): SocketIOServer | null {
  return globalForSocket.__socketIO ?? null;
}
