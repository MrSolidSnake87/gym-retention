import type { NextApiRequest, NextApiResponse } from 'next';
import { loginGym } from '@/lib/auth';

type ResponseData = {
  success?: boolean;
  token?: string;
  session?: any;
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
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { token, session } = await loginGym(email, password);

    // Set auth token as HTTP-only cookie
    res.setHeader('Set-Cookie', `auth_token=${token}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Strict`);

    return res.status(200).json({
      success: true,
      token,
      session,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Login failed';
    if (errorMessage === 'EMAIL_NOT_VERIFIED') {
      return res.status(403).json({
        error: 'Please verify your email before logging in.',
        unverified: true,
      });
    }
    return res.status(401).json({ error: errorMessage });
  }
}
