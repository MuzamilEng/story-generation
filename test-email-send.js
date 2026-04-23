/**
 * Test email script — sends a test email via Microsoft 365 SMTP (GoDaddy-managed).
 *
 * Run:  npx tsx scripts/test-email-send.ts
 */

import nodemailer from "nodemailer";

const SMTP_HOST = "smtp.office365.com";
const SMTP_PORT = 587;
const SMTP_USER = "Michael@Manifestmystory.com";
const SMTP_PASS = "Manifest007";
const SMTP_FROM = "info@Manifestmystory.com"; // alias — must be configured in M365 admin

async function main() {
  console.log("Creating SMTP transport...");
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false, // STARTTLS (upgrade after connect)
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    tls: {
      ciphers: "SSLv3",
      rejectUnauthorized: false,
    },
  });

  console.log("Verifying SMTP connection...");
  try {
    await transporter.verify();
    console.log("✓ SMTP connection verified successfully!\n");
  } catch (err) {
    console.error("✗ SMTP verification failed:", err.message);
    process.exit(1);
  }

  console.log("Sending test email...");
  const info = await transporter.sendMail({
    from: `"Manifestmystory" <${SMTP_FROM}>`,
    to: "testmuzamil41@gmail.com",
    subject: "Test email",
    text: "This is a test email sent from the Manifestmystory application.\n\nIf you received this, the email configuration is working correctly.",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Manifestmystory — Test Email</h2>
        <p>This is a test email sent from the Manifestmystory application via <strong>Microsoft 365 SMTP</strong>.</p>
        <p style="color: #16a34a; font-weight: bold;">✓ If you received this, the email configuration is working correctly.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #6b7280; font-size: 12px;">
        </p>
      </div>
    `,
  });

  console.log("✓ Email sent successfully!");
  console.log("  Message ID:", info.messageId);
  console.log("  Response:", info.response);
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
