import { useEffect, useRef, memo } from 'react';

function TickerTapeComponent() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptElRef = useRef<HTMLScriptElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Prevent duplicate scripts (e.g. during fast refresh)
    if (scriptElRef.current) return;

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
    script.async = true;
    script.type = 'text/javascript';

    script.innerHTML = JSON.stringify({
      symbols: [
        { proName: 'BINANCE:BTCUSDT', title: 'BTC/USDT' },
        { proName: 'BINANCE:ETHUSDT', title: 'ETH/USDT' },
        { proName: 'BINANCE:SOLUSDT', title: 'SOL/USDT' },
        { proName: 'BINANCE:BNBUSDT', title: 'BNB/USDT' },
        { proName: 'BINANCE:XRPUSDT', title: 'XRP/USDT' },
        { proName: 'BINANCE:ADAUSDT', title: 'ADA/USDT' },
        { proName: 'BINANCE:DOGEUSDT', title: 'DOGE/USDT' },
        { proName: 'BINANCE:AVAXUSDT', title: 'AVAX/USDT' },
        { proName: 'BINANCE:LINKUSDT', title: 'LINK/USDT' },
        { proName: 'BINANCE:TONUSDT', title: 'TON/USDT' },
        { proName: 'BINANCE:DOTUSDT', title: 'DOT/USDT' },
        { proName: 'BINANCE:TRXUSDT', title: 'TRX/USDT' },
        { proName: 'CRYPTO:USDCUSD', title: 'USDC/USD' },
      ],
      showSymbolLogo: true,
      colorTheme: 'dark',
      isTransparent: true,
      displayMode: 'adaptive',
      locale: 'en',
    });

    container.appendChild(script);
    scriptElRef.current = script;

    return () => {
      // Remove injected script and widget markup
      scriptElRef.current?.remove();
      scriptElRef.current = null;

      const widget = container.querySelector(
        '.tradingview-widget-container__widget'
      ) as HTMLDivElement | null;
      if (widget) widget.innerHTML = '';
    };
  }, []);

  return (
    <div className="fixed left-0 right-0 top-16 z-40 bg-background/95 backdrop-blur-lg border-b border-border/30">
      <div
        ref={containerRef}
        className="tradingview-widget-container w-full overflow-hidden"
        role="region"
        aria-label="Crypto market ticker"
      >
        <div className="tradingview-widget-container__widget" style={{ height: '46px' }} />
      </div>
    </div>
  );
}

export const TickerTape = memo(TickerTapeComponent);
