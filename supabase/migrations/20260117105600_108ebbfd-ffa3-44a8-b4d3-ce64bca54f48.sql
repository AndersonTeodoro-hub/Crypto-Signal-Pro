-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  plan TEXT NOT NULL DEFAULT 'free',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create allowed_pairs table (50 crypto pairs)
CREATE TABLE public.allowed_pairs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  rank INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on allowed_pairs (public read)
ALTER TABLE public.allowed_pairs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view allowed pairs" ON public.allowed_pairs FOR SELECT USING (true);

-- Create user_settings table
CREATE TABLE public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  selected_pair_id UUID REFERENCES public.allowed_pairs(id),
  timeframe TEXT NOT NULL DEFAULT '4H',
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on user_settings
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- User settings policies
CREATE POLICY "Users can view their own settings" ON public.user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own settings" ON public.user_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own settings" ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create signals table
CREATE TABLE public.signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pair_id UUID NOT NULL REFERENCES public.allowed_pairs(id),
  timeframe TEXT NOT NULL,
  direction TEXT NOT NULL,
  grade TEXT NOT NULL,
  entry_price DECIMAL NOT NULL,
  stop_loss DECIMAL NOT NULL,
  take_profit_1 DECIMAL NOT NULL,
  take_profit_2 DECIMAL NOT NULL,
  take_profit_3 DECIMAL NOT NULL,
  analysis TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on signals (public read for active signals)
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view signals" ON public.signals FOR SELECT USING (true);

-- Create user_signals table (tracks which signals user has seen)
CREATE TABLE public.user_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_id UUID NOT NULL REFERENCES public.signals(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_notified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, signal_id)
);

-- Enable RLS on user_signals
ALTER TABLE public.user_signals ENABLE ROW LEVEL SECURITY;

-- User signals policies
CREATE POLICY "Users can view their own signal notifications" ON public.user_signals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own signal notifications" ON public.user_signals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own signal notifications" ON public.user_signals FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Enable realtime for signals
ALTER PUBLICATION supabase_realtime ADD TABLE public.signals;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);
  
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert the 50 allowed crypto pairs
INSERT INTO public.allowed_pairs (symbol, name, rank) VALUES
('BTCUSDT', 'Bitcoin', 1),
('ETHUSDT', 'Ethereum', 2),
('BNBUSDT', 'BNB', 3),
('XRPUSDT', 'XRP', 4),
('ADAUSDT', 'Cardano', 5),
('DOGEUSDT', 'Dogecoin', 6),
('SOLUSDT', 'Solana', 7),
('DOTUSDT', 'Polkadot', 8),
('MATICUSDT', 'Polygon', 9),
('LTCUSDT', 'Litecoin', 10),
('SHIBUSDT', 'Shiba Inu', 11),
('TRXUSDT', 'TRON', 12),
('AVAXUSDT', 'Avalanche', 13),
('LINKUSDT', 'Chainlink', 14),
('ATOMUSDT', 'Cosmos', 15),
('UNIUSDT', 'Uniswap', 16),
('ETCUSDT', 'Ethereum Classic', 17),
('XLMUSDT', 'Stellar', 18),
('BCHUSDT', 'Bitcoin Cash', 19),
('ALGOUSDT', 'Algorand', 20),
('VETUSDT', 'VeChain', 21),
('ICPUSDT', 'Internet Computer', 22),
('FILUSDT', 'Filecoin', 23),
('APTUSDT', 'Aptos', 24),
('ARBUSDT', 'Arbitrum', 25),
('OPUSDT', 'Optimism', 26),
('NEARUSDT', 'NEAR Protocol', 27),
('AAVEUSDT', 'Aave', 28),
('GRTUSDT', 'The Graph', 29),
('SANDUSDT', 'The Sandbox', 30),
('MANAUSDT', 'Decentraland', 31),
('AXSUSDT', 'Axie Infinity', 32),
('THETAUSDT', 'Theta Network', 33),
('EGLDUSDT', 'MultiversX', 34),
('XTZUSDT', 'Tezos', 35),
('EOSUSDT', 'EOS', 36),
('FLOWUSDT', 'Flow', 37),
('CHZUSDT', 'Chiliz', 38),
('MKRUSDT', 'Maker', 39),
('SNXUSDT', 'Synthetix', 40),
('CRVUSDT', 'Curve DAO', 41),
('LDOUSDT', 'Lido DAO', 42),
('RNDRUSDT', 'Render', 43),
('INJUSDT', 'Injective', 44),
('SUIUSDT', 'Sui', 45),
('SEIUSDT', 'Sei', 46),
('TIAUSDT', 'Celestia', 47),
('JUPUSDT', 'Jupiter', 48),
('WLDUSDT', 'Worldcoin', 49),
('PENDLEUSDT', 'Pendle', 50);