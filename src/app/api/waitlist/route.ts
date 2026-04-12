import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { firstName, email } = await req.json();

    if (!firstName || typeof firstName !== "string" || firstName.trim().length === 0) {
      return NextResponse.json({ error: "First name is required." }, { status: 400 });
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    }

    const sanitizedName = firstName.trim().slice(0, 100);
    const sanitizedEmail = email.trim().toLowerCase().slice(0, 255);

    // Check if already on waitlist
    const existing = await prisma.waitlistEntry.findUnique({
      where: { email: sanitizedEmail },
    });

    if (existing) {
      // Don't reveal if email exists — return success silently
      return NextResponse.json({ success: true });
    }

    await prisma.waitlistEntry.create({
      data: {
        firstName: sanitizedName,
        email: sanitizedEmail,
      },
    });

    // TODO: Trigger welcome email via Resend/SendGrid when configured
    // For now, entries are stored in the waitlist_entries table

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[WAITLIST_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
