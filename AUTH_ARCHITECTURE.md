# Authentication Architecture

## Overview

This document explains the authentication system architecture for the multi-tenant Gym Retention Management Platform.

## Key Concepts

### Multi-Tenancy
- **Tenant:** A single gym/franchise location
- **Isolation:** Each gym's data is completely isolated from other gyms
- **gym_id:** Unique identifier that connects users, members, and subscriptions to a specific gym
- **Enforcement:** All API queries include `WHERE gym_id = current_user.gym_id` to prevent cross-tenant access

### Authentication Flow

```
User → Login Form → /api/auth/login → Verify Credentials
                                      ↓
                              Lookup User in DB
                                      ↓
                              Compare Passwords (bcrypt)
                                      ↓
                              Generate JWT Token
                                      ↓
                              Set Cookie (http-only)
                                      ↓
                              Redirect to Dashboard
```

### Session Management

```
User Request → Middleware → Extract Token from Cookie/Header
                            ↓
                        Verify JWT Signature
                            ↓
                        Check Expiration (30 days)
                            ↓
                        Extract gym_id & user_id
                            ↓
                        Allow Request + Pass gym_id to API
                            ↓
API Route → withAuth Middleware → Verify gym_id matches database
                                  ↓
                              Return Filtered Data (gym_id only)
```

## Database Schema

