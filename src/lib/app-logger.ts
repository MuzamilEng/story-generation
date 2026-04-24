import { prisma } from "@/lib/prisma";
import { getIO } from "@/lib/socket";

export type LogLevel = "info" | "warn" | "error";

export interface LogEntry {
  level: LogLevel;
  source: string;
  message: string;
  meta?: Record<string, unknown>;
  userId?: string;
}

export interface AppLogRow {
  id: string;
  level: string;
  source: string;
  message: string;
  meta: unknown;
  userId: string | null;
  createdAt: Date;
}

/**
 * Saves a log to the database and emits it via Socket.IO
 * to all connected admin clients in real time.
 */
export async function appLog(entry: LogEntry) {
  try {
    const row = await prisma.appLog.create({
      data: {
        level: entry.level,
        source: entry.source,
        message: entry.message,
        meta: entry.meta ?? undefined,
        userId: entry.userId ?? null,
      },
    });

    // Emit to all admins connected on the /admin-logs namespace
    const io = getIO();
    if (io) {
      io.of("/admin-logs").emit("new-log", row);
    }

    return row;
  } catch (err) {
    console.error("[appLog] failed to persist log:", err);
  }
}
