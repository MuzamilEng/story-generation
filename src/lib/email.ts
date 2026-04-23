import nodemailer from "nodemailer";

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
  NOTIFICATION_EMAIL,
} = process.env;

function getTransporter() {
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error("SMTP env vars (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS) are not configured.");
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: false, // STARTTLS
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    tls: {
      ciphers: "SSLv3",
      rejectUnauthorized: false,
    },
  });
}

const fromAddress = () => `"Michael at ManifestMyStory" <${SMTP_FROM || SMTP_USER}>`;

async function sendEmail(to: string, subject: string, html: string) {
  const transporter = getTransporter();
  await transporter.sendMail({
    from: fromAddress(),
    to,
    subject,
    html,
  });
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
      <a href="mailto:${SMTP_FROM || SMTP_USER}?subject=Beta%20Test%20-%20I'm%20In" style="display:inline-block;background:#C9A84C;color:#0e0e0e;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:13px;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;text-decoration:none;padding:16px 36px;border-radius:4px;">Yes — I want to beta test</a>
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

  await sendEmail(to, `${displayName}, you're Founding Member #${memberNumber}`, html);
}

/* ── Notification to Michael when a beta user submits feedback ── */
export async function sendFeedbackNotification(
  userName: string,
  userEmail: string,
  responses: Record<string, unknown>,
) {

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

  await sendEmail(
    NOTIFICATION_EMAIL || userEmail,
    `New Beta Feedback from ${userName}`,
    html,
  );
}

