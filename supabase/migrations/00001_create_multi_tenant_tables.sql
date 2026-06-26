CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name VARCHAR(100) NOT NULL,
  api_token VARCHAR(255) UNIQUE NOT NULL,
  setup_step INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daraja_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  consumer_key TEXT,
  consumer_secret TEXT,
  passkey TEXT,
  shortcode VARCHAR(20),
  environment VARCHAR(10) DEFAULT 'sandbox',
  callback_url TEXT,
  is_configured BOOLEAN DEFAULT false,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  phone VARCHAR(20),
  amount NUMERIC(10,2),
  reference VARCHAR(100),
  checkout_request_id VARCHAR(100),
  mpesa_receipt VARCHAR(50),
  status VARCHAR(20) DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT NOW()
);

DROP TABLE IF EXISTS daraja_config;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE daraja_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "own profile" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY IF NOT EXISTS "own credentials" ON daraja_credentials FOR ALL USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "own transactions" ON transactions FOR ALL USING (auth.uid() = user_id);
