import type { FormEvent } from "react";
import { useState } from "react";
import { Connection, Transaction } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import type { AksolNetworkConfig } from "../networkConfig";

interface TaxedSendCardProps {
  publicMode: boolean;
  logAction: (label: string, signature?: string) => void;
  networkConfig: AksolNetworkConfig;
  backendBaseUrl?: string;
  explorerBaseUrl?: string;
  walletPublicKey: string | null;
}

// Helper: decode base64 → Uint8Array in browser
function decodeBase64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export default function TaxedSendCard({
  publicMode,
  logAction,
  networkConfig,
  backendBaseUrl,
  explorerBaseUrl,
  walletPublicKey,
}: TaxedSendCardProps) {
  const { sendTransaction } = useWallet();

  const [toAddress, setToAddress] = useState("");
  const [amountUi, setAmountUi] = useState("");
  const [txSig, setTxSig] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMainnet = networkConfig.name === "mainnet-beta";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setTxSig(null);

    if (!backendBaseUrl) {
      const msg = "Backend URL is not configured.";
      setError(msg);
      logAction("Taxed send failed: backend URL not set");
      return;
    }

    if (!walletPublicKey) {
      const msg = "Connect a wallet before using the taxed send route.";
      setError(msg);
      logAction("Taxed send failed: no wallet connected");
      return;
    }

    if (!toAddress || !amountUi) {
      const msg = "Enter a destination address and amount.";
      setError(msg);
      return;
    }

    const parsedAmount = Number(amountUi);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      const msg = "Amount must be a positive number.";
      setError(msg);
      return;
    }

    setLoading(true);

    try {
      // 1. Ask backend to prepare the taxed transfer
      const resp = await fetch(`${backendBaseUrl}/aksol/send-taxed-tx`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromPubkey: walletPublicKey,
          toPubkey: toAddress,
          amountUi: parsedAmount,
          cluster: networkConfig.name, // "devnet" or "mainnet-beta"
        }),
      });

      if (!resp.ok) {
        throw new Error(`Backend HTTP ${resp.status}`);
      }

      const data = await resp.json();
      console.log("Backend /aksol/send-taxed-tx response:", data);

      // === CASE A: backend already broadcasted and returns a signature ===
      let signature: string | undefined =
        data.signature || data.txSignature || data.transactionSignature;

      if (!signature) {
        // === CASE B: backend returns a serialized transaction we must sign+send ===
        const base64Tx: string | undefined =
          data.transaction || data.tx || data.txBase64 || data.serializedTx;

        if (!base64Tx) {
          throw new Error(
            "Backend did not return a signature or transaction. Check server logs."
          );
        }

        const rawTx = decodeBase64ToBytes(base64Tx);
        const tx = Transaction.from(rawTx);

        const connection = new Connection(networkConfig.rpcUrl, "confirmed");
        signature = await sendTransaction(tx, connection);
      }

      setTxSig(signature);

      const modeLabel = isMainnet ? "MAINNET" : "devnet";
      logAction(`Taxed send (${modeLabel})`, signature);
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

  const explorerBase =
    explorerBaseUrl && explorerBaseUrl.length > 0
      ? explorerBaseUrl
      : "https://explorer.solana.com";

  const clusterQuery =
    networkConfig.name === "devnet" ? "?cluster=devnet" : "";

  return (

  <section className="card card-taxed">
      {/* Header with green dot + pill */}
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
      <small>
        This flow applies the standard AKSOL tax (currently{" "}
        <strong>3%</strong>) and routes fees into the buyback, liquidity, and
        staking wallets configured on-chain.
      </small>

      {/* Form – button markup stays the same style as your 0% card */}
<form onSubmit={handleSubmit} className="stacked-form">
  <label className="field">
    <span>(AKSOL) recipient</span>
    <input
      type="text"
      placeholder="Wallet address to receive AKSOL"
      value={toAddress}
      onChange={(e) => setToAddress(e.target.value)}
    />
  </label>

  <label className="field">
    <span>(AKSOL) amount</span>
    <input
      type="number"
      min="0"
      step="0.000001"
      placeholder="0.10"
      value={amountUi}
      onChange={(e) => setAmountUi(e.target.value)}
    />
  </label>

  <button type="submit" disabled={loading}>
    {loading
      ? isMainnet
        ? "Sending taxed tx on MAINNET…"
        : "Sending taxed tx on devnet…"
      : isMainnet
      ? "Send taxed AKSOL (MAINNET)"
      : "Send taxed AKSOL (devnet)"}
  </button>
</form>

      <small>
        Backend builds a taxed transfer using the AKSOL program. Your wallet
        signs and sends on{" "}
        <strong>
          {networkConfig.name === "devnet" ? "devnet" : "mainnet-beta"}
        </strong>
        .
      </small>

      {error && <div className="status-error">Error: {error}</div>}

      {txSig && (
        <div className="tx-meta">
          <div className="tx-meta-label">
            Last taxed send: <code>{trimmedSig}</code>
          </div>
          <div className="wallet-overview-link">
            <a
              href={`${explorerBase}/tx/${txSig}${clusterQuery}`}
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
          <strong>Investor note:</strong> This card shows AKSOL&apos;s standard
          taxed path (3% routed to protocol wallets). The 0% route card
          represents special partner / on-ramp flows with no tax applied.
        </p>
      )}
    </section>
  );
}