/* ── Beta welcome email (Day 1) — sends access code ─────── */
export async function sendBetaWelcomeEmail(to: string, firstName: string, accessCode: string) {
  const siteUrl = process.env.NEXTAUTH_URL || "https://manifestmystory.com";
  const displayName = firstName || "Beta Tester";
  const unsubUrl = `${siteUrl}/api/waitlist/unsubscribe?email=${encodeURIComponent(to)}`;

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Welcome to ManifestMyStory</title></head>
<body style="margin:0;padding:0;background-color:#0d0d0d;font-family:'Inter',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0d0d0d;min-height:100vh;">
<tr><td align="center" style="padding:40px 20px;">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
<tr><td style="padding-bottom:32px;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="font-family:'Inter',Arial,sans-serif;font-size:13px;font-weight:500;letter-spacing:0.12em;color:#8DBF7A;text-transform:uppercase;">Manifest My Story</td>
    <td align="right" style="font-family:'Inter',Arial,sans-serif;font-size:12px;color:#3a3a3a;letter-spacing:0.06em;text-transform:uppercase;">Beta Access</td>
  </tr></table>
  <div style="height:1px;background:linear-gradient(to right,#8DBF7A,transparent);margin-top:12px;"></div>
</td></tr>
<tr><td style="padding-bottom:40px;">
  <p style="margin:0 0 8px 0;font-family:'Inter',Arial,sans-serif;font-size:11px;font-weight:500;letter-spacing:0.16em;color:#8DBF7A;text-transform:uppercase;">You are in.</p>
  <h1 style="margin:0 0 24px 0;font-family:'Fraunces',Georgia,serif;font-size:42px;font-weight:300;line-height:1.15;color:#f0ede8;">Your story is<br>waiting to be built.</h1>
  <p style="margin:0;font-family:'Inter',Arial,sans-serif;font-size:16px;font-weight:300;line-height:1.75;color:#8a8a8a;">You are one of fewer than 500 people with access to ManifestMyStory before public launch. What you experience over the next few weeks is not a demo. It is the full tool — built to reprogram your subconscious while you sleep, in the one voice it cannot dismiss.</p>
</td></tr>
<tr><td style="padding-bottom:40px;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #1f2e1f;border-radius:4px;background-color:#0f1a0f;">
  <tr><td style="padding:32px;">
    <p style="margin:0 0 6px 0;font-family:'Inter',Arial,sans-serif;font-size:11px;font-weight:500;letter-spacing:0.16em;color:#8DBF7A;text-transform:uppercase;">Your beta access code</p>
    <p style="margin:0 0 24px 0;font-family:'Courier New',Courier,monospace;font-size:32px;font-weight:700;letter-spacing:0.22em;color:#f0ede8;">${accessCode}</p>
    <p style="margin:0 0 28px 0;font-family:'Inter',Arial,sans-serif;font-size:14px;font-weight:300;line-height:1.7;color:#6a6a6a;">Enter this code on the platform to activate your founding member access. Your code is personal — it grants you full Amplifier-tier access for the duration of the beta period.</p>
    <table cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="background-color:#8DBF7A;border-radius:3px;">
        <a href="${siteUrl}/beta" style="display:inline-block;padding:14px 32px;font-family:'Inter',Arial,sans-serif;font-size:13px;font-weight:500;letter-spacing:0.1em;color:#0d1a0d;text-decoration:none;text-transform:uppercase;">Enter My Code &rarr;</a>
      </td>
    </tr></table>
  </td></tr></table>
</td></tr>
<tr><td style="padding-bottom:40px;">
  <p style="margin:0 0 20px 0;font-family:'Inter',Arial,sans-serif;font-size:11px;font-weight:500;letter-spacing:0.16em;color:#8DBF7A;text-transform:uppercase;">What happens next</p>
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;"><tr>
    <td width="40" valign="top" style="padding-top:2px;"><div style="width:28px;height:28px;border:1px solid #8DBF7A;border-radius:50%;text-align:center;line-height:28px;font-family:'Inter',Arial,sans-serif;font-size:12px;font-weight:500;color:#8DBF7A;">01</div></td>
    <td valign="top" style="padding-left:16px;">
      <p style="margin:0 0 4px 0;font-family:'Inter',Arial,sans-serif;font-size:15px;font-weight:500;color:#e8e5e0;">Define your goals and proof actions</p>
      <p style="margin:0;font-family:'Inter',Arial,sans-serif;font-size:14px;font-weight:300;line-height:1.65;color:#6a6a6a;">Go deeper than a goal list. You will define what you want — and the sensory evidence that it has already arrived.</p>
    </td>
  </tr></table>
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;"><tr>
    <td width="40" valign="top" style="padding-top:2px;"><div style="width:28px;height:28px;border:1px solid #8DBF7A;border-radius:50%;text-align:center;line-height:28px;font-family:'Inter',Arial,sans-serif;font-size:12px;font-weight:500;color:#8DBF7A;">02</div></td>
    <td valign="top" style="padding-left:16px;">
      <p style="margin:0 0 4px 0;font-family:'Inter',Arial,sans-serif;font-size:15px;font-weight:500;color:#e8e5e0;">Clone your voice in under a minute</p>
      <p style="margin:0;font-family:'Inter',Arial,sans-serif;font-size:14px;font-weight:300;line-height:1.65;color:#6a6a6a;">Record a short sample. The AI captures your vocal signature and recreates it with the emotional inflection your story deserves.</p>
    </td>
  </tr></table>
  <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td width="40" valign="top" style="padding-top:2px;"><div style="width:28px;height:28px;border:1px solid #8DBF7A;border-radius:50%;text-align:center;line-height:28px;font-family:'Inter',Arial,sans-serif;font-size:12px;font-weight:500;color:#8DBF7A;">03</div></td>
    <td valign="top" style="padding-left:16px;">
      <p style="margin:0 0 4px 0;font-family:'Inter',Arial,sans-serif;font-size:15px;font-weight:500;color:#e8e5e0;">Listen tonight</p>
      <p style="margin:0;font-family:'Inter',Arial,sans-serif;font-size:14px;font-weight:300;line-height:1.65;color:#6a6a6a;">Put on headphones as you drift toward sleep. Six layers of carefully engineered audio deliver your story at the moment the subconscious is most open.</p>
    </td>
  </tr></table>
</td></tr>
<tr><td style="padding-bottom:36px;"><div style="height:1px;background-color:#1e1e1e;"></div></td></tr>
<tr><td style="padding-bottom:40px;">
  <p style="margin:0 0 16px 0;font-family:'Fraunces',Georgia,serif;font-size:22px;font-weight:300;font-style:italic;line-height:1.4;color:#c8c4be;">&ldquo;The method I am asking you to trust is the same method I used to build this platform. I am a living demonstration of the practice.&rdquo;</p>
  <p style="margin:0;font-family:'Inter',Arial,sans-serif;font-size:13px;font-weight:400;color:#4a4a4a;letter-spacing:0.04em;">— Michael, Founder</p>
</td></tr>
<tr><td style="padding-bottom:40px;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-left:2px solid #8DBF7A;"><tr><td style="padding:4px 0 4px 20px;">
    <p style="margin:0 0 10px 0;font-family:'Inter',Arial,sans-serif;font-size:13px;font-weight:500;color:#e8e5e0;letter-spacing:0.04em;">As a founding beta tester, you receive:</p>
    <p style="margin:0 0 6px 0;font-family:'Inter',Arial,sans-serif;font-size:14px;font-weight:300;color:#6a6a6a;">&rarr;&nbsp; Full Amplifier-tier access during the beta period</p>
    <p style="margin:0 0 6px 0;font-family:'Inter',Arial,sans-serif;font-size:14px;font-weight:300;color:#6a6a6a;">&rarr;&nbsp; Founding member pricing locked in at launch</p>
    <p style="margin:0 0 6px 0;font-family:'Inter',Arial,sans-serif;font-size:14px;font-weight:300;color:#6a6a6a;">&rarr;&nbsp; A direct line to the founding team</p>
    <p style="margin:0;font-family:'Inter',Arial,sans-serif;font-size:14px;font-weight:300;color:#6a6a6a;">&rarr;&nbsp; Your feedback shapes what gets built next</p>
  </td></tr></table>
</td></tr>
<tr><td style="padding-bottom:40px;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#111;border-radius:4px;border:1px solid #222;"><tr><td style="padding:24px;">
    <p style="margin:0 0 8px 0;font-family:'Inter',Arial,sans-serif;font-size:11px;font-weight:500;letter-spacing:0.14em;color:#5a5a5a;text-transform:uppercase;">Heads up</p>
    <p style="margin:0;font-family:'Inter',Arial,sans-serif;font-size:14px;font-weight:300;line-height:1.7;color:#6a6a6a;">In 48 hours we will send you a short feedback survey — about 4 minutes. Your honest response, including what doesn&apos;t work, is the most valuable thing you can give us right now. We read every single one.</p>
  </td></tr></table>
</td></tr>
<tr><td style="padding-bottom:32px;"><div style="height:1px;background-color:#1e1e1e;"></div></td></tr>
<tr><td>
  <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="font-family:'Inter',Arial,sans-serif;font-size:12px;font-weight:300;color:#3a3a3a;line-height:1.7;">
    <p style="margin:0 0 8px 0;">ManifestMyStory &middot; <a href="${siteUrl}" style="color:#8DBF7A;text-decoration:none;">manifestmystory.com</a></p>
    <p style="margin:0 0 8px 0;">Questions? Reply to this email — the founding team reads every message.</p>
    <p style="margin:0;color:#2a2a2a;">You received this because you signed up for ManifestMyStory beta access. <a href="${unsubUrl}" style="color:#3a3a3a;text-decoration:underline;">Unsubscribe</a></p>
  </td></tr></table>
</td></tr>
</table>
</td></tr></table>
</body></html>`;

  await sendEmail(to, `${displayName}, you're in. Your access code is inside.`, html);
}

