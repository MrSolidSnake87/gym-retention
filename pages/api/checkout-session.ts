import { NextApiRequest, NextApiResponse } from 'next';
import { getStripeClient, getPricingTiers } from '@/lib/stripe';
import { verifyToken } from '@/lib/jwt';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = req.cookies.auth_token || req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { tier } = req.body;
    const PRICING_TIERS = getPricingTiers();

    if (!tier || !PRICING_TIERS[tier as keyof typeof PRICING_TIERS]) {
      return res.status(400).json({ error: 'Invalid tier' });
    }

    const tierConfig = PRICING_TIERS[tier as keyof typeof PRICING_TIERS];
    if (!tierConfig.stripePriceId) {
      return res.status(400).json({ error: 'Tier not available' });
    }

    // Create Stripe checkout session
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: tierConfig.stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${req.headers.origin}/subscription?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/checkout`,
      customer_email: decoded.email,
      metadata: {
        gym_id: decoded.gym_id,
        tier: tier,
      },
    });

    res.status(200).json({ sessionId: session.id });
  } catch (error) {
    console.error('Checkout session error:', error);
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: 'Failed to create checkout session', detail: message });
  }
}
