import type { NextApiResponse } from 'next';
import { withAdmin, AdminRequest } from '@/lib/admin-middleware';
import { db } from '@/lib/db-postgres';

async function handler(req: AdminRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await db.query(`
      ALTER TABLE gym_users
        ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255),
        ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMP;
    `);

    // Mark existing users as verified so they aren't locked out
    await db.query(`
      UPDATE gym_users SET email_verified = TRUE
      WHERE email_verified IS NULL OR email_verified = FALSE;
    `);

    return res.status(200).json({ success: true, message: 'Migration applied successfully' });
  } catch (error) {
    console.error('Migration error:', error);
    return res.status(500).json({ error: 'Migration failed', details: error instanceof Error ? error.message : String(error) });
  }
}

export default withAdmin(handler);