### gyms Table
```sql
CREATE TABLE gyms (
  id UUID PRIMARY KEY,           -- Unique gym identifier
  name VARCHAR(255),             -- Gym name
  email VARCHAR(255) UNIQUE,     -- Unique email for login
  subscription_tier VARCHAR,     -- 'starter', 'pro', 'enterprise'
  member_count INT,              -- Total members uploaded
  status VARCHAR,                -- 'trial', 'active', 'paused', 'cancelled'
  stripe_customer_id VARCHAR,    -- Stripe customer reference
  stripe_subscription_id VARCHAR,-- Stripe subscription reference
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### gym_users Table
```sql
CREATE TABLE gym_users (
  id UUID PRIMARY KEY,           -- Unique user identifier
  gym_id UUID,                   -- Foreign key to gyms (enforces isolation)
  email VARCHAR(255) UNIQUE,     -- Unique email for login
  password_hash VARCHAR(255),    -- bcrypt hash
  role VARCHAR(50),              -- 'admin', 'manager', 'staff'
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### members Table (Modified)
```sql
CREATE TABLE members (
  id UUID PRIMARY KEY,
  gym_id UUID,                   -- NEW: Associates members with gyms
  name VARCHAR(255),
  join_date DATE,
  payment_status VARCHAR,
  last_activity DATE,
  email VARCHAR(255),
  phone VARCHAR(20),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### sessions Table
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  gym_id UUID,                   -- Track which gym this session belongs to
  user_id UUID,                  -- Reference to gym_users
  token VARCHAR(255) UNIQUE,     -- JWT token
  expires_at TIMESTAMP,          -- When token expires
  created_at TIMESTAMP
);
```

## API Routes

### Authentication Routes (Public)

#### POST /api/auth/signup
Creates a new gym and its first admin user.

**Request:**
```json
{
  "gymName": "Fitness Plus",
  "email": "admin@fitnessplus.com",
  "password": "SecurePassword123",
  "confirmPassword": "SecurePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "gym_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "650e8400-e29b-41d4-a716-446655440111"
}
```

**Side Effects:**
- Creates row in `gyms` with status='trial'
- Creates row in `gym_users` with role='admin'
- Sets auth_token cookie

#### POST /api/auth/login
Authenticates an existing gym user.

**Request:**
```json
{
  "email": "admin@fitnessplus.com",
  "password": "SecurePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "session": {
    "gym_id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "650e8400-e29b-41d4-a716-446655440111",
    "email": "admin@fitnessplus.com",
    "role": "admin",
    "gym_name": "Fitness Plus",
    "subscription_status": "trial"
  }
}
```

#### POST /api/auth/logout
Clears the auth token.

**Request:** (no body)

**Response:**
```json
{
  "success": true
}
```

**Side Effects:**
- Clears auth_token cookie

#### GET /api/auth/verify
Checks if current token is valid (used on page load to restore session).

**Request:** (token in cookie/header)

**Response (authenticated):**
```json
{
  "authenticated": true,
  "session": {
    "gym_id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "650e8400-e29b-41d4-a716-446655440111",
    "email": "admin@fitnessplus.com",
    "role": "admin",
    "gym_name": "Fitness Plus",
    "subscription_status": "trial"
  }
}
```

**Response (not authenticated):**
```json
{
  "authenticated": false
}
```

### Protected Routes (Require Authentication)

All these routes:
1. Check for valid JWT token
2. Verify gym_id in token matches database
3. Filter all queries by gym_id
4. Return 401 if not authenticated

#### GET /api/members
Returns members for the authenticated gym only.

**Query Parameters:**
- `status` - optional filter ('at-risk', 'active')

**Response:**
```json
[
  {
    "id": "750e8400-e29b-41d4-a716-446655440222",
    "gym_id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "join_date": "2024-01-15",
    "payment_status": "Active",
    "last_activity": "2024-04-20",
    "email": "john@email.com",
    "phone": "555-0100"
  }
]
```

#### POST /api/upload
Uploads members for the authenticated gym.

**Request:**
```
multipart/form-data
- file: CSV or PDF file
```

**Response:**
```json
{
  "success": true,
  "imported": 150,
  "gym_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Side Effects:**
- Clears previous members for this gym
- Inserts new members with gym_id
- Updates member_count in gyms table

#### GET /api/actions
Returns action items for members of the authenticated gym.

**Response:**
```json
[
  {
    "member_id": "750e8400-e29b-41d4-a716-446655440222",
    "member_name": "John Doe",
    "action": "Day 7 Check-in",
    "script": "Hi John! How's your first week been?",
    "priority": "moderate"
  }
]
```

## Security Features

### Password Security
- Passwords hashed with bcrypt (10 salt rounds)
- Hashes compared on login (not reversed)
- Never stored in plain text
- Never logged or displayed

### Token Security
- JWT tokens signed with `JWT_SECRET`
- Token contains gym_id and user_id
- Signature verified on every request
- 30-day expiration (customizable)
- Tokens stored in http-only cookies (not JavaScript accessible)

### Data Isolation
- Every row in `members`, `subscriptions`, `payment_history` has `gym_id`
- Middleware adds `gym_id` to all API requests
- Every query includes `WHERE gym_id = :gym_id`
- No query should ever return data from multiple gyms

### Session Validation
- Token expiration checked on every request
- Subscription status checked on login
- Cancelled subscriptions deny access
- user_id verified against gym_id in database

## Example: Request Flow for "/api/members"

```
1. Browser sends:
   GET /api/members
   Cookie: auth_token=eyJhbGciOiJIUzI1NiIs...

2. Middleware checks token:
   - Verifies JWT signature with JWT_SECRET
   - Extracts gym_id = "550e8400-..." and user_id = "650e8400-..."
   - Adds to request headers

3. API handler executes:
   SELECT * FROM members 
   WHERE gym_id = '550e8400-...'

4. Database returns:
   - Only members belonging to gym_id = "550e8400-..."
   - Never members from other gyms
   - Even if attacker modified token, signature check would fail

5. Response sent to browser:
   [
     { name: "John", gym_id: "550e8400-...", ... },
     { name: "Jane", gym_id: "550e8400-...", ... }
   ]
```

## Token Structure

JWT tokens are decoded as:
```json
{
  "gym_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "650e8400-e29b-41d4-a716-446655440111",
  "email": "admin@fitnessplus.com",
  "iat": 1713556800,          // issued at (Unix timestamp)
  "exp": 1716235200           // expires at (Unix timestamp)
}
```

The token is signed with JWT_SECRET using HMAC-SHA256:
```
HMACSHA256(
  base64UrlEncode(header) + "." +
  base64UrlEncode(payload),
  secret
)
```

## Migration Path (Phase 3)

1. **Backup JSON data** - Current members.json
2. **Create migration script** - Read JSON, insert into PostgreSQL with gym_id='DEFAULT_GYM'
3. **Map old data** - All existing members → default gym
4. **Test queries** - Verify counts match
5. **Deploy** - Switch API from JSON to PostgreSQL

## Future Enhancements

### Short Term (Phase 2)
- Add multi-user support (invite staff/managers)
- Role-based API permissions
- Stripe billing integration
- Email notifications

### Medium Term (Phase 3)
- API keys for integrations
- Audit logs (who accessed what when)
- Two-factor authentication
- Password reset flow

### Long Term (Phase 4)
- SAML/SSO for enterprise
- API usage billing
- Single sign-on across multiple gyms
- Franchise admin dashboard (see all locations)
