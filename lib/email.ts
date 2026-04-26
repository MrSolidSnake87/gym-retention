import { Resend } from 'resend';

function getResendClient() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is not set');
  return new Resend(key);
}

const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@gymretention.com';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://gymretention.com';

export async function sendVerificationEmail(email: string, gymName: string, token: string): Promise<void> {
  const resend = getResendClient();
  const verifyUrl = `${APP_URL}/api/auth/verify-email?token=${token}`;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'Verify your Gym Retention account',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; background: #f9fafb; margin: 0; padding: 0;">
        <div style="max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="background: #2563eb; padding: 32px 40px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Gym Retention</h1>
          </div>
          <div style="padding: 40px;">
            <h2 style="color: #111827; margin-top: 0;">Verify your email address</h2>
            <p style="color: #6b7280; line-height: 1.6;">
              Hi there! Thanks for signing up <strong>${gymName}</strong> with Gym Retention.
              Please verify your email address to activate your account.
            </p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${verifyUrl}"
                 style="background: #2563eb; color: #ffffff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
                Verify Email Address
              </a>
            </div>
            <p style="color: #9ca3af; font-size: 14px; line-height: 1.6;">
              This link expires in 24 hours. If you didn't sign up for Gym Retention, you can safely ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
            <p style="color: #9ca3af; font-size: 12px;">
              If the button doesn't work, copy this link:<br>
              <a href="${verifyUrl}" style="color: #2563eb; word-break: break-all;">${verifyUrl}</a>
            </p>
          </div>
          <div style="background: #f9fafb; padding: 24px 40px; text-align: center;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} Gym Retention · <a href="mailto:support@gymretention.com" style="color: #6b7280;">support@gymretention.com</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  });
}
