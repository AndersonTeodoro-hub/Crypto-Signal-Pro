import { useEffect, useRef, memo } from 'react';

function TickerTapeComponent() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clear any existing content to prevent duplicates
    container.innerHTML = '';

    // Create widget container
    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container';
    
    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetContainer.appendChild(widgetDiv);

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

    widgetContainer.appendChild(script);
    container.appendChild(widgetContainer);

    // Cleanup on unmount
    return () => {
      if (container) {
        container.innerHTML = '';
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="w-full overflow-hidden border-b border-border/30"
      style={{ height: '46px' }}
    />
  );
}

export const TickerTape = memo(TickerTapeComponent);
