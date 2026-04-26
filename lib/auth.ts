import bcrypt from 'bcrypt';
import { createToken, verifyToken } from './jwt';
import { getUserByEmail, getUserById, getGymById, getGymByEmail, createGymUser, createGym, getSubscriptionByGymId } from './db-postgres';

export { createToken, verifyToken };

export interface AuthSession {
  gym_id: string;
  user_id: string;
  email: string;
  role: 'admin' | 'manager' | 'staff';
  gym_name: string;
  subscription_status: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function registerGym(
  gymName: string,
  gymEmail: string,
  password: string
): Promise<{ gym_id: string; user_id: string; token: string }> {
  const existingGym = await getGymByEmail(gymEmail);
  if (existingGym) throw new Error('Gym email already registered');

  const gym = await createGym(gymName, gymEmail);
  const passwordHash = await hashPassword(password);
  const user = await createGymUser(gym.id, gymEmail, passwordHash, 'admin');
  const token = await createToken(gym.id, user.id, user.email);

  return { gym_id: gym.id, user_id: user.id, token };
}

export async function loginGym(
  email: string,
  password: string
): Promise<{ gym_id: string; user_id: string; token: string; session: AuthSession }> {
  const user = await getUserByEmail(email);
  if (!user) throw new Error('Invalid email or password');

  const passwordValid = await verifyPassword(password, user.password_hash);
  if (!passwordValid) throw new Error('Invalid email or password');

  const gym = await getGymById(user.gym_id);
  if (!gym || gym.status === 'cancelled') throw new Error('Gym account is not active');

  const subscription = await getSubscriptionByGymId(user.gym_id);
  const subscriptionStatus = subscription?.status || 'trial';

  const token = await createToken(user.gym_id, user.id, user.email);

  const session: AuthSession = {
    gym_id: user.gym_id,
    user_id: user.id,
    email: user.email,
    role: user.role,
    gym_name: gym.name,
    subscription_status: subscriptionStatus,
  };

  return { gym_id: user.gym_id, user_id: user.id, token, session };
}

export async function validateSession(token: string): Promise<AuthSession | null> {
  const decoded = await verifyToken(token);
  if (!decoded) return null;

  const user = await getUserById(decoded.user_id);
  if (!user) return null;

  const gym = await getGymById(decoded.gym_id);
  if (!gym || gym.status === 'cancelled') return null;

  const subscription = await getSubscriptionByGymId(decoded.gym_id);
  const subscriptionStatus = subscription?.status || 'trial';

  if (subscription?.current_period_end) {
    const expired = new Date(subscription.current_period_end) < new Date();
    if (expired && subscriptionStatus === 'active') return null;
  }

  return {
    gym_id: user.gym_id,
    user_id: user.id,
    email: user.email,
    role: user.role,
    gym_name: gym.name,
    subscription_status: subscriptionStatus,
  };
}
