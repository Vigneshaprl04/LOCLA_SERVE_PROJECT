const nodemailer = require("nodemailer");
require("dotenv").config();

console.log("=== Nodemailer Production Verification Test ===");
console.log("Loading configurations:");
console.log("EMAIL_HOST:", process.env.EMAIL_HOST || "smtp.gmail.com");
console.log("EMAIL_PORT:", process.env.EMAIL_PORT || 587);
console.log("EMAIL_USER:", process.env.EMAIL_USER || "Not Configured");
console.log("EMAIL_FROM:", process.env.EMAIL_FROM || "Not Configured");
console.log("EMAIL_PASS:", process.env.EMAIL_PASS ? "****[CONFIGURED]" : "Not Configured");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER || "",
    pass: process.env.EMAIL_PASS || "",
  },
  connectionTimeout: 5000,
  greetingTimeout: 5000,
  socketTimeout: 5000,
});

async function runTest() {
  try {
    console.log("\nVerifying SMTP connection...");
    await transporter.verify();
    console.log("✅ SMTP Server Connection Verified Successfully!");

    const toEmail = "vickygamer040405@gmail.com";
    console.log(`\nAttempting to send test email to: ${toEmail}...`);
    
    const info = await transporter.sendMail({
      from: `LocalServe <${process.env.EMAIL_FROM || "noreply@localserve.com"}>`,
      to: toEmail,
      subject: "LocalServe Production Verification Test Email",
      text: "Hello,\n\nIf you are reading this email, the Nodemailer email delivery and SMTP setup for your LocalServe application is fully functional.\n\nBest regards,\nLocalServe Dev Team",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e4e4e4; border-radius: 8px;">
          <h2 style="color: #2563eb;">LocalServe Email Delivery Verified</h2>
          <p>This is a successful SMTP verification test for <strong>${toEmail}</strong>.</p>
          <p>Nodemailer config: <code>${process.env.EMAIL_HOST || "smtp.gmail.com"}:${process.env.EMAIL_PORT || 587}</code></p>
          <p>If you received this message, verification email delivery is operational!</p>
        </div>
      `
    });

    console.log("✅ Test email sent successfully!");
    console.log("Message ID:", info.messageId);
    console.log("Response:", info.response);
    process.exit(0);
  } catch (error) {
    console.error("\n❌ SMTP Email Verification Test Failed!");
    console.error("Error Stack:", error.stack || error);
    process.exit(1);
  }
}

runTest();
