/**
 * /api/subscribe.js
 * Vercel Serverless Function — Aether Waitlist
 *
 * Responsibilities:
 *  1. Validate firstName, email, and consent
 *  2. Send notification email to site owner via IONOS SMTP
 *  3. Send personalised thank-you email to subscriber
 *  4. Append a waitlist record to Vercel KV
 *
 * Required environment variables (set in Vercel dashboard):
 *   IONOS_SMTP_HOST     = smtp.ionos.co.uk
 *   IONOS_SMTP_PORT     = 587
 *   IONOS_EMAIL         = you@yourdomain.com
 *   IONOS_SMTP_PASSWORD = yourpassword
 *   KV_REST_API_URL     = (auto-set by Vercel KV integration)
 *   KV_REST_API_TOKEN   = (auto-set by Vercel KV integration)
 */

const nodemailer = require('nodemailer');

/* ── Email validation ─────────────────────────── */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).toLowerCase());
}

/* ── Vercel KV helper (REST API) ──────────────── */
async function appendToKV(firstName, email) {
  const kvUrl   = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;

  if (!kvUrl || !kvToken) {
    console.warn('Vercel KV env vars not set — skipping KV log.');
    return;
  }

  const timestamp = new Date().toISOString();
  const entry     = `${timestamp},${firstName},${email}\n`;
  const listKey   = 'waitlist';

  /* Use APPEND command via Vercel KV REST API */
  const response = await fetch(`${kvUrl}/append/${listKey}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${kvToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(entry),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('KV append error:', errText);
  }
}

/* ── Main handler ─────────────────────────────── */
module.exports = async function handler(req, res) {
  /* Only accept POST */
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed.' });
  }

  /* Parse body */
  const { firstName, email, consent } = req.body || {};

  /* ── Validation ── */
  if (!firstName || typeof firstName !== 'string' || !firstName.trim()) {
    return res.status(400).json({ message: 'First name is required.' });
  }

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ message: 'A valid email address is required.' });
  }

  if (consent !== true) {
    return res.status(400).json({ message: 'Marketing consent must be given to join the waitlist.' });
  }

  const cleanFirst = firstName.trim();
  const cleanEmail = email.trim().toLowerCase();

  /* ── Create Nodemailer transporter ── */
  const transporter = nodemailer.createTransport({
    host:   process.env.IONOS_SMTP_HOST   || 'smtp.ionos.co.uk',
    port:   Number(process.env.IONOS_SMTP_PORT) || 587,
    secure: false, // STARTTLS on port 587
    auth: {
      user: process.env.IONOS_EMAIL,
      pass: process.env.IONOS_SMTP_PASSWORD,
    },
    tls: {
      rejectUnauthorized: true,
    },
  });

  try {
    /* ── 1. Notification email to site owner ── */
    await transporter.sendMail({
      from:    `"Aether Waitlist" <${process.env.IONOS_EMAIL}>`,
      to:      process.env.IONOS_EMAIL,
      subject: `New waitlist signup: ${cleanFirst}`,
      text: [
        'New Aether waitlist signup',
        '──────────────────────────',
        `First Name : ${cleanFirst}`,
        `Email      : ${cleanEmail}`,
        `Timestamp  : ${new Date().toISOString()}`,
        '──────────────────────────',
      ].join('\n'),
      html: `
        <div style="font-family:sans-serif;color:#1a1a2e;max-width:480px;">
          <h2 style="color:#c9973a;">New Aether Waitlist Signup</h2>
          <table cellpadding="6" style="border-collapse:collapse;">
            <tr><td style="color:#666;">First Name</td><td><strong>${cleanFirst}</strong></td></tr>
            <tr><td style="color:#666;">Email</td><td><strong>${cleanEmail}</strong></td></tr>
            <tr><td style="color:#666;">Timestamp</td><td>${new Date().toISOString()}</td></tr>
          </table>
        </div>
      `,
    });

    /* ── 2. Personalised thank-you to subscriber ── */
    await transporter.sendMail({
      from:    `"Aether Finance" <${process.env.IONOS_EMAIL}>`,
      to:      cleanEmail,
      subject: 'Welcome to the future of finance',
      text: [
        `Hi ${cleanFirst},`,
        '',
        "You're on the list.",
        '',
        "Check your inbox — our team will be in touch soon with everything you need to know about your Aether founding membership.",
        '',
        'Until then,',
        'The Aether Team',
        '',
        '──────────────────────────',
        'Aether Finance Ltd',
        'You received this email because you opted in at aether.finance.',
        'To unsubscribe, reply with "unsubscribe" in the subject line.',
      ].join('\n'),
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
        <body style="margin:0;padding:0;background:#0A0E14;font-family:'DM Sans',Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0E14;">
            <tr>
              <td align="center" style="padding:40px 20px;">
                <table width="520" cellpadding="0" cellspacing="0" style="background:#0d1219;border:1px solid rgba(201,151,58,0.2);border-radius:8px;overflow:hidden;max-width:100%;">
                  <!-- Header -->
                  <tr>
                    <td style="padding:36px 40px 28px;border-bottom:1px solid rgba(201,151,58,0.1);">
                      <span style="font-size:2rem;color:#c9973a;font-family:Georgia,serif;">Æ</span>
                      <span style="font-size:0.8rem;letter-spacing:0.25em;color:#7a7972;vertical-align:middle;margin-left:8px;text-transform:uppercase;">ETHER</span>
                    </td>
                  </tr>
                  <!-- Body -->
                  <tr>
                    <td style="padding:40px 40px 32px;">
                      <h1 style="font-size:1.6rem;font-weight:300;color:#e8e2d9;margin:0 0 16px;font-family:Georgia,serif;">
                        Hi ${cleanFirst},
                      </h1>
                      <p style="color:#c9973a;font-size:1.1rem;font-weight:400;margin:0 0 24px;">
                        You're on the list.
                      </p>
                      <p style="color:#7a7972;font-size:0.95rem;line-height:1.7;margin:0 0 20px;">
                        Check your inbox — our team will be in touch soon with everything you need to know about your Aether founding membership.
                      </p>
                      <p style="color:#7a7972;font-size:0.95rem;line-height:1.7;margin:0 0 32px;">
                        As a founding member, you'll be among the first to experience a completely new approach to personal finance.
                      </p>
                      <div style="border-top:1px solid rgba(201,151,58,0.1);padding-top:24px;">
                        <p style="color:#4a4840;font-size:0.8rem;margin:0;">
                          The Aether Team
                        </p>
                      </div>
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.04);background:#0a0e14;">
                      <p style="color:#4a4840;font-size:0.72rem;line-height:1.6;margin:0;">
                        You received this email because you opted in at aether.finance. 
                        Lawful basis: Consent (UK GDPR).
                        To unsubscribe or request data deletion, reply with "unsubscribe" in the subject line.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    /* ── 3. Append to Vercel KV log ── */
    await appendToKV(cleanFirst, cleanEmail);

    return res.status(200).json({ message: 'Success' });

  } catch (err) {
    console.error('Subscribe handler error:', err);
    return res.status(500).json({ message: 'Internal server error. Please try again.' });
  }
};
