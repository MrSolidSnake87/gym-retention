import type { NextApiResponse } from 'next';
import { withAdmin, AdminRequest } from '@/lib/admin-middleware';
import { db } from '@/lib/db-postgres';

async function handler(req: AdminRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get all gyms with their subscription info
    const result = await db.query(`
      SELECT
        g.id,
        g.name,
        g.email,
        g.status,
        g.subscription_tier,
        g.member_count,
        g.stripe_customer_id,
        g.created_at,
        g.updated_at,
        s.status AS subscription_status,
        s.tier AS subscription_tier_actual,
        s.current_period_end,
        s.stripe_subscription_id
      FROM gyms g
      LEFT JOIN subscriptions s ON s.gym_id = g.id
      ORDER BY g.created_at DESC
    `);

    const gyms = result.rows;

    // Stats
    const total = gyms.length;
    const active = gyms.filter((g: any) => g.subscription_status === 'active').length;
    const trial = gyms.filter((g: any) => !g.subscription_status || g.status === 'trial').length;
    const cancelled = gyms.filter((g: any) => g.subscription_status === 'cancelled').length;
    const totalMembers = gyms.reduce((sum: number, g: any) => sum + (g.member_count || 0), 0);

    return res.status(200).json({
      gyms,
      stats: { total, active, trial, cancelled, totalMembers },
    });
  } catch (error) {
    console.error('Admin gyms error:', error);
    return res.status(500).json({ error: 'Failed to fetch gyms' });
  }
}

export default withAdmin(handler);
