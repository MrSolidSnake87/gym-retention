/**
 * JWT utilities using `jose` — fully edge-runtime compatible (Web Crypto API).
 * Safe to import in Next.js middleware.
 */
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production-min-32-chars!!';

function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(JWT_SECRET);
}

export async function createToken(gymId: string, userId: string, email: string): Promise<string> {
  return new SignJWT({ gym_id: gymId, user_id: userId, email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getSecretKey());
}

export async function verifyToken(
  token: string
): Promise<{ gym_id: string; user_id: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return {
      gym_id: payload.gym_id as string,
      user_id: payload.user_id as string,
      email: payload.email as string,
    };
  } catch {
    return null;
  }
}
