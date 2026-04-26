import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db-postgres';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    return res.redirect('/auth/login?error=invalid_token');
  }

  try {
    // Find user with this token
    const result = await db.query(
      `SELECT id, gym_id, email, verification_token_expires
       FROM gym_users
       WHERE verification_token = $1 AND email_verified = FALSE`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.redirect('/auth/login?error=invalid_token');
    }

    const user = result.rows[0];

    // Check token hasn't expired
    if (new Date(user.verification_token_expires) < new Date()) {
      return res.redirect('/auth/login?error=token_expired');
    }

    // Mark as verified and clear token
    await db.query(
      `UPDATE gym_users
       SET email_verified = TRUE, verification_token = NULL, verification_token_expires = NULL, updated_at = NOW()
       WHERE id = $1`,
      [user.id]
    );

    // Redirect to login with success message
    return res.redirect('/auth/login?verified=1');
  } catch (error) {
    console.error('Email verification error:', error);
    return res.redirect('/auth/login?error=server_error');
  }
}
