import type { NextApiRequest, NextApiResponse } from 'next';

type ResponseData = {
  success?: boolean;
  error?: string;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Clear the auth token cookie
  res.setHeader('Set-Cookie', 'auth_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict');

  return res.status(200).json({ success: true });
}
