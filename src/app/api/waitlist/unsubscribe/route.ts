import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const sanitizedEmail = email.trim().toLowerCase();

  try {
    await prisma.waitlistEntry.delete({
      where: { email: sanitizedEmail },
    });
  } catch {
    // If entry doesn't exist, still show success — don't reveal membership status
  }

  const siteUrl = process.env.NEXTAUTH_URL || "https://manifestmystory.com";
  return new NextResponse(
    `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Unsubscribed — ManifestMyStory</title></head>
<body style="margin:0;padding:0;background-color:#0e0e0e;font-family:'Inter',Helvetica,Arial,sans-serif;color:#e8e4db;display:flex;align-items:center;justify-content:center;min-height:100vh;">
<div style="max-width:480px;text-align:center;padding:40px;">
  <div style="font-family:Georgia,serif;font-size:13px;font-weight:300;letter-spacing:0.25em;text-transform:uppercase;color:#8DBF7A;margin-bottom:32px;">ManifestMyStory</div>
  <h1 style="font-family:Georgia,serif;font-size:28px;font-weight:300;color:#f0ece3;margin-bottom:16px;">You've been unsubscribed.</h1>
  <p style="font-size:15px;color:#9e9a91;line-height:1.6;margin-bottom:24px;">We're sorry to see you go. You will no longer receive emails from ManifestMyStory.</p>
  <a href="${siteUrl}" style="color:#8DBF7A;text-decoration:none;font-size:14px;">Return to ManifestMyStory</a>
</div>
</body>
</html>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}
