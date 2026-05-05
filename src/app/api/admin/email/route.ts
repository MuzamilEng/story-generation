import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/lib/roles";
import nodemailer from "nodemailer";

function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error("SMTP env vars are not configured.");
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: false,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    tls: { ciphers: "SSLv3", rejectUnauthorized: false },
  });
}

function buildHtml(subject: string, body: string): string {
  const currentYear = new Date().getFullYear();
  const siteUrl = process.env.NEXTAUTH_URL || "https://manifestmystory.com";
  const escapedBody = body
    .split("\n")
    .map((line) => `<p style="font-size:15px;font-weight:300;line-height:1.8;color:#b8b4ab;margin:0 0 12px;">${line || "&nbsp;"}</p>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#0e0e0e;font-family:'Inter',Helvetica,Arial,sans-serif;color:#e8e4db;-webkit-font-smoothing:antialiased;">
<div style="max-width:600px;margin:0 auto;background-color:#0e0e0e;">
  <div style="padding:48px 40px 36px;border-bottom:1px solid rgba(255,255,255,0.07);text-align:center;">
    <div style="font-family:'Fraunces',Georgia,serif;font-size:13px;font-weight:300;letter-spacing:0.25em;text-transform:uppercase;color:#8DBF7A;">ManifestMyStory</div>
  </div>
  <div style="padding:44px 40px;">
    <div style="font-family:'Fraunces',Georgia,serif;font-size:28px;font-weight:300;line-height:1.3;color:#f0ece3;margin-bottom:28px;">${subject}</div>
    ${escapedBody}
  </div>
  <div style="padding:36px 40px;border-top:1px solid rgba(255,255,255,0.07);text-align:center;">
    <div style="font-size:12px;font-weight:300;color:#4a4740;line-height:1.7;">
      &copy; ${currentYear} ManifestMyStory. All rights reserved.<br>
      <a href="${siteUrl}/privacy" style="color:#6e6b63;text-decoration:none;">Privacy Policy</a>
    </div>
  </div>
</div>
</body>
</html>`;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { subject, message, userId } = body as {
      subject: string;
      message: string;
      userId?: string;
    };

    if (!subject?.trim() || !message?.trim()) {
      return NextResponse.json({ error: "Subject and message are required." }, { status: 400 });
    }

    const fromAddress = `"Michael at ManifestMyStory" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`;
    const html = buildHtml(subject.trim(), message.trim());
    const transporter = getTransporter();

    if (userId) {
      // Single user
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true, isActive: true },
      });

      if (!user) {
        return NextResponse.json({ error: "User not found." }, { status: 404 });
      }

      await transporter.sendMail({
        from: fromAddress,
        to: user.email,
        subject: subject.trim(),
        html,
      });

      return NextResponse.json({ sent: 1 });
    }

    // All users
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { email: true },
    });

    if (users.length === 0) {
      return NextResponse.json({ error: "No active users found." }, { status: 400 });
    }

    // Send in batches to avoid overwhelming SMTP server
    const batchSize = 10;
    let sent = 0;
    const failed: string[] = [];

    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (u) => {
          try {
            await transporter.sendMail({
              from: fromAddress,
              to: u.email,
              subject: subject.trim(),
              html,
            });
            sent++;
          } catch {
            failed.push(u.email);
          }
        }),
      );
    }

    return NextResponse.json({ sent, failed: failed.length, total: users.length });
  } catch (error) {
    console.error("Admin email send error:", error);
    return NextResponse.json({ error: "Failed to send email." }, { status: 500 });
  }
}