/* ── Beta Day 2 email — first impressions survey ─────────── */
export async function sendBetaDay2Email(to: string, firstName: string, surveyUrl: string) {
  const siteUrl = process.env.NEXTAUTH_URL || "https://manifestmystory.com";
  const displayName = firstName || "Beta Tester";
  const unsubUrl = `${siteUrl}/api/waitlist/unsubscribe?email=${encodeURIComponent(to)}`;

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>We want to hear what happened</title></head>
<body style="margin:0;padding:0;background-color:#0d0d0d;font-family:'Inter',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0d0d0d;min-height:100vh;">
<tr><td align="center" style="padding:40px 20px;">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
<tr><td style="padding-bottom:32px;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="font-family:'Inter',Arial,sans-serif;font-size:13px;font-weight:500;letter-spacing:0.12em;color:#8DBF7A;text-transform:uppercase;">Manifest My Story</td>
    <td align="right" style="font-family:'Inter',Arial,sans-serif;font-size:12px;color:#3a3a3a;letter-spacing:0.06em;text-transform:uppercase;">Beta &mdash; Day 2</td>
  </tr></table>
  <div style="height:1px;background:linear-gradient(to right,#8DBF7A,transparent);margin-top:12px;"></div>
</td></tr>
<tr><td style="padding-bottom:36px;">
  <p style="margin:0 0 8px 0;font-family:'Inter',Arial,sans-serif;font-size:11px;font-weight:500;letter-spacing:0.16em;color:#8DBF7A;text-transform:uppercase;">First impressions</p>
  <h1 style="margin:0 0 24px 0;font-family:'Fraunces',Georgia,serif;font-size:40px;font-weight:300;line-height:1.2;color:#f0ede8;">You have heard<br>your own voice.<br><span style="font-style:italic;color:#8DBF7A;">Now tell us what happened.</span></h1>
  <p style="margin:0;font-family:'Inter',Arial,sans-serif;font-size:16px;font-weight:300;line-height:1.75;color:#8a8a8a;">You are 48 hours into something most people never experience. We have four minutes of questions for you — honest answers only. No right answers. No wrong ones. Just what actually happened when you heard your future in your own voice.</p>
</td></tr>
<tr><td style="padding-bottom:36px;">
  <p style="margin:0 0 18px 0;font-family:'Inter',Arial,sans-serif;font-size:11px;font-weight:500;letter-spacing:0.16em;color:#4a4a4a;text-transform:uppercase;">What we&apos;re asking about</p>
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td width="50%" valign="top" style="padding-right:12px;padding-bottom:14px;"><p style="margin:0 0 3px 0;font-family:'Inter',Arial,sans-serif;font-size:13px;font-weight:500;color:#c8c4be;">&rarr;&nbsp; Getting started</p><p style="margin:0;font-family:'Inter',Arial,sans-serif;font-size:13px;font-weight:300;color:#4a4a4a;">Was the setup clear? What confused you?</p></td>
      <td width="50%" valign="top" style="padding-left:12px;padding-bottom:14px;"><p style="margin:0 0 3px 0;font-family:'Inter',Arial,sans-serif;font-size:13px;font-weight:500;color:#c8c4be;">&rarr;&nbsp; Your voice clone</p><p style="margin:0;font-family:'Inter',Arial,sans-serif;font-size:13px;font-weight:300;color:#4a4a4a;">How did it sound? How did it feel?</p></td>
    </tr>
    <tr>
      <td width="50%" valign="top" style="padding-right:12px;padding-bottom:14px;"><p style="margin:0 0 3px 0;font-family:'Inter',Arial,sans-serif;font-size:13px;font-weight:500;color:#c8c4be;">&rarr;&nbsp; Your story</p><p style="margin:0;font-family:'Inter',Arial,sans-serif;font-size:13px;font-weight:300;color:#4a4a4a;">Did it feel personal? Did it include your goals?</p></td>
      <td width="50%" valign="top" style="padding-left:12px;padding-bottom:14px;"><p style="margin:0 0 3px 0;font-family:'Inter',Arial,sans-serif;font-size:13px;font-weight:500;color:#c8c4be;">&rarr;&nbsp; The audio</p><p style="margin:0;font-family:'Inter',Arial,sans-serif;font-size:13px;font-weight:300;color:#4a4a4a;">Quality, pacing, the binaural layer.</p></td>
    </tr>
    <tr>
      <td width="50%" valign="top" style="padding-right:12px;"><p style="margin:0 0 3px 0;font-family:'Inter',Arial,sans-serif;font-size:13px;font-weight:500;color:#c8c4be;">&rarr;&nbsp; What you&apos;d pay</p><p style="margin:0;font-family:'Inter',Arial,sans-serif;font-size:13px;font-weight:300;color:#4a4a4a;">Your gut reaction to pricing.</p></td>
      <td width="50%" valign="top" style="padding-left:12px;"><p style="margin:0 0 3px 0;font-family:'Inter',Arial,sans-serif;font-size:13px;font-weight:500;color:#c8c4be;">&rarr;&nbsp; Overall</p><p style="margin:0;font-family:'Inter',Arial,sans-serif;font-size:13px;font-weight:300;color:#4a4a4a;">NPS, top improvement, what to never change.</p></td>
    </tr>
  </table>
</td></tr>
<tr><td style="padding-bottom:40px;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0f1a0f;border:1px solid #1f2e1f;border-radius:4px;"><tr><td style="padding:32px;text-align:center;">
    <p style="margin:0 0 6px 0;font-family:'Inter',Arial,sans-serif;font-size:11px;font-weight:500;letter-spacing:0.16em;color:#8DBF7A;text-transform:uppercase;">Takes about 4 minutes</p>
    <p style="margin:0 0 28px 0;font-family:'Fraunces',Georgia,serif;font-size:22px;font-weight:300;font-style:italic;color:#c8c4be;line-height:1.4;">Your honest feedback is the most valuable thing<br>you can give us right now.</p>
    <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr>
      <td style="background-color:#8DBF7A;border-radius:3px;">
        <a href="${surveyUrl}" style="display:inline-block;padding:16px 40px;font-family:'Inter',Arial,sans-serif;font-size:13px;font-weight:500;letter-spacing:0.1em;color:#0d1a0d;text-decoration:none;text-transform:uppercase;">Share My Feedback &rarr;</a>
      </td>
    </tr></table>
  </td></tr></table>
</td></tr>
<tr><td style="padding-bottom:40px;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-left:2px solid #8DBF7A;"><tr><td style="padding:4px 0 4px 20px;">
    <p style="margin:0;font-family:'Inter',Arial,sans-serif;font-size:14px;font-weight:300;line-height:1.75;color:#6a6a6a;">If something didn&apos;t work — the voice clone sounded off, the story felt generic, the setup confused you — we need to know. That feedback is worth ten times more to us than a perfect rating.</p>
  </td></tr></table>
</td></tr>
<tr><td style="padding-bottom:40px;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#111;border-radius:4px;border:1px solid #222;"><tr><td style="padding:24px;">
    <p style="margin:0 0 8px 0;font-family:'Inter',Arial,sans-serif;font-size:11px;font-weight:500;letter-spacing:0.14em;color:#C9A84C;text-transform:uppercase;">One week from now</p>
    <p style="margin:0;font-family:'Inter',Arial,sans-serif;font-size:14px;font-weight:300;line-height:1.7;color:#6a6a6a;">We will follow up with five pricing questions — 90 seconds. By then you will have a real sense of what the practice is worth to you.</p>
  </td></tr></table>
</td></tr>
<tr><td style="padding-bottom:32px;"><div style="height:1px;background-color:#1e1e1e;"></div></td></tr>
<tr><td>
  <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="font-family:'Inter',Arial,sans-serif;font-size:12px;font-weight:300;color:#3a3a3a;line-height:1.7;">
    <p style="margin:0 0 8px 0;">ManifestMyStory &middot; <a href="${siteUrl}" style="color:#8DBF7A;text-decoration:none;">manifestmystory.com</a></p>
    <p style="margin:0 0 8px 0;">Questions or issues? Reply directly — we read everything.</p>
    <p style="margin:0;color:#2a2a2a;">You received this as a ManifestMyStory beta tester. <a href="${unsubUrl}" style="color:#3a3a3a;text-decoration:underline;">Unsubscribe</a></p>
  </td></tr></table>
</td></tr>
</table>
</td></tr></table>
</body></html>`;

  await sendEmail(to, `${displayName}, we want to hear what happened.`, html);
}

/* ── Beta Day 7 email — pricing pulse survey ─────────────── */
export async function sendBetaDay7Email(to: string, firstName: string, surveyUrl: string) {
  const siteUrl = process.env.NEXTAUTH_URL || "https://manifestmystory.com";
  const displayName = firstName || "Beta Tester";
  const unsubUrl = `${siteUrl}/api/waitlist/unsubscribe?email=${encodeURIComponent(to)}`;

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>90 seconds. One question set.</title></head>
<body style="margin:0;padding:0;background-color:#0d0d0d;font-family:'Inter',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0d0d0d;min-height:100vh;">
<tr><td align="center" style="padding:40px 20px;">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
<tr><td style="padding-bottom:32px;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="font-family:'Inter',Arial,sans-serif;font-size:13px;font-weight:500;letter-spacing:0.12em;color:#C9A84C;text-transform:uppercase;">Manifest My Story</td>
    <td align="right" style="font-family:'Inter',Arial,sans-serif;font-size:12px;color:#3a3a3a;letter-spacing:0.06em;text-transform:uppercase;">Beta &mdash; Day 7</td>
  </tr></table>
  <div style="height:1px;background:linear-gradient(to right,#C9A84C,transparent);margin-top:12px;"></div>
</td></tr>
<tr><td style="padding-bottom:36px;">
  <p style="margin:0 0 8px 0;font-family:'Inter',Arial,sans-serif;font-size:11px;font-weight:500;letter-spacing:0.16em;color:#C9A84C;text-transform:uppercase;">One week in</p>
  <h1 style="margin:0 0 24px 0;font-family:'Fraunces',Georgia,serif;font-size:40px;font-weight:300;line-height:1.2;color:#f0ede8;">Seven nights.<br><span style="font-style:italic;color:#C9A84C;">What is it worth to you?</span></h1>
  <p style="margin:0;font-family:'Inter',Arial,sans-serif;font-size:16px;font-weight:300;line-height:1.75;color:#8a8a8a;">You have had a week with ManifestMyStory. Not a demo. The real thing. Now we have four pricing questions — the most important data we will collect during this entire beta. It takes 90 seconds. Your honest numbers set the price at launch.</p>
</td></tr>
<tr><td style="padding-bottom:36px;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-left:2px solid #C9A84C;"><tr><td style="padding:4px 0 4px 20px;">
    <p style="margin:0 0 12px 0;font-family:'Inter',Arial,sans-serif;font-size:14px;font-weight:500;color:#e8e5e0;">Why we&apos;re asking now and not earlier</p>
    <p style="margin:0;font-family:'Inter',Arial,sans-serif;font-size:14px;font-weight:300;line-height:1.75;color:#6a6a6a;">Day 1 gut reactions and week-one considered opinions are two very different things. You have now listened multiple times. You know what it actually does. That experience is what makes your pricing response meaningful.</p>
  </td></tr></table>
</td></tr>
<tr><td style="padding-bottom:36px;">
  <p style="margin:0 0 18px 0;font-family:'Inter',Arial,sans-serif;font-size:11px;font-weight:500;letter-spacing:0.16em;color:#4a4a4a;text-transform:uppercase;">Four questions — four price points</p>
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td style="padding-bottom:14px;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td width="28" valign="top"><div style="width:6px;height:6px;background-color:#8DBF7A;border-radius:50%;margin-top:7px;"></div></td><td valign="top"><p style="margin:0 0 2px 0;font-family:'Inter',Arial,sans-serif;font-size:14px;font-weight:500;color:#c8c4be;">Too cheap to trust</p><p style="margin:0;font-family:'Inter',Arial,sans-serif;font-size:13px;font-weight:300;color:#4a4a4a;">Where you&apos;d question the quality.</p></td></tr></table></td></tr>
    <tr><td style="padding-bottom:14px;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td width="28" valign="top"><div style="width:6px;height:6px;background-color:#8DBF7A;border-radius:50%;margin-top:7px;"></div></td><td valign="top"><p style="margin:0 0 2px 0;font-family:'Inter',Arial,sans-serif;font-size:14px;font-weight:500;color:#c8c4be;">Feels like good value</p><p style="margin:0;font-family:'Inter',Arial,sans-serif;font-size:13px;font-weight:300;color:#4a4a4a;">The price where the exchange feels genuinely fair.</p></td></tr></table></td></tr>
    <tr><td style="padding-bottom:14px;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td width="28" valign="top"><div style="width:6px;height:6px;background-color:#C9A84C;border-radius:50%;margin-top:7px;"></div></td><td valign="top"><p style="margin:0 0 2px 0;font-family:'Inter',Arial,sans-serif;font-size:14px;font-weight:500;color:#c8c4be;">Getting expensive — but possible</p><p style="margin:0;font-family:'Inter',Arial,sans-serif;font-size:13px;font-weight:300;color:#4a4a4a;">Where you&apos;d pause, but might still subscribe.</p></td></tr></table></td></tr>
    <tr><td><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td width="28" valign="top"><div style="width:6px;height:6px;background-color:#8a3a3a;border-radius:50%;margin-top:7px;"></div></td><td valign="top"><p style="margin:0 0 2px 0;font-family:'Inter',Arial,sans-serif;font-size:14px;font-weight:500;color:#c8c4be;">Too expensive — I&apos;m out</p><p style="margin:0;font-family:'Inter',Arial,sans-serif;font-size:13px;font-weight:300;color:#4a4a4a;">The price where you walk away, regardless of quality.</p></td></tr></table></td></tr>
  </table>
</td></tr>
<tr><td style="padding-bottom:40px;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#12100a;border:1px solid #2a2210;border-radius:4px;"><tr><td style="padding:32px;text-align:center;">
    <p style="margin:0 0 6px 0;font-family:'Inter',Arial,sans-serif;font-size:11px;font-weight:500;letter-spacing:0.16em;color:#C9A84C;text-transform:uppercase;">90 seconds</p>
    <p style="margin:0 0 28px 0;font-family:'Fraunces',Georgia,serif;font-size:22px;font-weight:300;font-style:italic;color:#c8c4be;line-height:1.4;">Your numbers are the ones that set the price<br>for everyone who comes after you.</p>
    <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr>
      <td style="background-color:#C9A84C;border-radius:3px;">
        <a href="${surveyUrl}" style="display:inline-block;padding:16px 40px;font-family:'Inter',Arial,sans-serif;font-size:13px;font-weight:500;letter-spacing:0.1em;color:#12100a;text-decoration:none;text-transform:uppercase;">Answer 4 Questions &rarr;</a>
      </td>
    </tr></table>
  </td></tr></table>
</td></tr>
<tr><td style="padding-bottom:40px;">
  <p style="margin:0;font-family:'Inter',Arial,sans-serif;font-size:14px;font-weight:300;line-height:1.75;color:#4a4a4a;">This is the last survey we will send during the beta. After this, your access continues as normal. We are deeply grateful for the time you have given us — and for the honesty that will make this product worth building.</p>
</td></tr>
<tr><td style="padding-bottom:32px;"><div style="height:1px;background-color:#1e1e1e;"></div></td></tr>
<tr><td>
  <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="font-family:'Inter',Arial,sans-serif;font-size:12px;font-weight:300;color:#3a3a3a;line-height:1.7;">
    <p style="margin:0 0 8px 0;">ManifestMyStory &middot; <a href="${siteUrl}" style="color:#C9A84C;text-decoration:none;">manifestmystory.com</a></p>
    <p style="margin:0 0 8px 0;">Questions or issues? Reply directly — we read everything.</p>
    <p style="margin:0;color:#2a2a2a;">You received this as a ManifestMyStory beta tester. <a href="${unsubUrl}" style="color:#3a3a3a;text-decoration:underline;">Unsubscribe</a></p>
  </td></tr></table>
</td></tr>
</table>
</td></tr></table>
</body></html>`;

  await sendEmail(to, `${displayName}, seven nights in — what is it worth to you?`, html);
}
