import { NextApiRequest, NextApiResponse } from 'next';
import { Readable } from 'stream';
import { getStripeClient } from '@/lib/stripe';
import { db } from '@/lib/db-postgres';

async function getRawBody(readable: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return res.status(400).json({ error: 'Missing webhook signature or secret' });
  }

  try {
    const buf = await getRawBody(req);
    const event = getStripeClient().webhooks.constructEvent(buf, sig as string, webhookSecret);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const gymId = session.metadata?.gym_id;
        const tier = session.metadata?.tier;
        const stripeCustomerId = session.customer;
        const stripeSubscriptionId = session.subscription;

        if (!gymId || !tier) {
          console.error('Missing metadata in checkout session', session.id);
          return res.status(400).json({ error: 'Missing metadata' });
        }

        // Update gym with Stripe customer and subscription info
        await db.query(
          `UPDATE gyms SET
            stripe_customer_id = $1,
            status = $2,
            subscription_tier = $3,
            updated_at = NOW()
          WHERE id = $4`,
          [stripeCustomerId, 'active', tier, gymId]
        );

        // Create/update subscription record
        await db.query(
          `INSERT INTO subscriptions
            (gym_id, stripe_customer_id, stripe_subscription_id, tier, status, current_period_start, current_period_end, auto_renew, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, NOW(), NOW() + interval '30 days', $6, NOW(), NOW())
          ON CONFLICT (gym_id) DO UPDATE SET
            stripe_subscription_id = $3,
            tier = $4,
            status = $5,
            current_period_end = NOW() + interval '30 days',
            updated_at = NOW()`,
          [gymId, stripeCustomerId, stripeSubscriptionId, tier, 'active', true]
        );

        console.log(`Subscription activated for gym ${gymId} - tier: ${tier}`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        const gymId = subscription.metadata?.gym_id;

        if (!gymId) {
          console.warn('Subscription update without gym_id', subscription.id);
          break;
        }

        const status = subscription.status === 'active' ? 'active' : 'past_due';
        const periodEnd = new Date(subscription.current_period_end * 1000);

        await db.query(
          `UPDATE subscriptions SET
            status = $1,
            current_period_end = $2,
            updated_at = NOW()
          WHERE gym_id = $3`,
          [status, periodEnd, gymId]
        );

        console.log(`Subscription updated for gym ${gymId} - status: ${status}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        const gymId = subscription.metadata?.gym_id;

        if (!gymId) {
          console.warn('Subscription deletion without gym_id', subscription.id);
          break;
        }

        // Mark gym as cancelled
        await db.query(
          `UPDATE gyms SET status = $1, updated_at = NOW() WHERE id = $2`,
          ['cancelled', gymId]
        );

        await db.query(
          `UPDATE subscriptions SET status = $1, updated_at = NOW() WHERE gym_id = $2`,
          ['cancelled', gymId]
        );

        console.log(`Subscription cancelled for gym ${gymId}`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        const customerId = invoice.customer;

        // Find gym with this customer
        const result = await db.query(
          `UPDATE subscriptions SET status = $1, updated_at = NOW()
          WHERE stripe_customer_id = $2
          RETURNING gym_id`,
          ['payment_failed', customerId]
        );

        if (result.rows.length > 0) {
          const gymId = result.rows[0].gym_id;
          console.log(`Payment failed for gym ${gymId}`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: 'Webhook error' });
  }
}

// Disable body parser for raw webhook body
export const config = {
  api: {
    bodyParser: false,
  },
};
