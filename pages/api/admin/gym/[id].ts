import type { NextApiResponse } from 'next';
import { withAdmin, AdminRequest } from '@/lib/admin-middleware';
import { db } from '@/lib/db-postgres';

async function handler(req: AdminRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };

  if (!id) {
    return res.status(400).json({ error: 'Missing gym ID' });
  }

  // UPDATE gym
  if (req.method === 'PUT') {
    try {
      const { name, email, status, tier } = req.body;

      // Update gym table
      if (name || email || status) {
        const fields: string[] = [];
        const values: any[] = [];
        let i = 1;
        if (name) { fields.push(`name = $${i++}`); values.push(name); }
        if (email) { fields.push(`email = $${i++}`); values.push(email); }
        if (status) { fields.push(`status = $${i++}`); values.push(status); }
        values.push(id);
        await db.query(
          `UPDATE gyms SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${i}`,
          values
        );
      }

      // Update subscription table if tier or status provided
      if (tier || status) {
        const subFields: string[] = [];
        const subValues: any[] = [];
        let j = 1;
        if (tier) { subFields.push(`tier = $${j++}`); subValues.push(tier); }
        if (status) {
          // Map gym status to subscription status
          const subStatus = status === 'active' ? 'active' : status === 'cancelled' ? 'cancelled' : 'cancelled';
          subFields.push(`status = $${j++}`);
          subValues.push(subStatus);
        }
        subValues.push(id);

        // Upsert subscription
        const existingSub = await db.query('SELECT id FROM subscriptions WHERE gym_id = $1', [id]);
        if (existingSub.rows.length > 0) {
          await db.query(
            `UPDATE subscriptions SET ${subFields.join(', ')}, updated_at = NOW() WHERE gym_id = $${j}`,
            subValues
          );
        } else if (tier) {
          await db.query(
            `INSERT INTO subscriptions (gym_id, tier, status, auto_renew, created_at, updated_at)
             VALUES ($1, $2, $3, false, NOW(), NOW())`,
            [id, tier, status === 'active' ? 'active' : 'cancelled']
          );
        }
      }

      // Also update gym subscription_tier if tier changed
      if (tier) {
        await db.query(
          'UPDATE gyms SET subscription_tier = $1, updated_at = NOW() WHERE id = $2',
          [tier, id]
        );
      }

      const updated = await db.query(
        `SELECT g.*, s.status AS subscription_status, s.tier AS subscription_tier_actual
         FROM gyms g LEFT JOIN subscriptions s ON s.gym_id = g.id WHERE g.id = $1`,
        [id]
      );

      return res.status(200).json({ success: true, gym: updated.rows[0] });
    } catch (error) {
      console.error('Admin update gym error:', error);
      return res.status(500).json({ error: 'Failed to update gym' });
    }
  }

  // DELETE gym
  if (req.method === 'DELETE') {
    try {
      await db.query('DELETE FROM members WHERE gym_id = $1', [id]);
      await db.query('DELETE FROM subscriptions WHERE gym_id = $1', [id]);
      await db.query('DELETE FROM sessions WHERE gym_id = $1', [id]);
      await db.query('DELETE FROM gym_users WHERE gym_id = $1', [id]);
      await db.query('DELETE FROM gyms WHERE id = $1', [id]);

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Admin delete gym error:', error);
      return res.status(500).json({ error: 'Failed to delete gym' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAdmin(handler);
