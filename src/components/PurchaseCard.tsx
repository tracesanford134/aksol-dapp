import type { FormEvent } from "react";
import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";

type PurchaseCardProps = {
  publicMode: boolean;
  logAction: (label: string, signature?: string) => void;
};

function PurchaseCard({ publicMode, logAction }: PurchaseCardProps) {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSig, setLastSig] = useState<string | null>(null);

  const backendBaseUrl =
    import.meta.env.VITE_BACKEND_BASE_URL || "http://localhost:8080";
  const cluster = import.meta.env.VITE_SOLANA_CLUSTER || "devnet";
  const explorerBaseUrl =
    import.meta.env.VITE_EXPLORER_BASE_URL || "https://explorer.solana.com";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLastSig(null);

    if (!wallet.connected || !wallet.publicKey) {
      const msg = "Connect a wallet before using the 0% route.";
      setError(msg);
      logAction("0% purchase failed: no wallet connected");
      return;
    }

    if (!wallet.signTransaction) {
      const msg = "Current wallet does not support transaction signing.";
      setError(msg);
      logAction("0% purchase failed: wallet cannot sign");
      return;
    }

    const parsedAmount = Number(amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      const msg = "Amount must be a positive number.";
      setError(msg);
      return;
    }

    setLoading(true);

    try {
      const resp = await fetch(
        `${backendBaseUrl}/aksol/zero-percent-purchase`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fromPubkey: wallet.publicKey.toBase58(),
            amountUi: parsedAmount,
            cluster,
          }),
        },
      );

      if (!resp.ok) {
        throw new Error(`Backend HTTP ${resp.status}`);
      }

      const json = await resp.json();
      if (!json.ok || !json.transaction) {
        throw new Error(json.error || "Backend did not return a transaction.");
      }

      const tx = Transaction.from(
        Buffer.from(json.transaction as string, "base64"),
      );

      tx.feePayer = wallet.publicKey;

      const signed = await wallet.signTransaction(tx);
      const sig = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(sig, "confirmed");

      setLastSig(sig);
      logAction("0% route purchase submitted", sig);
    } catch (err: any) {
      console.error("0% purchase error:", err);
      const msg =
        (err && typeof err.message === "string" && err.message) ||
        (typeof err === "string" && err) ||
        "0% purchase failed.";
      setError(msg);
      logAction(`0% purchase failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const trimmedSig = lastSig
    ? `${lastSig.slice(0, 4)}…${lastSig.slice(-4)}`
    : null;

  return (
    <section className="card">
      <h2>0% route (demo purchase)</h2>
      <small>
        This demo flow sends SOL to the designated 0% route wallet with{" "}
        <strong>no tax taken</strong>. It represents the kind of partner or
        on-ramp route AKSOL can offer on mainnet.
      </small>

      <form onSubmit={handleSubmit} className="stacked-form">
        <label className="field">
          <span>Amount (SOL): </span>
          <input
            type="number"
            min="0"
            step="0.0001"
            placeholder="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? "Preparing 0% transaction…" : "Use 0% route"}
        </button>
      </form>

      <small>
        Backend builds a single transfer to the 0% wallet. Your wallet signs
        and sends on{" "}
        <strong>{cluster === "devnet" ? "devnet" : cluster}</strong>.
      </small>

      {error && <div className="status-error">Error: {error}</div>}

      {lastSig && (
        <div className="tx-meta">
          <div className="tx-meta-label">
            Last 0% route tx: <code>{trimmedSig}</code>
          </div>
          <div className="wallet-overview-link">
            <a
              href={`${explorerBaseUrl}/tx/${lastSig}?cluster=${cluster}`}
              target="_blank"
              rel="noreferrer"
            >
              View last tx on Explorer
            </a>
          </div>
        </div>
      )}

      {publicMode && (
        <p
          style={{
            marginTop: "0.75rem",
            fontSize: "0.75rem",
            color: "#9ca3af",
          }}
        >
          <strong>Investor note:</strong> On mainnet, this card represents
          approved 0%-tax paths for partners, on-ramps, or special programs,
          while the normal send card uses the standard AKSOL tax.
        </p>
      )}
    </section>
  );
}

export default PurchaseCard;
