import { google } from "googleapis";

const {
  GMAIL_CLIENT_ID,
  GMAIL_CLIENT_SECRET,
  GMAIL_REFRESH_TOKEN,
  GMAIL_USER, // Gmail account used for sending (OAuth2 authenticated)
  NOTIFICATION_EMAIL, // Where notifications go (Michael's actual inbox)
} = process.env;

function getGmailClient() {
  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN || !GMAIL_USER) {
    throw new Error("Gmail OAuth2 env vars are not configured.");
  }

  const oauth2Client = new google.auth.OAuth2(
    GMAIL_CLIENT_ID,
    GMAIL_CLIENT_SECRET,
    "https://developers.google.com/oauthplayground"
  );

  oauth2Client.setCredentials({ refresh_token: GMAIL_REFRESH_TOKEN });

  return google.gmail({ version: "v1", auth: oauth2Client });
}

function buildRawEmail(to: string, subject: string, htmlBody: string): string {
  const boundary = "boundary_" + Date.now();
  const rawParts = [
    `From: "Michael at ManifestMyStory" <${GMAIL_USER}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    Buffer.from(htmlBody).toString("base64"),
    ``,
    `--${boundary}--`,
  ];

  return Buffer.from(rawParts.join("\r\n"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/* ── Shared email theme wrapper — all styles inlined for Gmail ── */
function wrapInEmailTheme(opts: {
  eyebrow: string;
  headline: string;
  subline?: string;
  previewText?: string;
  bodyContent: string;
  footerNote: string;
  unsubscribeEmail?: string;
}): string {
  const currentYear = new Date().getFullYear();
  const siteUrl = process.env.NEXTAUTH_URL || "https://manifestmystory.com";
  const previewHidden = opts.previewText
    ? `<div style="display:none;font-size:1px;color:#0e0e0e;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${opts.previewText}</div>`
    : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ManifestMyStory</title>
</head>
<body style="margin:0;padding:0;background-color:#0e0e0e;font-family:'Inter',Helvetica,Arial,sans-serif;color:#e8e4db;-webkit-font-smoothing:antialiased;">
${previewHidden}
<div style="max-width:600px;margin:0 auto;background-color:#0e0e0e;">

  <!-- Header -->
  <div style="padding:48px 40px 36px;border-bottom:1px solid rgba(255,255,255,0.07);text-align:center;">
    <div style="font-family:'Fraunces',Georgia,serif;font-size:13px;font-weight:300;letter-spacing:0.25em;text-transform:uppercase;color:#8DBF7A;">ManifestMyStory</div>
  </div>

  <!-- Hero -->
  <div style="padding:52px 40px 44px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.07);">
    <div style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:11px;font-weight:500;letter-spacing:0.2em;text-transform:uppercase;color:#8DBF7A;margin-bottom:20px;">${opts.eyebrow}</div>
    <div style="font-family:'Fraunces',Georgia,serif;font-size:38px;font-weight:300;line-height:1.2;color:#f0ece3;margin-bottom:10px;">${opts.headline}</div>
    ${opts.subline ? `<div style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:15px;font-weight:300;color:#9e9a91;margin-top:16px;line-height:1.6;">${opts.subline}</div>` : ""}
  </div>

  <div style="height:32px;"></div>

  ${opts.bodyContent}

  <!-- Footer -->
  <div style="padding:36px 40px;text-align:center;">
    <div style="font-family:'Fraunces',Georgia,serif;font-size:11px;font-weight:300;letter-spacing:0.2em;text-transform:uppercase;color:#4a4740;margin-bottom:12px;">ManifestMyStory</div>
    <div style="font-size:12px;font-weight:300;color:#4a4740;line-height:1.7;">
      ${opts.footerNote}<br>
      <a href="${siteUrl}/api/waitlist/unsubscribe?email=${encodeURIComponent(opts.unsubscribeEmail || '')}" style="color:#6e6b63;text-decoration:none;">Unsubscribe</a> &middot; <a href="${siteUrl}/privacy" style="color:#6e6b63;text-decoration:none;">Privacy Policy</a>
      <br><br>
      &copy; ${currentYear} ManifestMyStory. All rights reserved.
    </div>
  </div>

</div>
</body>
</html>`;
}

/* ── Welcome email sent to new waitlist signups ─────────── */
export async function sendWaitlistWelcomeEmail(to: string, firstName: string, memberNumber: number) {
  const gmail = getGmailClient();
  const siteUrl = process.env.NEXTAUTH_URL || "https://manifestmystory.com";
  const displayName = firstName || "Founding Member";

  const bodyContent = `
  <!-- Founding discount badge -->
  <div style="margin:0 40px;background:linear-gradient(135deg,rgba(141,191,122,0.12) 0%,rgba(141,191,122,0.06) 100%);border:1px solid rgba(141,191,122,0.3);border-radius:12px;padding:28px 32px;text-align:center;">
    <div style="font-size:11px;font-weight:500;letter-spacing:0.18em;text-transform:uppercase;color:#8DBF7A;margin-bottom:10px;">Your founding member benefit</div>
    <div style="font-family:'Fraunces',Georgia,serif;font-size:42px;font-weight:400;color:#8DBF7A;line-height:1;margin-bottom:8px;">50% off</div>
    <div style="font-size:13px;color:#9e9a91;line-height:1.5;">Locked in for life, ${displayName}. Your discount code will be delivered<br>the moment we launch — no action needed.</div>
    <div style="margin-top:14px;padding-top:14px;border-top:1px solid rgba(141,191,122,0.15);font-size:12px;color:rgba(141,191,122,0.6);letter-spacing:0.12em;font-family:'Inter',Helvetica,Arial,sans-serif;font-weight:300;">FOUNDING MEMBER &nbsp;#${memberNumber}</div>
  </div>

  <div style="height:32px;"></div>

  <!-- What it is -->
  <div style="padding:44px 40px;border-bottom:1px solid rgba(255,255,255,0.07);">
    <div style="font-size:11px;font-weight:500;letter-spacing:0.18em;text-transform:uppercase;color:#8DBF7A;margin-bottom:16px;">What we're building</div>
    <div style="font-family:'Fraunces',Georgia,serif;font-size:22px;font-weight:300;color:#f0ece3;margin-bottom:14px;line-height:1.3;">A daily audio experience unlike anything that currently exists.</div>
    <div style="font-size:15px;font-weight:300;line-height:1.8;color:#b8b4ab;">
      <p><strong style="color:#e8e4db;font-weight:400;">ManifestMyStory</strong> uses AI to create a deeply personalized manifestation story — written specifically around your goals, your language, and your life — then narrated back to you in your own cloned voice.</p>
      <br>
      <p>Every morning, you hear <strong style="color:#e8e4db;font-weight:400;">yourself</strong> — your actual voice — telling the story of the life you're stepping into. Your goals already achieved. Your identity already shifted. Your future already real.</p>
      <br>
      <p>This isn't generic affirmations. This isn't someone else's guided meditation. This is subconscious reprogramming built entirely around <strong style="color:#e8e4db;font-weight:400;">you</strong>.</p>
    </div>

    <!-- Steps -->
    <div style="margin-top:24px;">
      <div style="display:flex;gap:20px;padding:18px 0 18px 0;">
        <div style="font-family:'Fraunces',Georgia,serif;font-size:28px;font-weight:300;color:rgba(141,191,122,0.3);min-width:36px;line-height:1;padding-top:2px;">01</div>
        <div>
          <div style="font-size:14px;font-weight:500;color:#e8e4db;margin-bottom:4px;letter-spacing:0.01em;">Share your story and goals</div>
          <div style="font-size:13px;font-weight:300;color:#9e9a91;line-height:1.6;">A guided intake conversation draws out what matters most — your vision, your language, your life.</div>
        </div>
      </div>
      <div style="display:flex;gap:20px;padding:18px 0;border-top:1px solid rgba(255,255,255,0.06);">
        <div style="font-family:'Fraunces',Georgia,serif;font-size:28px;font-weight:300;color:rgba(141,191,122,0.3);min-width:36px;line-height:1;padding-top:2px;">02</div>
        <div>
          <div style="font-size:14px;font-weight:500;color:#e8e4db;margin-bottom:4px;letter-spacing:0.01em;">AI writes your personal story</div>
          <div style="font-size:13px;font-weight:300;color:#9e9a91;line-height:1.6;">NLP-engineered, sensory-rich, first-person narrative built on your exact goals — as if they're already real.</div>
        </div>
      </div>
      <div style="display:flex;gap:20px;padding:18px 0;border-top:1px solid rgba(255,255,255,0.06);">
        <div style="font-family:'Fraunces',Georgia,serif;font-size:28px;font-weight:300;color:rgba(141,191,122,0.3);min-width:36px;line-height:1;padding-top:2px;">03</div>
        <div>
          <div style="font-size:14px;font-weight:500;color:#e8e4db;margin-bottom:4px;letter-spacing:0.01em;">Your voice is cloned</div>
          <div style="font-size:13px;font-weight:300;color:#9e9a91;line-height:1.6;">A brief recording sample captures your voice. The story is narrated back to you — in your own voice.</div>
        </div>
      </div>
      <div style="display:flex;gap:20px;padding:18px 0;border-top:1px solid rgba(255,255,255,0.06);">
        <div style="font-family:'Fraunces',Georgia,serif;font-size:28px;font-weight:300;color:rgba(141,191,122,0.3);min-width:36px;line-height:1;padding-top:2px;">04</div>
        <div>
          <div style="font-size:14px;font-weight:500;color:#e8e4db;margin-bottom:4px;letter-spacing:0.01em;">Listen daily</div>
          <div style="font-size:13px;font-weight:300;color:#9e9a91;line-height:1.6;">Every morning, your subconscious hears the most credible voice it knows — yours — telling it who you already are.</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Beta section -->
  <div style="height:32px;"></div>
  <div style="margin:0 40px;background:rgba(201,168,76,0.06);border:1px solid rgba(201,168,76,0.2);border-radius:12px;padding:32px;">
    <div style="font-size:11px;font-weight:500;letter-spacing:0.18em;text-transform:uppercase;color:#C9A84C;margin-bottom:12px;">Exclusive invitation</div>
    <div style="font-family:'Fraunces',Georgia,serif;font-size:22px;font-weight:300;color:#f0ece3;margin-bottom:14px;line-height:1.3;">${displayName}, want to help shape the final product — and get a full year free?</div>
    <div style="font-size:14px;font-weight:300;line-height:1.8;color:#b8b4ab;margin-bottom:20px;">
      We're selecting a small group of founding members to participate in our final beta before public launch. As a beta tester, you'd be among the first people in the world to experience ManifestMyStory — and your feedback would directly shape what we build.
      <br><br>
      In exchange for your honest participation, we're offering:
    </div>

    <table style="border:0;border-collapse:collapse;margin-bottom:24px;width:100%;">
      <tr><td style="padding:5px 0;font-size:14px;font-weight:300;color:#b8b4ab;line-height:1.5;vertical-align:top;width:18px;"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#C9A84C;margin-top:6px;"></span></td><td style="padding:5px 0 5px 12px;font-size:14px;font-weight:300;color:#b8b4ab;line-height:1.5;"><strong style="color:#e8e4db;font-weight:400;">1 full year of free access</strong> — complete Amplifier tier, no charge</td></tr>
      <tr><td style="padding:5px 0;font-size:14px;font-weight:300;color:#b8b4ab;line-height:1.5;vertical-align:top;width:18px;"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#C9A84C;margin-top:6px;"></span></td><td style="padding:5px 0 5px 12px;font-size:14px;font-weight:300;color:#b8b4ab;line-height:1.5;"><strong style="color:#e8e4db;font-weight:400;">Founding member status</strong> permanently on your account</td></tr>
      <tr><td style="padding:5px 0;font-size:14px;font-weight:300;color:#b8b4ab;line-height:1.5;vertical-align:top;width:18px;"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#C9A84C;margin-top:6px;"></span></td><td style="padding:5px 0 5px 12px;font-size:14px;font-weight:300;color:#b8b4ab;line-height:1.5;"><strong style="color:#e8e4db;font-weight:400;">Direct line to the founder</strong> — your feedback shapes the roadmap</td></tr>
      <tr><td style="padding:5px 0;font-size:14px;font-weight:300;color:#b8b4ab;line-height:1.5;vertical-align:top;width:18px;"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#C9A84C;margin-top:6px;"></span></td><td style="padding:5px 0 5px 12px;font-size:14px;font-weight:300;color:#b8b4ab;line-height:1.5;">If we feature your review, <strong style="color:#e8e4db;font-weight:400;">we'll send you $50</strong> as a thank you</td></tr>
    </table>

    <div style="background:rgba(255,255,255,0.04);border-left:2px solid rgba(201,168,76,0.4);padding:14px 16px;border-radius:0 6px 6px 0;font-size:13px;font-weight:300;color:#9e9a91;line-height:1.6;font-style:italic;margin-bottom:24px;">
      A note on the beta: because this is a pre-launch experience, you may occasionally encounter a "glitch in the matrix" — a small technical hiccup as we finalize the product. We only want testers who are comfortable with that possibility. Any issue will be resolved quickly, and your free year of access remains regardless of what you experience.
    </div>

    <div style="text-align:center;margin-top:4px;">
      <a href="mailto:${GMAIL_USER}?subject=Beta%20Test%20-%20I'm%20In" style="display:inline-block;background:#C9A84C;color:#0e0e0e;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:13px;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;text-decoration:none;padding:16px 36px;border-radius:4px;">Yes — I want to beta test</a>
      <div style="font-size:12px;color:#6e6b63;margin-top:10px;font-weight:300;">Reply to this email or click above. We'll be in touch with next steps.</div>
    </div>
  </div>

  <div style="height:32px;"></div>

  <!-- Science links -->
  <div style="padding:36px 40px;border-bottom:1px solid rgba(255,255,255,0.07);">
    <div style="font-size:11px;font-weight:500;letter-spacing:0.18em;text-transform:uppercase;color:#9e9a91;margin-bottom:16px;">While you wait — explore the science</div>
    <div>
      <a href="${siteUrl}/science" style="display:flex;align-items:center;gap:14px;padding:14px 0;text-decoration:none;">
        <span style="font-size:12px;color:#8DBF7A;">&rarr;</span>
        <div>
          <div style="font-size:14px;font-weight:400;color:#e8e4db;">The Science — NLP &amp; Neuroplasticity</div>
          <div style="font-size:12px;color:#6e6b63;margin-top:1px;">Why your brain responds differently to your own voice</div>
        </div>
      </a>
      <a href="${siteUrl}/why-it-works" style="display:flex;align-items:center;gap:14px;padding:14px 0;border-top:1px solid rgba(255,255,255,0.05);text-decoration:none;">
        <span style="font-size:12px;color:#8DBF7A;">&rarr;</span>
        <div>
          <div style="font-size:14px;font-weight:400;color:#e8e4db;">Ancient Wisdom &amp; Modern Practice</div>
          <div style="font-size:12px;color:#6e6b63;margin-top:1px;">What Neville Goddard knew before neuroscience could prove it</div>
        </div>
      </a>
      <a href="${siteUrl}/quantum" style="display:flex;align-items:center;gap:14px;padding:14px 0;border-top:1px solid rgba(255,255,255,0.05);text-decoration:none;">
        <span style="font-size:12px;color:#8DBF7A;">&rarr;</span>
        <div>
          <div style="font-size:14px;font-weight:400;color:#e8e4db;">The Quantum Field &amp; Consciousness</div>
          <div style="font-size:12px;color:#6e6b63;margin-top:1px;">Science catching up to what the spiritual traditions always pointed at</div>
        </div>
      </a>
    </div>
  </div>

  <div style="height:32px;"></div>`;

  const html = wrapInEmailTheme({
    eyebrow: `Welcome, ${displayName}`,
    headline: `You're on the list.<br><em style="font-style:italic;color:#8DBF7A;">Something powerful</em><br>is coming.`,
    subline: `${displayName}, you just secured your place at the beginning of something genuinely new.`,
    previewText: "You've locked in 50% off for life — and there's an exclusive invitation inside.",
    bodyContent,
    footerNote: `This email was sent to ${to} because you joined the ManifestMyStory waitlist.`,
    unsubscribeEmail: to,
  });

  const raw = buildRawEmail(to, `${displayName}, you're Founding Member #${memberNumber}`, html);

  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });
}

