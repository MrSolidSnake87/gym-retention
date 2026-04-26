# Complete Payment Flow Testing & Live Deployment Guide

## PHASE 1: Test Mode Verification (Test Card: 4242 4242 4242 4242)

### Step 1: Create Test Gym Account (Test Mode)
```
1. Visit: https://gym-retention.vercel.app/auth/signup
2. Enter:
   - Gym Name: Test Gym - [Your Name]
   - Email: test-gym-001@example.com
   - Password: TestPassword123!
3. Click "Sign Up"
   ✓ Should redirect to /checkout
```

### Step 2: Complete Stripe Test Checkout
```
1. On /checkout page, click "Get Started" on Starter plan ($39)
2. Redirected to Stripe checkout
3. Enter test card:
   - Card: 4242 4242 4242 4242
   - Exp: 12/26
   - CVC: 123
   - Email: test-gym-001@example.com
4. Click "Pay"
   ✓ Should redirect to /subscription?session_id=...
   ✓ Should show "✓ Subscription activated!"
   ✓ Should auto-redirect to /dashboard after 2 seconds
```

### Step 3: Verify Dashboard Access
```
1. Dashboard loads without paywall
2. Subscription badge shows "Active" (green)
3. Can upload CSV files
4. Test member count limit by uploading 600 members to Starter plan
   ✓ Should show error: "Member count exceeds tier limit"
   ✓ Error should include "Upgrade to Pro plan" link
```

### Step 4: Verify Webhook Received
```
1. Go to https://dashboard.stripe.com (stay in TEST mode)
2. Click "Developers" → "Webhooks"
3. Find endpoint: https://gym-retention.vercel.app/api/webhooks/stripe
4. Click it and check "Events" section
   ✓ Should see "checkout.session.completed" event
   ✓ Status should be: ✅ (green checkmark)
5. Click the event to see the payload
   ✓ Metadata should contain: gym_id and tier
```

### Step 5: Verify Database Was Updated
```
Use your database client (Neon) to check:

SELECT * FROM gyms WHERE email = 'test-gym-001@example.com';
✓ subscription_tier should be 'starter'
✓ status should be 'active'
✓ stripe_customer_id should be populated (cus_...)
✓ stripe_subscription_id should be populated (sub_...)

SELECT * FROM subscriptions WHERE gym_id = '[the_gym_id]';
✓ tier should be 'starter'
✓ status should be 'active'
✓ stripe_subscription_id should match
✓ current_period_start and current_period_end should be set
```

### Step 6: Verify Enterprise Contact Form
```
1. Go to https://gym-retention.vercel.app/checkout
2. Scroll to "Enterprise" section
3. Fill in contact form:
   - Gym Name: Test Enterprise
   - Contact Name: Your Name
   - Email: your@email.com
   - Member Count: 5000
   - Message: Test inquiry
4. Click "Request Quote"
   ✓ Should open email client with pre-filled subject
   ✓ Subject: "Enterprise Inquiry - Test Enterprise"
   ✓ Recipient: sales@gymretention.com
```

---

## PHASE 2: Switch to Live Stripe Keys

### Prerequisites
You need:
- Your Stripe Live Secret Key (sk_live_...)
- Your Stripe Live Publishable Key (pk_live_...)
- Your existing STRIPE_STARTER_PRICE_ID (for live mode)
- Your existing STRIPE_PRO_PRICE_ID (for live mode)

### Important: Create Live Price IDs
⚠️ If you haven't already, create live price IDs in Stripe:

1. Go to https://dashboard.stripe.com (turn OFF test mode)
2. Click "Products" → "Create Product"
3. Create "Starter Plan" ($39/month):
   - Name: Gym Retention Starter
   - Price: $39.00/month (recurring)
   - Copy the Price ID (price_...)
   - Save as STRIPE_STARTER_PRICE_ID
4. Create "Pro Plan" ($79/month):
   - Name: Gym Retention Pro
   - Price: $79.00/month (recurring)
   - Copy the Price ID (price_...)
   - Save as STRIPE_PRO_PRICE_ID

### Step 1: Update Vercel Environment Variables

