import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWaitlistWelcomeEmail } from "@/lib/email";

function capitalizeFirst(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export async function POST(req: NextRequest) {
  try {
    const { firstName, email, source } = await req.json();

    if (!firstName || typeof firstName !== "string" || firstName.trim().length === 0) {
      return NextResponse.json({ error: "First name is required." }, { status: 400 });
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    }

    const sanitizedName = capitalizeFirst(firstName.trim().slice(0, 100));
    const sanitizedEmail = email.trim().toLowerCase().slice(0, 255);
    const sanitizedSource = typeof source === "string" && source.trim() ? source.trim().slice(0, 100) : "direct";

    // Check if already on waitlist
    const existing = await prisma.waitlistEntry.findUnique({
      where: { email: sanitizedEmail },
    });

    if (existing) {
      // Don't reveal if email exists — return success silently
      // Still send welcome email in case they missed it the first time
      sendWaitlistWelcomeEmail(sanitizedEmail, existing.firstName, existing.memberNumber).catch((err) =>
        console.error("[WAITLIST_EMAIL_ERROR]", err)
      );
      return NextResponse.json({ success: true, firstName: existing.firstName });
    }

    const entry = await prisma.waitlistEntry.create({
      data: {
        firstName: sanitizedName,
        email: sanitizedEmail,
        source: sanitizedSource,
      },
    });

    // Send welcome email (non-blocking — don't fail the request if email fails)
    sendWaitlistWelcomeEmail(sanitizedEmail, sanitizedName, entry.memberNumber).catch((err) =>
      console.error("[WAITLIST_EMAIL_ERROR]", err)
    );

    return NextResponse.json({ success: true, firstName: sanitizedName });
  } catch (error) {
    console.error("[WAITLIST_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
