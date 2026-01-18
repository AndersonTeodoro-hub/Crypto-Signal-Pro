-- =====================================================
-- GROWTH FEATURES: Referrals, Access Grants, Admin Flag
-- =====================================================

-- 1. Update profiles table: add referral_code, referred_by, is_admin
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by uuid,
ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- Index for fast referral code lookups
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);

-- 2. Create access_grants table (for manual grants/airdrop/test access)
CREATE TABLE IF NOT EXISTS access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  plan text NOT NULL CHECK (plan IN ('free', 'basic', 'pro')),
  source text NOT NULL DEFAULT 'admin',
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS - users can only SELECT their own grants (no INSERT/UPDATE/DELETE)
ALTER TABLE access_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own grants" ON access_grants
  FOR SELECT USING (auth.uid() = user_id);

-- Performance index for effective plan lookups
CREATE INDEX IF NOT EXISTS idx_access_grants_user_expiry 
  ON access_grants (user_id, expires_at DESC);

-- 3. Create referrals table (track referrals + manual approval)
CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL REFERENCES profiles(user_id),
  referee_user_id uuid NOT NULL REFERENCES profiles(user_id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'rewarded')),
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  notes text
);

-- Enable RLS - users can only SELECT where they're referrer OR referee
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own referrals" ON referrals
  FOR SELECT USING (auth.uid() = referrer_user_id OR auth.uid() = referee_user_id);

-- 4. Update handle_new_user() to generate referral_code
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE 
  new_referral_code text;
BEGIN
  -- Generate unique 8-character referral code (uppercase alphanumeric)
  LOOP
    new_referral_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE referral_code = new_referral_code);
  END LOOP;

  -- Insert profile with referral_code
  INSERT INTO public.profiles (user_id, email, referral_code)
  VALUES (NEW.id, NEW.email, new_referral_code);
  
  -- Insert user_settings
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;

-- 5. Backfill existing profiles without referral_code
UPDATE profiles 
SET referral_code = upper(substr(md5(random()::text || user_id::text), 1, 8))
WHERE referral_code IS NULL;

-- Make referral_code NOT NULL after backfill
ALTER TABLE profiles ALTER COLUMN referral_code SET NOT NULL;