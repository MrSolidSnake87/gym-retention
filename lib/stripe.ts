import Stripe from 'stripe';

// Returns a fresh Stripe client reading the key at call time (never at module load)
export function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY environment variable is not set');
  return new Stripe(key, { apiVersion: '2024-04-10' });
}

// Pricing tiers - read at runtime to get environment variables
export function getPricingTiers() {
  return {
    starter: {
      name: 'Starter',
      price: 3995, // £39.95 in pence
      members: 500,
      stripePriceId: process.env.STRIPE_STARTER_PRICE_ID || '',
      description: 'Up to 500 members',
    },
    pro: {
      name: 'Pro',
      price: 8995, // £89.95 in pence
      members: 2000,
      stripePriceId: process.env.STRIPE_PRO_PRICE_ID || '',
      description: 'Up to 2,000 members',
    },
    enterprise: {
      name: 'Enterprise',
      price: 0, // Custom pricing
      members: Infinity,
      stripePriceId: '',
      description: 'Unlimited members',
    },
  };
}

// For backward compatibility
export const PRICING_TIERS = getPricingTiers();

export function getTierForMemberCount(memberCount: number) {
  if (memberCount <= 500) return 'starter';
  if (memberCount <= 2000) return 'pro';
  return 'enterprise';
}

export function getPriceForTier(tier: keyof typeof PRICING_TIERS): number {
  return PRICING_TIERS[tier].price;
}
