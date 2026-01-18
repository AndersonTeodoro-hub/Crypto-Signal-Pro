import { useEffect, useRef, memo } from 'react';

function TickerTapeComponent() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptLoaded = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || scriptLoaded.current) return;

    // Create and configure the script
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
    script.async = true;
    script.type = 'text/javascript';
    
    // Widget configuration
    script.innerHTML = JSON.stringify({
      symbols: [
        { proName: "BINANCE:BTCUSDT", title: "BTC/USDT" },
        { proName: "BINANCE:ETHUSDT", title: "ETH/USDT" },
        { proName: "BINANCE:SOLUSDT", title: "SOL/USDT" },
        { proName: "BINANCE:BNBUSDT", title: "BNB/USDT" },
        { proName: "BINANCE:XRPUSDT", title: "XRP/USDT" },
        { proName: "BINANCE:ADAUSDT", title: "ADA/USDT" },
        { proName: "BINANCE:DOGEUSDT", title: "DOGE/USDT" },
        { proName: "BINANCE:AVAXUSDT", title: "AVAX/USDT" },
        { proName: "BINANCE:LINKUSDT", title: "LINK/USDT" },
        { proName: "BINANCE:TONUSDT", title: "TON/USDT" },
        { proName: "BINANCE:DOTUSDT", title: "DOT/USDT" },
        { proName: "BINANCE:TRXUSDT", title: "TRX/USDT" },
        { proName: "CRYPTO:USDCUSD", title: "USDC/USD" }
      ],
      showSymbolLogo: true,
      colorTheme: "dark",
      isTransparent: true,
      displayMode: "adaptive",
      locale: "en"
    });

    container.appendChild(script);
    scriptLoaded.current = true;

    return () => {
      scriptLoaded.current = false;
    };
  }, []);

  return (
    <div className="fixed left-0 right-0 top-16 z-40 bg-background/95 backdrop-blur-lg border-b border-border/30">
      <div className="tradingview-widget-container w-full overflow-hidden">
        <div className="tradingview-widget-container__widget" style={{ height: '46px' }} />
        <div ref={containerRef} />
      </div>
    </div>
  );
}

export const TickerTape = memo(TickerTapeComponent);
