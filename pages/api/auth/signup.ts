import type { NextApiRequest, NextApiResponse } from 'next';
import { registerGym } from '@/lib/auth';

type ResponseData = {
  success?: boolean;
  token?: string;
  gym_id?: string;
  user_id?: string;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { gymName, email, password, confirmPassword } = req.body;

    // Validation
    if (!gymName || !email || !password || !confirmPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    if (!email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    // Register gym
    const { gym_id, user_id, token } = await registerGym(gymName, email, password);

    // Set auth token as HTTP-only cookie
    res.setHeader('Set-Cookie', `auth_token=${token}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Strict`);

    return res.status(201).json({
      success: true,
      token,
      gym_id,
      user_id,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Signup failed';
    return res.status(400).json({ error: errorMessage });
  }
}
