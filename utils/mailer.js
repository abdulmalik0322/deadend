import nodemailer from 'nodemailer';

/**
 * True when the SMTP environment is configured well enough to send mail.
 * Checked by the auth controller before attempting password-reset emails.
 */
export function isEmailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function buildTransporter() {
  const port = Number(process.env.SMTP_PORT) || 587;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * Send a password-reset email with a time-limited reset link.
 * @param {string} to Recipient email address
 * @param {string} resetUrl Full URL of the form `${CLIENT_URL}/reset-password?token=...`
 */
export async function sendPasswordResetEmail(to, resetUrl) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const transporter = buildTransporter();

  await transporter.sendMail({
    from,
    to,
    subject: 'Reset your DEADEND password',
    text:
      'You requested a password reset for your DEADEND account.\n\n' +
      `Open this link to choose a new password (valid for 1 hour):\n${resetUrl}\n\n` +
      'If you did not request this, you can safely ignore this email.',
    html:
      '<p>You requested a password reset for your DEADEND account.</p>' +
      `<p><a href="${resetUrl}">Choose a new password</a> (link valid for 1 hour).</p>` +
      '<p>If you did not request this, you can safely ignore this email.</p>',
  });
}
