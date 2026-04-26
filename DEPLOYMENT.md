# Deployment Guide (5 minutes)

## Step 1: Create Neon Database (2 min)

1. Go to **https://neon.tech** → sign up with email
2. Create a project, name it `gym-retention`
3. In the dashboard, click "Connection string" and copy the full connection string (looks like `postgresql://user:password@ep-xxx...`)
4. Run this in your terminal (paste your connection string):
   ```bash
   psql "YOUR_CONNECTION_STRING_HERE" -f db/migrations/001_initial_schema.sql
   ```
   Then run the second migration:
   ```bash
   psql "YOUR_CONNECTION_STRING_HERE" -f db/migrations/002_add_indexes.sql
   ```
5. Save that connection string — you'll need it for Vercel

## Step 2: Push Code to GitHub (2 min)

1. Go to **https://github.com** → sign up if you don't have an account
2. Click "New repository" → name it `gym-retention` → click "Create repository"
3. GitHub shows you the commands. Run these in your project folder:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/gym-retention.git
   git branch -M main
   git push -u origin main
   ```
   (Use your GitHub username where it says `YOUR_USERNAME`)

## Step 3: Deploy to Vercel (1 min)

1. Go to **https://vercel.com** → sign up with GitHub
2. Click "Add New Project" → import your `gym-retention` repo
3. Before deploying, add these environment variables:
   - `DATABASE_URL` = (your Neon connection string from Step 1)
   - `JWT_SECRET` = (copy the value from your .env.local)
   - `NEXTAUTH_SECRET` = (copy the value from your .env.local)
   - `NODE_ENV` = `production`
4. Click "Deploy" — wait 2 minutes
5. Vercel shows you a URL like `https://gym-retention-xyz.vercel.app`

## Step 4: Complete Stripe Account Setup

1. Go back to Stripe account creation
2. Enter your Vercel URL (from Step 3) as your website
3. Finish the signup

**Done!** You now have:
- ✅ Hosted database (Neon)
- ✅ Production app (Vercel)
- ✅ Real URL for Stripe

The app is live. Go to your Vercel URL and log in with your test account.

---

## Troubleshooting

- **Psql command not found?** Install PostgreSQL locally, or use DBeaver (free) to connect to Neon directly and run the SQL
- **Vercel build fails?** Check the build logs in Vercel dashboard — usually a missing env var or dependency issue
- **Stripe still won't accept the URL?** Make sure the URL is HTTPS and load it in a browser to confirm it works