1. Go to: https://vercel.com/gym-retention
2. Click **Settings** tab
3. Click **Environment Variables** in left sidebar
4. **For each variable below**, click the existing one, edit, and update:

   | Variable Name | New Value | Notes |
   |---|---|---|
   | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` | From Stripe Live Keys |
   | `STRIPE_SECRET_KEY` | `sk_live_...` | From Stripe Live Keys |
   | `STRIPE_STARTER_PRICE_ID` | `price_1XXXXX...` | Created above |
   | `STRIPE_PRO_PRICE_ID` | `price_1XXXXX...` | Created above |
   | `STRIPE_WEBHOOK_SECRET` | Leave UNCHANGED | Keep whsec_... value |

5. Click "Save" for each variable
6. Vercel will auto-redeploy the application (~5 minutes)
7. Wait for deployment to complete

---

## PHASE 3: Test Live Payments

### Step 1: Monitor Vercel Deployment
```
1. Go to https://vercel.com/gym-retention
2. Click "Deployments" tab
3. Wait for newest deployment to show "Ready" (green checkmark)
4. Takes ~3-5 minutes
```

### Step 2: Create Live Test Gym Account
```
1. Visit: https://gym-retention.vercel.app/auth/signup
2. Enter:
   - Gym Name: Live Test Gym 2
   - Email: live-test-002@example.com
   - Password: TestPassword123!
3. Click "Sign Up"
   ✓ Should redirect to /checkout
```

### Step 3: Complete Real Payment (Optional - Use Test Card)
```
1. On /checkout page, click "Get Started" on Pro plan ($79)
2. Redirected to Stripe checkout
3. You can still use test card in live mode:
   - Card: 4242 4242 4242 4242
   - Exp: 12/26
   - CVC: 123
4. Click "Pay"
   ✓ Should complete successfully
   ✓ Should redirect to /subscription with success message
```

### Step 4: Verify Live Webhook
```
1. Go to https://dashboard.stripe.com (MAKE SURE YOU'RE IN LIVE MODE)
2. Click "Developers" → "Webhooks"
3. Find endpoint: https://gym-retention.vercel.app/api/webhooks/stripe
4. Check "Events" section
   ✓ Should see the new checkout.session.completed event
   ✓ Status should be ✅ (green)
```

### Step 5: Verify Live Database Update
```
SELECT * FROM gyms WHERE email = 'live-test-002@example.com';
✓ Should show: status = 'active', subscription_tier = 'pro'
✓ stripe_customer_id should be populated (starts with cus_)
✓ stripe_subscription_id should be populated (starts with sub_)
```

---

## PHASE 4: Verification Checklist

Run through this complete checklist:

### Authentication & Session
- [ ] Login works with valid credentials
- [ ] Logout clears auth token
- [ ] Accessing /dashboard without auth redirects to /login
- [ ] Session expires if subscription expires

### Payment Gating
- [ ] Creating new account shows paywall (trial status)
- [ ] After checkout, paywall disappears
- [ ] Expired subscription shows paywall again
- [ ] Paywall has clear "View Plans" button

### Member Upload
- [ ] Can upload CSV with < tier limit members
- [ ] Uploading > tier limit shows error
- [ ] Error shows current tier and limit
- [ ] Error has "View Upgrade Options" link
- [ ] Can upload PDF files
- [ ] CSV/PDF parsing handles gym system format

### Subscription Management
- [ ] /subscription page shows gym name and email
- [ ] Active subscription shows status badge (green)
- [ ] Trial status shows "Choose a Plan" button
- [ ] Enterprise section shows in /checkout
- [ ] Enterprise form submits via email

### Stripe Integration
- [ ] Checkout session created successfully
- [ ] Redirected to Stripe hosted checkout
- [ ] Payment processes without errors
- [ ] Webhook receives and processes events
- [ ] Database updates correctly from webhook
- [ ] Customer and subscription IDs saved

### Production Readiness
- [ ] All environment variables set in Vercel
- [ ] Build completes successfully
- [ ] No TypeScript errors
- [ ] No runtime errors in Vercel logs
- [ ] Webhook signature verification passes
- [ ] Database queries have proper gym_id filtering

---

## Troubleshooting

### Webhook Not Firing
```
1. Check Vercel logs: https://vercel.com/gym-retention → Deployments → Logs
2. Look for POST requests to /api/webhooks/stripe
3. Check if response code is 200
4. If error, check error message in logs
```

### Payment Not Processing
```
1. Check Stripe Dashboard → Payments section
2. Look for failed payment (usually shows reason)
3. If test card declined, verify you're using correct card
4. Check browser console for JavaScript errors
```

### Subscription Not Activating
```
1. Check webhook fired (see Webhook Not Firing above)
2. Check database - did subscription record get created?
3. Check Stripe Dashboard - did customer/subscription get created?
4. Check app logs for errors in webhook handler
```

---

## Final Deployment Checklist

- [ ] All code committed and pushed to GitHub
- [ ] Vercel deployment completed successfully
- [ ] All environment variables updated with live keys
- [ ] Test payment completed (even with test card in live mode)
- [ ] Webhook verified in Stripe Dashboard
- [ ] Database shows active subscription
- [ ] Dashboard accessible without paywall
- [ ] Member upload working
- [ ] Enterprise contact form working

---

Once you complete these steps, your payment system will be fully operational in production! 🎉
