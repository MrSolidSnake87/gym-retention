import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db-postgres';
import { sendVerificationEmail } from '@/lib/email';
import crypto from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const result = await db.query(
      `SELECT u.id, u.email, g.name AS gym_name
       FROM gym_users u JOIN gyms g ON g.id = u.gym_id
       WHERE u.email = $1 AND u.email_verified = FALSE`,
      [email]
    );

    // Always return success to prevent email enumeration
    if (result.rows.length === 0) {
      return res.status(200).json({ success: true });
    }

    const user = result.rows[0];
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.query(
      `UPDATE gym_users SET verification_token = $1, verification_token_expires = $2 WHERE id = $3`,
      [verificationToken, expires, user.id]
    );

    await sendVerificationEmail(user.email, user.gym_name, verificationToken);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Resend verification error:', error);
    return res.status(500).json({ error: 'Failed to resend verification email' });
  }
}
