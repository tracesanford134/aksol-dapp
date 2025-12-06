import React, { useEffect, useState } from "react";

type PriceTickerBarProps = {
  isMainnet: boolean;
};

type PriceState = {
  solUsd: number | null;
  aksolUsd: number | null;
  aksolPerSol: number | null;
  updatedAt: string | null;
};

const COINGECKO_SOL_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd";

// Dexscreener token endpoint – safe to call even if it hasn’t picked AKSOL up yet.
// It will just return no pairs and we’ll gracefully show “price pending”.
const AKSOL_DEXSCREENER_URL =
  "https://api.dexscreener.com/latest/dex/tokens/2ENXnAQFQAhQ5kF49SSj9Jm4tPb2fShYs4DDuVdtwvSK";

const PriceTickerBar: React.FC<PriceTickerBarProps> = ({ isMainnet }) => {
  const [prices, setPrices] = useState<PriceState>({
    solUsd: null,
    aksolUsd: null,
    aksolPerSol: null,
    updatedAt: null,
  });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchPrices = async () => {
      try {
        setError(null);

        const [solResp, aksolResp] = await Promise.all([
          fetch(COINGECKO_SOL_URL),
          fetch(AKSOL_DEXSCREENER_URL),
        ]);

        let solUsd: number | null = null;
        let aksolUsd: number | null = null;
        let aksolPerSol: number | null = null;

        // --- SOL price (USD) from CoinGecko ---
        if (solResp.ok) {
          const solJson: any = await solResp.json();
          if (solJson?.solana?.usd != null) {
            solUsd = Number(solJson.solana.usd);
          }
        }

        // --- AKSOL price from Dexscreener (if available) ---
        if (aksolResp.ok) {
          const aksolJson: any = await aksolResp.json();

          const pairs = Array.isArray(aksolJson?.pairs)
            ? aksolJson.pairs
            : Array.isArray(aksolJson?.data?.pairs)
            ? aksolJson.data.pairs
            : [];

          if (pairs.length > 0) {
            const mainPair: any = pairs[0];

            // Direct USD price if Dexscreener has it
            if (mainPair.priceUsd != null) {
              aksolUsd = Number(mainPair.priceUsd);
            }

            // If quoted in SOL and priceNative is AKSOL price in SOL.
            if (
              mainPair.priceNative != null &&
              (mainPair.quoteToken?.symbol === "SOL" ||
                mainPair.baseToken?.symbol === "SOL")
            ) {
              const nativePrice = Number(mainPair.priceNative);
              if (nativePrice > 0) {
                // priceNative = 1 AKSOL in SOL → 1 SOL = 1 / priceNative AKSOL
                aksolPerSol = 1 / nativePrice;
              }
            }
          }
        }

        if (!cancelled) {
          setPrices({
            solUsd,
            aksolUsd,
            aksolPerSol,
            updatedAt: new Date().toISOString(),
          });
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error("Price ticker fetch failed:", err);
          setError("Live pricing temporarily unavailable");
          setPrices((prev) => ({
            ...prev,
            updatedAt: new Date().toISOString(),
          }));
        }
      }
    };

    // Initial fetch + refresh every 30s
    fetchPrices();
    const id = window.setInterval(fetchPrices, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const solLabel =
    prices.solUsd != null ? `$${prices.solUsd.toFixed(2)}` : "—";

  const aksolLabel =
    prices.aksolUsd != null
      ? `$${prices.aksolUsd.toFixed(6)}`
      : prices.aksolPerSol != null
      ? `${prices.aksolPerSol.toFixed(0)} AKSOL / SOL`
      : "—";

  const networkLabel = isMainnet ? "MAINNET view" : "DEVNET view";

  return (
    <div className="price-ticker-bar">
      <div className="price-ticker-left">
        <span className="price-ticker-title">Live market snapshot</span>
        <span className="price-ticker-network">
          {networkLabel}
          <span className="price-network-pill">
            {isMainnet ? "mainnet-beta" : "devnet"}
          </span>
        </span>
      </div>

      <div className="price-ticker-right">
        <div className="price-ticker-item">
          <span className="price-token">SOL</span>
          <span className="price-value">{solLabel}</span>
          <span className="price-sub">per SOL</span>
        </div>

        <div className="price-ticker-item">
          <span className="price-token">AKSOL</span>
          <span className="price-value">{aksolLabel}</span>
          <span className="price-sub">
            {prices.aksolUsd != null
              ? "per AKSOL"
              : prices.aksolPerSol != null
              ? "per SOL"
              : "price pending"}
          </span>
        </div>

        <div className="price-ticker-note">
          {error
            ? error
            : prices.updatedAt
            ? `Updated ${new Date(
                prices.updatedAt,
              ).toLocaleTimeString()}`
            : "Fetching live prices…"}
        </div>
      </div>
    </div>
  );
};

export default PriceTickerBar;
