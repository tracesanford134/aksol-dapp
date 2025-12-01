import type { FormEvent } from "react";
import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";
import type { AksolNetworkConfig } from "../networkConfig";

type TaxedSendCardProps = {
  publicMode: boolean;
  logAction: (label: string, signature?: string) => void;
  isMainnet: boolean;
  networkConfig: AksolNetworkConfig;
  walletPublicKey: string | null;
};

function TaxedSendCard({
  publicMode,
  logAction,
  isMainnet,
  networkConfig,
  walletPublicKey,
}: TaxedSendCardProps) {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [toAddress, setToAddress] = useState("");
  const [amountUi, setAmountUi] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txSig, setTxSig] = useState<string | null>(null);

  const backendBaseUrl =
    import.meta.env.VITE_BACKEND_BASE_URL || "http://localhost:8080";
  const explorerBaseUrl =
    import.meta.env.VITE_EXPLORER_BASE_URL || "https://explorer.solana.com";

  const cluster = isMainnet ? "mainnet-beta" : "devnet";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setTxSig(null);

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

    const parsedAmount = Number(amountUi);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      const msg = "Amount must be a positive number.";
      setError(msg);
      return;
    }

    if (!toAddress || toAddress.trim().length < 8) {
      const msg = "AKSOL recipient address looks incomplete.";
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
          toPubkey: toAddress.trim(),
          amountUi: parsedAmount,
          cluster,
        }),
      });

      if (!resp.ok) {
        throw new Error(`Backend HTTP ${resp.status}`);
      }

      const data = await resp.json();
      console.log("Backend /aksol/send-taxed-tx response:", data);

      // CASE A: backend already broadcasted and returns a signature
      let signature: string | undefined =
        data.signature ||
        data.txSignature ||
        data.transactionSignature ||
        data.sig;

      if (signature) {
        setTxSig(signature);
        const modeLabel = isMainnet ? "MAINNET" : "devnet";
        logAction(`Taxed send (${modeLabel})`, signature);
        return;
      }

      // CASE B: backend returns a serialized transaction we must sign+send
      const base64Tx: string | undefined =
        data.transaction || data.tx || data.txBase64 || data.serializedTx;

      if (!base64Tx) {
        throw new Error(
          "Backend did not return a signature or transaction. Check console logs for full response."
        );
      }

      const tx = Transaction.from(Buffer.from(base64Tx, "base64"));

      tx.feePayer = wallet.publicKey;

      const signed = await wallet.signTransaction(tx);
      const sig = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(sig, "confirmed");

      setTxSig(sig);
      const modeLabel = isMainnet ? "MAINNET" : "devnet";
      logAction(`Taxed send (${modeLabel})`, sig);
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

  const trimmedSig = txSig ? `${txSig.slice(0, 4)}…${txSig.slice(-4)}` : null;

  return (
    <section className="card card-taxed">
      {/* Header with pill */}
      <header
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.4rem",
          marginBottom: "0.35rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem",
          }}
        >
          <h2 style={{ margin: 0 }}>Send AKSOL with tax (3%)</h2>

          <span className="card-pill">
            {networkConfig.label}
            {publicMode ? " · Public" : " · Dev"}
          </span>
        </div>

        {isMainnet && (
          <div className="card-warning">
            MAINNET ACTIVE – This uses real funds. Start with a tiny test amount
            (e.g. 0.1 AKSOL) and double-check the destination address.
          </div>
        )}
      </header>

      {/* Intro copy */}
      <small
        style={{
          display: "block",
          marginTop: "0.15rem",
          marginBottom: "0.5rem",
          fontSize: "0.75rem",
          color: "#9ca3af",
        }}
      >
        {isMainnet ? (
          <>
            <strong>Mainnet demo:</strong> this card currently sends a small
            amount of <strong>SOL</strong> and applies the standard{" "}
            <strong>3% protocol tax</strong>, routed into the on-chain buyback,
            liquidity, and staking wallets from your AKSOL config. In a future
            upgrade, this flow will route <strong>AKSOL tokens</strong> instead
            of SOL on mainnet.
          </>
        ) : (
          <>
            <strong>Devnet test:</strong> uses SOL on devnet to exercise the
            same 3% tax logic with test funds only. Safe to experiment here
            before touching mainnet, while the underlying config mirrors your
            AKSOL mainnet setup.
          </>
        )}
      </small>

      {walletPublicKey && (
        <small
          style={{
            display: "block",
            marginBottom: "0.5rem",
            fontSize: "0.7rem",
            color: "#6b7280",
          }}
        >
          Connected wallet:{" "}
          <code>
            {walletPublicKey.slice(0, 4)}…{walletPublicKey.slice(-4)}
          </code>
        </small>
      )}

      {/* FORM */}
      <form onSubmit={handleSubmit} className="stacked-form">
        <label className="field">
          <span className="field-label">AKSOL recipient</span>
          <input
            type="text"
            placeholder="Enter AKSOL wallet address"
            value={toAddress}
            onChange={(e) => setToAddress(e.target.value)}
          />
        </label>

        <label className="field">
          <span className="field-label">Amount (AKSOL)</span>
          <input
            type="number"
            min="0"
            step="0.0001"
            placeholder="0.10"
            value={amountUi}
            onChange={(e) => setAmountUi(e.target.value)}
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? "Sending with tax…" : "Send with tax"}
        </button>
      </form>

      {/* Helper text under form */}
      <small
        style={{
          display: "block",
          marginTop: "0.5rem",
          fontSize: "0.75rem",
          color: "#9ca3af",
        }}
      >
        Backend constructs a taxed transfer, either broadcasting it directly or
        returning a transaction for your wallet to sign. The AKSOL tax (3%) is
        routed according to your on-chain config wallets.
      </small>

      {/* Error status */}
      {error && <div className="status-error">Error: {error}</div>}

      {/* Last transaction metadata */}
      {txSig && (
        <div className="tx-meta">
          <div className="tx-meta-label">
            Last taxed send: <code>{trimmedSig}</code>
          </div>
          <div className="wallet-overview-link">
            <a
              href={`${explorerBaseUrl}/tx/${txSig}?cluster=${cluster}`}
              target="_blank"
              rel="noreferrer"
            >
              View last tx on Explorer
            </a>
          </div>
        </div>
      )}

      {/* Public-mode investor note */}
      {publicMode && (
        <p
          style={{
            marginTop: "0.75rem",
            fontSize: "0.75rem",
            color: "#9ca3af",
          }}
        >
          <strong>Investor note:</strong> On mainnet, this card represents the
          standard AKSOL protocol tax path, while the 0% route card showcases
          special partner / on-ramp flows.
        </p>
      )}
    </section>
  );
}

export default TaxedSendCard;