/* ── Notification to Michael when a beta user submits feedback ── */
export async function sendFeedbackNotification(
  userName: string,
  userEmail: string,
  responses: Record<string, unknown>,
) {
  const gmail = getGmailClient();

  const summaryRows = Object.entries(responses)
    .map(([key, value]) => {
      const display = typeof value === "object" ? JSON.stringify(value) : String(value);
      return `<tr><td style="padding:10px 14px;border-bottom:1px solid rgba(255,255,255,0.06);font-size:14px;font-weight:300;color:#b8b4ab;vertical-align:top;"><strong style="color:#e8e4db;font-weight:400;">${key}</strong></td><td style="padding:10px 14px;border-bottom:1px solid rgba(255,255,255,0.06);font-size:14px;font-weight:300;color:#b8b4ab;vertical-align:top;">${display}</td></tr>`;
    })
    .join("");

  const bodyContent = `
  <div style="padding:44px 40px;border-bottom:1px solid rgba(255,255,255,0.07);">
    <div style="font-size:11px;font-weight:500;letter-spacing:0.18em;text-transform:uppercase;color:#8DBF7A;margin-bottom:16px;">Feedback details</div>
    <div style="font-size:15px;font-weight:300;line-height:1.8;color:#b8b4ab;">
      <p><strong style="color:#e8e4db;font-weight:400;">User:</strong> ${userName} (${userEmail})</p>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-top:16px;">
      ${summaryRows}
    </table>
    <p style="margin-top:20px;font-size:13px;color:#6e6b63;">
      Full responses are stored in the beta_feedback table.
    </p>
  </div>

  <div style="height:32px;"></div>`;

  const html = wrapInEmailTheme({
    eyebrow: "Beta feedback received",
    headline: `New feedback from<br><em style="font-style:italic;color:#8DBF7A;">${userName}</em>`,
    subline: `${userName} just submitted their beta feedback.`,
    bodyContent,
    footerNote: `This notification was sent to ${NOTIFICATION_EMAIL || userEmail}.`,
  });

  const raw = buildRawEmail(
    NOTIFICATION_EMAIL || userEmail,
    `New Beta Feedback from ${userName}`,
    html,
  );

  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });
}
