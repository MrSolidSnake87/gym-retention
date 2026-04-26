import { NextApiRequest, NextApiResponse } from 'next';

// TEMPORARY debug endpoint - remove after fixing
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({
    hasStripeSecret: !!process.env.STRIPE_SECRET_KEY,
    stripeSecretPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 12) || 'NOT SET',
    hasStarterPriceId: !!process.env.STRIPE_STARTER_PRICE_ID,
    starterPriceId: process.env.STRIPE_STARTER_PRICE_ID || 'NOT SET',
    hasProPriceId: !!process.env.STRIPE_PRO_PRICE_ID,
    proPriceId: process.env.STRIPE_PRO_PRICE_ID || 'NOT SET',
    hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    databaseUrlPrefix: process.env.DATABASE_URL?.substring(0, 20) || 'NOT SET',
    hasJwtSecret: !!process.env.JWT_SECRET,
  });
}
