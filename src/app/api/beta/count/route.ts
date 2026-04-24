import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appLog } from "@/lib/app-logger";

const BASELINE = 101;

export async function GET() {
  try {
    const count = await prisma.betaSignup.count();
    return NextResponse.json({ count: count + BASELINE });
  } catch (error) {
    console.error("[BETA_COUNT_ERROR]", error);
    appLog({ level: "error", source: "api/beta/count", message: `Beta count error: ${error instanceof Error ? error.message : error}` });
    return NextResponse.json({ count: BASELINE });
  }
}
