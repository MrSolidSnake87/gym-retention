# Authentication System Setup Guide

This guide walks through setting up the PostgreSQL-based authentication system for the Gym Retention Management Platform.

## Phase 1: Database Setup

### 1. Install PostgreSQL

**Windows:**
- Download from https://www.postgresql.org/download/windows/
- Run installer, note the password you set for the `postgres` user
- Default port is 5432

**Mac (using Homebrew):**
```bash
brew install postgresql
brew services start postgresql
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo service postgresql start
```

### 2. Create the Database

Open PostgreSQL command line:
```bash
psql -U postgres
```

Create a new database:
```sql
CREATE DATABASE gym_retention;
```

List databases to confirm:
```sql
\l
```

Connect to the new database:
```sql
\c gym_retention
```

### 3. Run Database Migrations

Exit psql (`\q`) and run migrations from the project root:

```bash
# First migration - creates all tables
psql -U postgres -d gym_retention -f db/migrations/001_initial_schema.sql

# Second migration - creates indexes
psql -U postgres -d gym_retention -f db/migrations/002_add_indexes.sql
```

Verify the tables were created:
```bash
psql -U postgres -d gym_retention -c "\dt"
```

You should see:
- gyms
- gym_users
- members
- subscriptions
- payment_history
- sessions

## Phase 2: Environment Configuration

### 1. Create `.env.local` file

Copy the `.env.example` file:
```bash
cp .env.example .env.local
```

### 2. Update `.env.local` with your values

```env
# PostgreSQL Database (update with your password)
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/gym_retention

# Authentication (generate random secrets)
JWT_SECRET=$(openssl rand -base64 32)
NEXTAUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_URL=http://localhost:3000

# Development
NODE_ENV=development
```

**Generate secure secrets (macOS/Linux):**
```bash
openssl rand -base64 32
```

**Generate secure secrets (Windows - PowerShell):**
```powershell
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

### 3. Verify PostgreSQL Connection

Test the connection string:
```bash
psql postgresql://postgres:YOUR_PASSWORD@localhost:5432/gym_retention -c "SELECT 1;"
```

Should output:
```
 ?column?
----------
        1
(1 row)
```

## Phase 3: Install Dependencies

Install all required packages:
```bash
npm install
```

This will install:
- `pg` - PostgreSQL client for Node.js
- `bcrypt` - Password hashing
- `jsonwebtoken` - JWT token creation and verification

## Phase 4: Testing the Authentication Flow

### 1. Start the development server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### 2. Sign Up

1. Go to `http://localhost:3000/auth/signup`
2. Enter:
   - **Gym Name:** Test Gym
   - **Email:** test@gym.com
   - **Password:** TestPassword123
   - **Confirm Password:** TestPassword123
3. Click "Create Account"
4. You should be redirected to the dashboard

### 3. Verify Database

Check that the gym and user were created:

```bash
psql -U postgres -d gym_retention
```

```sql
-- View gyms
SELECT id, name, email, status FROM gyms;

-- View gym users
SELECT id, gym_id, email, role FROM gym_users;
```

### 4. Test Login

1. Log out (if the logout endpoint is implemented)
2. Go to `http://localhost:3000/auth/login`
3. Enter:
   - **Email:** test@gym.com
   - **Password:** TestPassword123
4. Click "Sign In"
5. You should be redirected to the dashboard

### 5. Test Logout

1. Click the logout button on the dashboard (once implemented)
2. You should be redirected to the login page
3. Trying to access `/dashboard` should redirect to login

## Phase 5: Verify Data Isolation

Test that different gyms cannot see each other's data:

### Terminal 1 - Create Gym 1
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "gymName": "Gym 1",
    "email": "gym1@test.com",
    "password": "Password123",
    "confirmPassword": "Password123"
  }'
```

### Terminal 2 - Create Gym 2
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "gymName": "Gym 2",
    "email": "gym2@test.com",
    "password": "Password123",
    "confirmPassword": "Password123"
  }'
```

Save the tokens returned from both requests.

### Test Data Isolation
```bash
# Try to access Gym 1's members with Gym 2's token
curl http://localhost:3000/api/members \
  -H "Authorization: Bearer GYM2_TOKEN"
```

Should return only Gym 2's members (or empty if none uploaded yet).

## Troubleshooting

### Connection Error: "ECONNREFUSED 127.0.0.1:5432"
- PostgreSQL is not running
- **Fix:** Start PostgreSQL service
  - Windows: Use Services app or `pg_ctl -D "C:\Program Files\PostgreSQL\15\data" start`
  - Mac: `brew services start postgresql`
  - Linux: `sudo service postgresql start`

### Error: "database "gym_retention" does not exist"
- Database wasn't created
- **Fix:** Run the CREATE DATABASE command in psql

### Password Authentication Failed
- Wrong password in DATABASE_URL
- **Fix:** Verify the password you set during PostgreSQL installation

### Tables Not Found
- Migrations weren't run
- **Fix:** Run migration files again with correct path

### JWT_SECRET Not Set
- Environment variables not loaded
- **Fix:** Verify `.env.local` exists and restart dev server

## Next Steps

1. **Update API routes** to use PostgreSQL and verify gym_id
   - `/api/members` - filter by gym_id
   - `/api/upload` - associate uploaded members with gym_id
   - `/api/actions` - filter actions by gym_id
   - `/api/analyze` - update analysis to use PostgreSQL

2. **Create Dashboard Header** with gym info, member count, and logout button

3. **Implement Stripe Integration** (Phase 2)
   - Create pricing tiers
   - Build checkout page
   - Set up webhook handler

4. **Data Migration** (Phase 3)
   - Create migration script from JSON to PostgreSQL
   - Test data integrity

## Security Checklist

- [ ] `JWT_SECRET` is a random 32-byte value
- [ ] `NEXTAUTH_SECRET` is a random 32-byte value
- [ ] Database password is strong (not "password")
- [ ] `.env.local` is added to `.gitignore` (never commit secrets)
- [ ] Passwords are hashed with bcrypt (10 rounds)
- [ ] Tokens are verified on every protected route
- [ ] gym_id is enforced in all API queries

## Database Connection String Format

```
postgresql://[user]:[password]@[host]:[port]/[database]
```

Example:
```
postgresql://postgres:MySecurePassword123@localhost:5432/gym_retention
```

## Performance Optimization

The migrations include indexes on:
- `gyms.email` - for login lookups
- `gym_users.gym_id` - for filtering users by gym
- `gym_users.email` - for user lookups
- `members.gym_id` - for filtering members by gym
- `members.gym_id, last_activity` - for at-risk member queries
- `subscriptions.gym_id` - for subscription lookups
- `sessions.token` - for session validation

These indexes significantly speed up queries once you have thousands of records.
