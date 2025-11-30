import { useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { EXPLORER_BASE_URL, EXPLORER_CLUSTER_SUFFIX } from "../config";

const AKSOL_MINT = new PublicKey("QQjNxnJM1xGoHyXdbJPHZoKEnPEYYRjeFfWxRqdA6hq");

interface Balances {
  sol: number | null;
  aksol: number | null;
  aksolRaw: string | null;
  lastSig: string | null;
  lastTime: number | null; // unix seconds
}

function formatAgo(timestampSec: number | null): string {
  if (!timestampSec) return "No recent activity";
  const nowMs = Date.now();
  const tsMs = timestampSec * 1000;
  const diffMs = nowMs - tsMs;
  if (diffMs < 0) return "Just now";

  const diffMin = Math.floor(diffMs / (60 * 1000));
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr} hr${diffHr === 1 ? "" : "s"} ago`;
  return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
}

function WalletOverview() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [balances, setBalances] = useState<Balances>({
    sol: null,
    aksol: null,
    aksolRaw: null,
    lastSig: null,
    lastTime: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const pubkey = wallet.publicKey;

  useEffect(() => {
    if (!pubkey) {
      setBalances({
        sol: null,
        aksol: null,
        aksolRaw: null,
        lastSig: null,
        lastTime: null,
      });
      setError(null);
      return;
    }

    let cancelled = false;

    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        // Get SOL balance, AKSOL token balance, and last signature
        const [lamports, tokenAccounts, sigs] = await Promise.all([
          connection.getBalance(pubkey),
          connection.getParsedTokenAccountsByOwner(pubkey, {
            mint: AKSOL_MINT,
          }),
          connection.getSignaturesForAddress(pubkey, { limit: 1 }),
        ]);

        if (cancelled) return;

        const sol = lamports / LAMPORTS_PER_SOL;

        let aksol = 0;
        let aksolRaw: string | null = null;
        if (tokenAccounts.value.length > 0) {
          const info =
            tokenAccounts.value[0].account.data.parsed.info.tokenAmount;
          aksol = info.uiAmount ?? 0;
          aksolRaw = info.amount;
        }

        const lastSig = sigs.length > 0 ? sigs[0].signature : null;
        const lastTime = sigs.length > 0 ? sigs[0].blockTime ?? null : null;

        setBalances({ sol, aksol, aksolRaw, lastSig, lastTime });
      } catch (err: any) {
        if (cancelled) return;
        console.error("WalletOverview fetch error:", err);
        const msg =
          (err && typeof err.message === "string" && err.message) ||
          (typeof err === "string" && err) ||
          "Failed to load wallet data";
        setError(msg);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchAll();

    return () => {
      cancelled = true;
    };
  }, [connection, pubkey]);

  const hasWallet = !!pubkey;

  const explorerUrl =
    balances.lastSig != null
      ? `${EXPLORER_BASE_URL}/tx/${balances.lastSig}${EXPLORER_CLUSTER_SUFFIX}`
      : null;

  const handleCopy = async () => {
    if (!pubkey) return;
    try {
      await navigator.clipboard.writeText(pubkey.toBase58());
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      console.error("Clipboard error:", err);
    }
  };

  return (
    <section className="card wallet-overview">
      <div className="wallet-overview-main">
        <div className="wallet-metric">
          <div className="wallet-metric-label">SOL balance</div>
          <div className="wallet-metric-value">
            {hasWallet
              ? balances.sol != null
                ? balances.sol.toFixed(4)
                : loading
                ? "Loading…"
                : "0.0000"
              : "—"}
          </div>
          <div className="wallet-metric-sub">On Solana devnet</div>
        </div>

        <div className="wallet-metric">
          <div className="wallet-metric-label">AKSOL balance</div>
          <div className="wallet-metric-value">
            {hasWallet
              ? balances.aksol != null
                ? balances.aksol.toFixed(4)
                : loading
                ? "Loading…"
                : "0.0000"
              : "—"}
          </div>
          <div className="wallet-metric-sub">
            Mint: <code>AKSOL</code> (devnet)
          </div>
        </div>
      </div>

      <div className="wallet-overview-right">
        {!hasWallet && (
          <div className="wallet-overview-msg">
            Connect your wallet to see balances and recent activity.
          </div>
        )}

        {hasWallet && error && (
          <div className="status-error wallet-overview-msg">{error}</div>
        )}

        {hasWallet && !error && pubkey && (
          <div className="wallet-overview-msg">
            <div className="wallet-overview-label-row">
              <span>Connected wallet:</span>
              <button
                type="button"
                className="copy-button"
                onClick={handleCopy}
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="wallet-overview-address">
              {pubkey.toBase58()}
            </div>
            <div className="wallet-overview-activity">
              Last activity: {formatAgo(balances.lastTime)}
            </div>
            {explorerUrl && (
              <div className="wallet-overview-link">
                <a href={explorerUrl} target="_blank" rel="noreferrer">
                  View last tx on Explorer
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default WalletOverview;
