const nodemailer = require("nodemailer");
require("dotenv").config();

// Verify required email environment variables at startup where appropriate
const requiredEnv = [
  "EMAIL_HOST",
  "EMAIL_PORT",
  "EMAIL_USER",
  "EMAIL_PASS",
  "EMAIL_FROM",
  "FRONTEND_URL"
];

const missingEnv = requiredEnv.filter(env => !process.env[env]);
if (missingEnv.length > 0) {
  console.warn(`⚠️ Warning: Missing email configuration environment variables: ${missingEnv.join(", ")}`);
}

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === "true", // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER || "",
    pass: process.env.EMAIL_PASS || "",
  },
  connectionTimeout: 5000,
  greetingTimeout: 5000,
  socketTimeout: 5000,
});

// Export transporter on exports so it can be dynamically swapped/mocked in tests
exports.transporter = transporter;

// Verify SMTP transporter during server startup
// Log only ready status or detailed server-side error, never exposing secrets
exports.transporter.verify((error) => {
  if (error) {
    console.error("❌ SMTP Transporter Verification Failed:", error.message);
  } else {
    console.log("✅ SMTP Server Ready");
  }
});

/**
 * Helper to send mail with an 8-second timeout
 */
const sendMailWithTimeout = (mailOptions, timeoutMs = 8000) => {
  return Promise.race([
    exports.transporter.sendMail(mailOptions),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("SMTP email sending timed out after 8 seconds")), timeoutMs)
    )
  ]);
};

/**
 * Send Email Verification link to User
 */
exports.sendVerificationEmail = async (toEmail, name, rawToken) => {
  const verifyUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/verify-email?token=${rawToken}`;
  const host = process.env.EMAIL_HOST || "smtp.gmail.com";
  
  console.log(`[EmailService] Sending verification email to: ${toEmail} via host: ${host}`);
  
  const mailOptions = {
    from: `LocalServe <${process.env.EMAIL_FROM || "noreply@localserve.com"}>`,
    to: toEmail,
    subject: "Verify Your Email - LocalServe",
    text: `Hello ${name},\n\nWelcome to LocalServe! Please verify your email by clicking the link below:\n\n${verifyUrl}\n\nThis verification link will expire in 24 hours.\n\nThank you,\nLocalServe Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e4; border-radius: 8px;">
        <h2 style="color: #2563eb; text-align: center;">Welcome to LocalServe</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>Thank you for registering with LocalServe. Please verify your email address to activate your account:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Verify Email Address</a>
        </div>
        <p>This verification link will expire in 24 hours.</p>
        <p>If you cannot click the button above, copy and paste this URL into your browser:</p>
        <p style="word-break: break-all; color: #555;">${verifyUrl}</p>
        <hr style="border: none; border-top: 1px solid #e4e4e4; margin: 20px 0;" />
        <p style="font-size: 12px; color: #777; text-align: center;">This is an automated email. Please do not reply directly to this message.</p>
      </div>
    `,
  };

  try {
    const info = await sendMailWithTimeout(mailOptions);
    console.log(`[EmailService] SMTP Response for ${toEmail}: ${info.response}`);
    return info;
  } catch (error) {
    console.error(`[EmailService] SMTP Failure for ${toEmail}:`, error.stack || error.message || error);
    throw error;
  }
};

/**
 * Send Password Reset link to User
 */
exports.sendPasswordResetEmail = async (toEmail, name, rawToken) => {
  const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password?token=${rawToken}`;
  const host = process.env.EMAIL_HOST || "smtp.gmail.com";

  console.log(`[EmailService] Sending password reset email to: ${toEmail} via host: ${host}`);

  const mailOptions = {
    from: `LocalServe <${process.env.EMAIL_FROM || "noreply@localserve.com"}>`,
    to: toEmail,
    subject: "Reset Your Password - LocalServe",
    text: `Hello ${name},\n\nYou requested to reset your password. Please click the link below to complete the reset:\n\n${resetUrl}\n\nThis reset link will expire in 15 minutes.\n\nIf you did not request this, you can ignore this email.\n\nThank you,\nLocalServe Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e4; border-radius: 8px;">
        <h2 style="color: #dc2626; text-align: center;">Reset Your Password</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>We received a request to reset your password for your LocalServe account. Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p>This link is only valid for <strong>15 minutes</strong>.</p>
        <p>If you did not request a password reset, please ignore this email; your password will remain unchanged.</p>
        <p>If you cannot click the button above, copy and paste this URL into your browser:</p>
        <p style="word-break: break-all; color: #555;">${resetUrl}</p>
        <hr style="border: none; border-top: 1px solid #e4e4e4; margin: 20px 0;" />
        <p style="font-size: 12px; color: #777; text-align: center;">This is an automated email. Please do not reply directly to this message.</p>
      </div>
    `,
  };

  try {
    const info = await sendMailWithTimeout(mailOptions);
    console.log(`[EmailService] SMTP Response for ${toEmail}: ${info.response}`);
    return info;
  } catch (error) {
    console.error(`[EmailService] SMTP Failure for ${toEmail}:`, error.stack || error.message || error);
    throw error;
  }
};
