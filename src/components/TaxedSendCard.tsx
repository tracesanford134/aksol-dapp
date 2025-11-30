import type { FormEvent } from "react";
import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";

type TaxedSendCardProps = {
  publicMode: boolean;
  logAction: (label: string, signature?: string) => void;
};

function TaxedSendCard({ publicMode, logAction }: TaxedSendCardProps) {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [toAddress, setToAddress] = useState("");
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
      const msg = "Connect a wallet before sending with tax.";
      setError(msg);
      logAction("Taxed send failed: no wallet connected");
      return;
    }

    if (!wallet.signTransaction) {
      const msg = "Current wallet does not support transaction signing.";
      setError(msg);
      logAction("Taxed send failed: wallet cannot sign");
      return;
    }

    const trimmedTo = toAddress.trim();
    const parsedAmount = Number(amount);

    if (!trimmedTo) {
      const msg = "Please enter a recipient address.";
      setError(msg);
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      const msg = "Amount must be a positive number.";
      setError(msg);
      return;
    }

    setLoading(true);

    try {
      const resp = await fetch(`${backendBaseUrl}/aksol/send-taxed-tx`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromPubkey: wallet.publicKey.toBase58(),
          toPubkey: trimmedTo,
          amountUi: parsedAmount,
          cluster,
        }),
      });

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

      // feePayer is already set in backend, but enforce wallet as signer
      tx.feePayer = wallet.publicKey;

      const signed = await wallet.signTransaction(tx);
      const sig = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(sig, "confirmed");

      setLastSig(sig);
      logAction("Taxed send submitted", sig);
    } catch (err: any) {
      console.error("Taxed send error:", err);
      const msg =
        (err && typeof err.message === "string" && err.message) ||
        (typeof err === "string" && err) ||
        "Taxed send failed.";
      setError(msg);
      logAction(`Taxed send failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const trimmedSig = lastSig
    ? `${lastSig.slice(0, 4)}…${lastSig.slice(-4)}`
    : null;

  return (
    <section className="card">
      <h2>Send with 3% tax (demo)</h2>
      <small>
        This demo flow sends SOL on devnet with a built-in 3% tax. 97% goes to
        the recipient, 3% goes to the configured tax wallet.
      </small>

      <form onSubmit={handleSubmit} className="stacked-form">
        <label className="field">
          <span>Recipient address: </span>
          <input
            type="text"
            placeholder="Paste a devnet wallet address"
            value={toAddress}
            onChange={(e) => setToAddress(e.target.value)}
          />
        </label>

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
          {loading ? "Preparing transaction…" : "Send with 3% tax"}
        </button>
      </form>

      <small>
        Backend builds the transaction with both the net amount and tax route.
        Your wallet signs and sends on{" "}
        <strong>{cluster === "devnet" ? "devnet" : cluster}</strong>.
      </small>

      {error && <div className="status-error">Error: {error}</div>}

      {lastSig && (
        <div className="tx-meta">
          <div className="tx-meta-label">
            Last taxed send: <code>{trimmedSig}</code>
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
          <strong>Investor note:</strong> On mainnet, this card will call the
          AKSOL token program’s taxed transfer logic instead of plain SOL.
        </p>
      )}
    </section>
  );
}

export default TaxedSendCard;
