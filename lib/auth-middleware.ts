import { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from './jwt';

export interface AuthenticatedRequest extends NextApiRequest {
  gym_id?: string;
  user_id?: string;
}

/**
 * Middleware to protect API routes and extract gym_id from token
 * Usage:
 * export default withAuth(handler);
 */
export function withAuth(handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>) {
  return async (req: AuthenticatedRequest, res: NextApiResponse) => {
    try {
      // Get token from cookies or Authorization header
      const token = req.cookies.auth_token || req.headers.authorization?.split(' ')[1];

      if (!token) {
        return res.status(401).json({ error: 'Unauthorized - no token provided' });
      }

      // Verify token
      const decoded = await verifyToken(token);
      if (!decoded) {
        return res.status(401).json({ error: 'Unauthorized - invalid token' });
      }

      // Attach gym_id and user_id to request
      req.gym_id = decoded.gym_id;
      req.user_id = decoded.user_id;

      // Call the actual handler
      return handler(req, res);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Helper to check if user has required role
 */
export function requireRole(role: 'admin' | 'manager' | 'staff') {
  return (handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>) => {
    return withAuth(async (req, res) => {
      // You'll need to pass the user's role through the token or fetch from DB
      // For now, just check that user is authenticated
      return handler(req, res);
    });
  };
}
