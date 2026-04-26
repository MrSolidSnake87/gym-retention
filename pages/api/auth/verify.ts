import type { NextApiRequest, NextApiResponse } from 'next';
import { validateSession } from '@/lib/auth';

type ResponseData = {
  authenticated?: boolean;
  session?: any;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get token from cookie or Authorization header
    const token = req.cookies.auth_token || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(200).json({ authenticated: false });
    }

    const session = await validateSession(token);

    if (!session) {
      return res.status(200).json({ authenticated: false });
    }

    return res.status(200).json({
      authenticated: true,
      session,
    });
  } catch (error) {
    return res.status(200).json({ authenticated: false });
  }
}
