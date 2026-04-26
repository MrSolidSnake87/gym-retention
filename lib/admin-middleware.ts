import { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from './jwt';

export interface AdminRequest extends NextApiRequest {
  admin_email?: string;
}

export function withAdmin(handler: (req: AdminRequest, res: NextApiResponse) => Promise<void>) {
  return async (req: AdminRequest, res: NextApiResponse) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.split(' ')[1];

      if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const decoded = await verifyToken(token);
      if (!decoded) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      const adminEmail = process.env.ADMIN_EMAIL;
      if (!adminEmail) {
        return res.status(403).json({ error: 'Admin access not configured' });
      }

      if (decoded.email.toLowerCase() !== adminEmail.toLowerCase()) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      req.admin_email = decoded.email;
      return handler(req, res);
    } catch (error) {
      console.error('Admin middleware error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}
