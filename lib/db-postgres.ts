import { Pool, QueryResult } from 'pg';
import * as crypto from 'crypto';
import { Member } from './db';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export interface Gym {
  id: string;
  name: string;
  email: string;
  subscription_tier: 'starter' | 'pro' | 'enterprise';
  member_count: number;
  status: 'trial' | 'active' | 'paused' | 'cancelled';
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface GymUser {
  id: string;
  gym_id: string;
  email: string;
  password_hash: string;
  role: 'admin' | 'manager' | 'staff';
  created_at: Date;
  updated_at: Date;
}

// Member type is imported from ./db — re-export for convenience
export type { Member };

export interface Subscription {
  id: string;
  gym_id: string;
  stripe_subscription_id?: string;
  stripe_customer_id?: string;
  tier: 'starter' | 'pro' | 'enterprise';
  status: 'active' | 'past_due' | 'paused' | 'cancelled';
  current_period_start?: Date;
  current_period_end?: Date;
  auto_renew: boolean;
  created_at: Date;
  updated_at: Date;
}

// Gym operations
export async function createGym(name: string, email: string): Promise<Gym> {
  const query = `
    INSERT INTO gyms (name, email, status)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;
  const result = await pool.query(query, [name, email, 'trial']);
  return result.rows[0];
}

export async function getGymByEmail(email: string): Promise<Gym | null> {
  const query = 'SELECT * FROM gyms WHERE email = $1;';
  const result = await pool.query(query, [email]);
  return result.rows[0] || null;
}

export async function getGymById(id: string): Promise<Gym | null> {
  const query = 'SELECT * FROM gyms WHERE id = $1;';
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
}

export async function updateGym(id: string, updates: Partial<Gym>): Promise<Gym> {
  const allowedFields = ['name', 'subscription_tier', 'member_count', 'status', 'stripe_customer_id', 'stripe_subscription_id'];
  const fields: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      fields.push(`${key} = $${paramCount}`);
      values.push(value);
      paramCount++;
    }
  }

  values.push(id);
  const query = `
    UPDATE gyms
    SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
    WHERE id = $${paramCount}
    RETURNING *;
  `;

  const result = await pool.query(query, values);
  return result.rows[0];
}

// User operations
export async function createGymUser(
  gymId: string,
  email: string,
  passwordHash: string,
  role: 'admin' | 'manager' | 'staff' = 'manager'
): Promise<GymUser> {
  const query = `
    INSERT INTO gym_users (gym_id, email, password_hash, role)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;
  const result = await pool.query(query, [gymId, email, passwordHash, role]);
  return result.rows[0];
}

export async function getUserByEmail(email: string): Promise<GymUser | null> {
  const query = 'SELECT * FROM gym_users WHERE email = $1;';
  const result = await pool.query(query, [email]);
  return result.rows[0] || null;
}

export async function getUserById(id: string): Promise<GymUser | null> {
  const query = 'SELECT * FROM gym_users WHERE id = $1;';
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
}

// Member operations
export async function createMembers(gymId: string, members: Partial<Member>[]): Promise<Member[]> {
  const values: any[] = [];
  let paramCount = 1;
  const placeholders: string[] = [];

  for (const member of members) {
    placeholders.push(`($${paramCount}, $${paramCount + 1}, $${paramCount + 2}, $${paramCount + 3}, $${paramCount + 4}, $${paramCount + 5}, $${paramCount + 6})`);
    values.push(
      gymId,
      member.name,
      member.join_date,
      member.payment_status,
      member.last_activity,
      member.email || null,
      member.phone || null
    );
    paramCount += 7;
  }

  const query = `
    INSERT INTO members (gym_id, name, join_date, payment_status, last_activity, email, phone)
    VALUES ${placeholders.join(', ')}
    RETURNING *;
  `;

  const result = await pool.query(query, values);
  return result.rows;
}

export async function getMembersByGymId(gymId: string): Promise<Member[]> {
  const query = `
    SELECT
      id,
      gym_id,
      name,
      TO_CHAR(join_date, 'YYYY-MM-DD') AS join_date,
      payment_status,
      TO_CHAR(last_activity, 'YYYY-MM-DD') AS last_activity,
      email,
      phone,
      created_at,
      updated_at
    FROM members
    WHERE gym_id = $1
    ORDER BY last_activity DESC;
  `;
  const result = await pool.query(query, [gymId]);
  return result.rows;
}

export async function getMemberByIdAndGym(memberId: string, gymId: string): Promise<Member | null> {
  const query = `
    SELECT
      id,
      gym_id,
      name,
      TO_CHAR(join_date, 'YYYY-MM-DD') AS join_date,
      payment_status,
      TO_CHAR(last_activity, 'YYYY-MM-DD') AS last_activity,
      email,
      phone
    FROM members
    WHERE id = $1 AND gym_id = $2;
  `;
  const result = await pool.query(query, [memberId, gymId]);
  return result.rows[0] || null;
}

export async function getMemberCountByGymId(gymId: string): Promise<number> {
  const query = 'SELECT COUNT(*) as count FROM members WHERE gym_id = $1;';
  const result = await pool.query(query, [gymId]);
  return parseInt(result.rows[0].count, 10);
}

export async function clearMembersByGymId(gymId: string): Promise<void> {
  const query = 'DELETE FROM members WHERE gym_id = $1;';
  await pool.query(query, [gymId]);
}

// Subscription operations
export async function createSubscription(
  gymId: string,
  tier: 'starter' | 'pro' | 'enterprise',
  stripeData?: {
    stripe_subscription_id: string;
    stripe_customer_id: string;
    current_period_start: Date;
    current_period_end: Date;
  }
): Promise<Subscription> {
  const query = `
    INSERT INTO subscriptions (gym_id, tier, stripe_subscription_id, stripe_customer_id, current_period_start, current_period_end)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `;
  const result = await pool.query(query, [
    gymId,
    tier,
    stripeData?.stripe_subscription_id || null,
    stripeData?.stripe_customer_id || null,
    stripeData?.current_period_start || null,
    stripeData?.current_period_end || null,
  ]);
  return result.rows[0];
}

export async function getSubscriptionByGymId(gymId: string): Promise<Subscription | null> {
  const query = 'SELECT * FROM subscriptions WHERE gym_id = $1;';
  const result = await pool.query(query, [gymId]);
  return result.rows[0] || null;
}

export async function updateSubscription(gymId: string, updates: Partial<Subscription>): Promise<Subscription> {
  const allowedFields = ['tier', 'status', 'stripe_subscription_id', 'stripe_customer_id', 'current_period_start', 'current_period_end', 'auto_renew'];
  const fields: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      fields.push(`${key} = $${paramCount}`);
      values.push(value);
      paramCount++;
    }
  }

  values.push(gymId);
  const query = `
    UPDATE subscriptions
    SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
    WHERE gym_id = $${paramCount}
    RETURNING *;
  `;

  const result = await pool.query(query, values);
  return result.rows[0];
}

// Session operations
export async function createSession(
  gymId: string,
  userId: string,
  expiresAt: Date
): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const query = `
    INSERT INTO sessions (gym_id, user_id, token, expires_at)
    VALUES ($1, $2, $3, $4)
    RETURNING token;
  `;
  const result = await pool.query(query, [gymId, userId, token, expiresAt]);
  return result.rows[0].token;
}

export async function getSessionByToken(token: string): Promise<{ gym_id: string; user_id: string } | null> {
  const query = `
    SELECT gym_id, user_id FROM sessions
    WHERE token = $1 AND expires_at > CURRENT_TIMESTAMP;
  `;
  const result = await pool.query(query, [token]);
  return result.rows[0] || null;
}

export async function deleteSession(token: string): Promise<void> {
  const query = 'DELETE FROM sessions WHERE token = $1;';
  await pool.query(query, [token]);
}

// Utility
export async function query(text: string, params?: any[]): Promise<QueryResult> {
  return pool.query(text, params);
}

export async function closePool(): Promise<void> {
  await pool.end();
}
