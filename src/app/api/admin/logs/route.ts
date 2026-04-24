import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/lib/roles";
import { appLog } from "@/lib/app-logger";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "50", 10)));
    const level = searchParams.get("level") || undefined;
    const source = searchParams.get("source") || undefined;
    const search = searchParams.get("search") || undefined;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (level) where.level = level;
    if (source) where.source = { contains: source, mode: "insensitive" };
    if (search) where.message = { contains: search, mode: "insensitive" };

    const [logs, total] = await Promise.all([
      prisma.appLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.appLog.count({ where }),
    ]);

    return NextResponse.json({
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("[admin/logs] error:", err);
    appLog({ level: "error", source: "api/admin/logs", message: `Admin logs fetch error: ${err instanceof Error ? err.message : err}` });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const level = searchParams.get("level") || undefined;
    const clearAll = searchParams.get("clearAll") === "true";

    if (id) {
      // Delete a single log entry
      await prisma.appLog.delete({ where: { id } });
      return NextResponse.json({ deleted: 1 });
    }

    if (clearAll) {
      // Delete all logs, optionally filtered by level
      const where: Record<string, unknown> = {};
      if (level) where.level = level;
      const result = await prisma.appLog.deleteMany({ where });
      return NextResponse.json({ deleted: result.count });
    }

    return NextResponse.json({ error: "Provide ?id= or ?clearAll=true" }, { status: 400 });
  } catch (err) {
    console.error("[admin/logs] delete error:", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
