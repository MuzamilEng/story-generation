import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const BASELINE = 101;

export async function GET() {
  try {
    const count = await prisma.betaSignup.count();
    return NextResponse.json({ count: count + BASELINE });
  } catch (error) {
    console.error("[BETA_COUNT_ERROR]", error);
    return NextResponse.json({ count: BASELINE });
  }
}
