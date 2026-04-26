import type { NextApiRequest, NextApiResponse } from 'next';
import { registerGym } from '@/lib/auth';
import { sendVerificationEmail } from '@/lib/email';

type ResponseData = {
  success?: boolean;
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

    if (!gymName || !email || !password || !confirmPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    if (!email.includes('@') || !email.includes('.')) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    // Register gym — returns verification token, NOT an auth token
    const { verificationToken } = await registerGym(gymName, email, password);

    // Send verification email
    await sendVerificationEmail(email, gymName, verificationToken);

    return res.status(201).json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Signup failed';
    return res.status(400).json({ error: errorMessage });
  }
}
