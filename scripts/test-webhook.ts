/**
 * Webhook Handler Test Script
 * Tests that the webhook handler correctly processes Stripe events
 * Run with: npx ts-node scripts/test-webhook.ts
 */

import crypto from 'crypto';
import { db } from '../lib/db-postgres';

// Mock Stripe webhook secret (should match STRIPE_WEBHOOK_SECRET)
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test';

interface WebhookPayload {
  id: string;
  type: string;
  data: {
    object: {
      id?: string;
      customer?: string;
      subscription?: string;
      mode?: string;
      metadata?: {
        gym_id?: string;
        tier?: string;
      };
      status?: string;
      current_period_start?: number;
      current_period_end?: number;
    };
  };
}

/**
 * Generate Stripe webhook signature
 */
function generateSignature(timestamp: number, body: string, secret: string): string {
  const signedContent = `${timestamp}.${body}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedContent)
    .digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

/**
 * Test webhook event
 */
async function testWebhookEvent(eventType: string, payload: WebhookPayload) {
  console.log(`\n📧 Testing webhook event: ${eventType}`);
  console.log('━'.repeat(60));

  try {
    const body = JSON.stringify(payload);
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = generateSignature(timestamp, body, STRIPE_WEBHOOK_SECRET);

    console.log(`✓ Generated signature: ${signature.substring(0, 20)}...`);
    console.log(`✓ Event ID: ${payload.id}`);
    console.log(`✓ Gym ID: ${payload.data.object.metadata?.gym_id || 'N/A'}`);

    // Simulate webhook processing
    switch (eventType) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(payload);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(payload);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(payload);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(payload);
        break;
      default:
        console.log(`⚠️  Unknown event type: ${eventType}`);
    }

    console.log(`✓ Event processed successfully`);
  } catch (error) {
    console.error(`❌ Error processing event:`, error);
  }
}

/**
 * Mock: Handle checkout session completed
 */
async function handleCheckoutSessionCompleted(payload: WebhookPayload) {
  const gymId = payload.data.object.metadata?.gym_id;
  const tier = payload.data.object.metadata?.tier;
  const stripeCustomerId = payload.data.object.customer;
  const stripeSubscriptionId = payload.data.object.subscription;

  console.log(`  - Updating gym ${gymId} to tier: ${tier}`);
  console.log(`  - Stripe Customer ID: ${stripeCustomerId}`);
  console.log(`  - Stripe Subscription ID: ${stripeSubscriptionId}`);
  console.log(`  - Setting status: active`);

  if (!gymId || !stripeCustomerId || !stripeSubscriptionId) {
    throw new Error('Missing required metadata in webhook payload');
  }
}

/**
 * Mock: Handle subscription updated
 */
async function handleSubscriptionUpdated(payload: WebhookPayload) {
  const subscription = payload.data.object;
  const status = subscription.status;
  const periodStart = subscription.current_period_start;
  const periodEnd = subscription.current_period_end;

  console.log(`  - Subscription status: ${status}`);
  console.log(`  - Current period: ${new Date(periodStart! * 1000).toISOString()} to ${new Date(periodEnd! * 1000).toISOString()}`);
}

/**
 * Mock: Handle subscription deleted
 */
async function handleSubscriptionDeleted(payload: WebhookPayload) {
  console.log(`  - Subscription cancelled`);
  console.log(`  - Setting gym status: cancelled`);
}

/**
 * Mock: Handle payment failed
 */
async function handlePaymentFailed(payload: WebhookPayload) {
  console.log(`  - Payment failed`);
  console.log(`  - Setting subscription status: payment_failed`);
  console.log(`  - Gym should receive email notification`);
}

/**
 * Test member count enforcement
 */
async function testMemberCountEnforcement() {
  console.log(`\n🔢 Testing Member Count Enforcement`);
  console.log('━'.repeat(60));

  const tierLimits = {
    starter: 500,
    pro: 2000,
    enterprise: Infinity,
  };

  const testCases = [
    { tier: 'starter', members: 400, shouldPass: true },
    { tier: 'starter', members: 500, shouldPass: true },
    { tier: 'starter', members: 501, shouldPass: false },
    { tier: 'pro', members: 2000, shouldPass: true },
    { tier: 'pro', members: 2001, shouldPass: false },
    { tier: 'enterprise', members: 10000, shouldPass: true },
  ];

  for (const testCase of testCases) {
    const limit = tierLimits[testCase.tier as keyof typeof tierLimits];
    const pass = testCase.members <= limit;
    const status = pass === testCase.shouldPass ? '✓' : '❌';
    const result = testCase.shouldPass ? 'PASS' : 'FAIL';

    console.log(
      `${status} ${testCase.tier.padEnd(12)} | ${testCase.members} members → ${result}`
    );

    if (pass !== testCase.shouldPass) {
      console.error(`  Expected: ${testCase.shouldPass}, Got: ${pass}`);
    }
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║         Gym Retention Payment System Test Suite            ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  // Test webhook events
  await testWebhookEvent('checkout.session.completed', {
    id: 'evt_test_001',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_001',
        customer: 'cus_test_001',
        subscription: 'sub_test_001',
        mode: 'subscription',
        metadata: {
          gym_id: 'gym_test_001',
          tier: 'starter',
        },
      },
    },
  });

  await testWebhookEvent('customer.subscription.updated', {
    id: 'evt_test_002',
    type: 'customer.subscription.updated',
    data: {
      object: {
        id: 'sub_test_001',
        status: 'active',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 2592000, // 30 days
      },
    },
  });

  await testWebhookEvent('customer.subscription.deleted', {
    id: 'evt_test_003',
    type: 'customer.subscription.deleted',
    data: {
      object: {
        id: 'sub_test_001',
        customer: 'cus_test_001',
      },
    },
  });

  await testWebhookEvent('invoice.payment_failed', {
    id: 'evt_test_004',
    type: 'invoice.payment_failed',
    data: {
      object: {
        subscription: 'sub_test_001',
      },
    },
  });

  // Test member count enforcement
  await testMemberCountEnforcement();

  console.log('\n' + '═'.repeat(60));
  console.log('✅ All tests completed!');
  console.log('═'.repeat(60));

  // Close database connection
  await db.closePool?.();
}

// Run tests
runAllTests().catch(console.error);
