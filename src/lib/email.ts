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

/* ── Welcome email sent to new waitlist signups ─────────── */
export async function sendWaitlistWelcomeEmail(to: string, firstName: string) {
  const gmail = getGmailClient();

  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a2e;">
      <h2 style="color: #6c3ce0;">Welcome, ${firstName}!</h2>
      <p>Thank you for joining the ManifestMyStory waitlist. I'm genuinely excited to have you here.</p>
      <p>
        <strong>ManifestMyStory</strong> uses AI to create deeply personalised manifestation stories —
        written for your exact goals and narrated in your own cloned voice. It's a first-of-its-kind
        audio experience designed to rewire your subconscious mind while you sleep.
      </p>
      <p style="background: linear-gradient(135deg, #6c3ce0 0%, #a855f7 100%); color: #fff; padding: 14px 20px; border-radius: 8px; text-align: center; font-weight: 600;">
        🎉 You've locked in your <strong>50% Founding Member Discount</strong>. We'll email you the code when we launch.
      </p>
      <p>While you wait, explore the science behind why this works:</p>
      <ul style="line-height: 2;">
        <li><a href="https://manifestmystory.com/science" style="color: #6c3ce0;">The Science — NLP &amp; Neuroplasticity</a></li>
        <li><a href="https://manifestmystory.com/quantum" style="color: #6c3ce0;">The Quantum Field</a></li>
        <li><a href="https://manifestmystory.com/why-it-works" style="color: #6c3ce0;">Ancient Wisdom &amp; Spirituality</a></li>
      </ul>
      <p>Stay tuned — we'll be in touch when launch is close.</p>
      <p style="margin-top: 30px;">With gratitude,<br/><strong>Michael</strong><br/>Founder, ManifestMyStory</p>
    </div>
  `;

  const raw = buildRawEmail(to, "You're on the list. Here's what's coming.", html);

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

  const summaryLines = Object.entries(responses)
    .map(([key, value]) => {
      const display = typeof value === "object" ? JSON.stringify(value) : String(value);
      return `<tr><td style="padding:4px 8px;border-bottom:1px solid #eee;"><strong>${key}</strong></td><td style="padding:4px 8px;border-bottom:1px solid #eee;">${display}</td></tr>`;
    })
    .join("");

  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 700px; margin: 0 auto; color: #1a1a2e;">
      <h2 style="color: #6c3ce0;">New Beta Feedback Submitted</h2>
      <p><strong>User:</strong> ${userName} (${userEmail})</p>
      <table style="width:100%;border-collapse:collapse;margin-top:12px;">
        ${summaryLines}
      </table>
      <p style="margin-top:20px;color:#888;font-size:13px;">
        Full responses are stored in the beta_feedback table.
      </p>
    </div>
  `;

  const raw = buildRawEmail(
    userEmail,
    `New Beta Feedback from ${userName}`,
    html,
  );

  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });
}
