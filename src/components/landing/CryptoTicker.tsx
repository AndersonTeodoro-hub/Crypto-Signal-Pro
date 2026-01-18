import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface CryptoPrice {
  id: string;
  symbol: string;
  current_price: number;
  price_change_percentage_24h: number;
  image: string;
}

export function CryptoTicker() {
  const [prices, setPrices] = useState<CryptoPrice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await fetch(
          'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&sparkline=false&price_change_percentage=24h'
        );
        if (response.ok) {
          const data = await response.json();
          setPrices(data);
        }
      } catch (error) {
        console.error('Failed to fetch crypto prices:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    }
    if (price >= 1) {
      return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `$${price.toFixed(4)}`;
  };

  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  if (loading || prices.length === 0) {
    return (
      <div className="bg-muted/30 border-y border-border/50 py-2">
        <div className="flex gap-8 animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-2 px-4">
              <div className="w-5 h-5 rounded-full bg-muted" />
              <div className="w-12 h-4 rounded bg-muted" />
              <div className="w-16 h-4 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Duplicate items for seamless infinite scroll
  const duplicatedPrices = [...prices, ...prices];

  return (
    <div className="bg-muted/30 border-y border-border/50 py-2 overflow-hidden">
      <div className="ticker-container">
        <div className="ticker-content">
          {duplicatedPrices.map((crypto, index) => {
            const isPositive = crypto.price_change_percentage_24h >= 0;
            return (
              <div 
                key={`${crypto.id}-${index}`}
                className="flex items-center gap-2 px-6 shrink-0"
              >
                <img 
                  src={crypto.image} 
                  alt={crypto.symbol}
                  className="w-5 h-5 rounded-full"
                />
                <span className="font-semibold text-sm uppercase text-foreground">
                  {crypto.symbol}
                </span>
                <span className="text-sm text-muted-foreground">
                  {formatPrice(crypto.current_price)}
                </span>
                <span 
                  className={`flex items-center gap-0.5 text-sm font-medium ${
                    isPositive ? 'text-green-500' : 'text-red-500'
                  }`}
                >
                  {isPositive ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {formatChange(crypto.price_change_percentage_24h)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
