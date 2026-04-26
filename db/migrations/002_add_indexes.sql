-- Indexes for gyms table
CREATE INDEX IF NOT EXISTS idx_gyms_email ON gyms(email);
CREATE INDEX IF NOT EXISTS idx_gyms_stripe_customer_id ON gyms(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_gyms_status ON gyms(status);

-- Indexes for gym_users table
CREATE INDEX IF NOT EXISTS idx_gym_users_gym_id ON gym_users(gym_id);
CREATE INDEX IF NOT EXISTS idx_gym_users_email ON gym_users(email);

-- Indexes for members table
CREATE INDEX IF NOT EXISTS idx_members_gym_id ON members(gym_id);
CREATE INDEX IF NOT EXISTS idx_members_gym_id_last_activity ON members(gym_id, last_activity);
CREATE INDEX IF NOT EXISTS idx_members_gym_id_join_date ON members(gym_id, join_date);

-- Indexes for subscriptions table
CREATE INDEX IF NOT EXISTS idx_subscriptions_gym_id ON subscriptions(gym_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);

-- Indexes for payment_history table
CREATE INDEX IF NOT EXISTS idx_payment_history_gym_id ON payment_history(gym_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_created_at ON payment_history(created_at);

-- Indexes for sessions table
CREATE INDEX IF NOT EXISTS idx_sessions_gym_id ON sessions(gym_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
