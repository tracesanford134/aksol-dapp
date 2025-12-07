import React, { useState, useMemo, type FormEvent } from "react";

type StorefrontPurchaseCardProps = {
  isMainnet: boolean;
  publicMode: boolean;
  logAction: (label: string, signature?: string) => void;
};

// Backend base URL (local dev falls back to localhost)
const BACKEND_BASE_URL =
  import.meta.env.VITE_BACKEND_BASE_URL || "http://localhost:8080";

// 🔧 TEMP ESTIMATE ONLY – update this to a better hint or wire to live price later.
const EST_AKSOL_PER_SOL_HINT = 100000; // 1 SOL ≈ 100,000 AKSOL (example only)

const StorefrontPurchaseCard: React.FC<StorefrontPurchaseCardProps> = ({
  isMainnet,
  publicMode,
  logAction,
}) => {
  const [open, setOpen] = useState(false);
  const [solAmount, setSolAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!isMainnet) {
      alert("Storefront purchases are only available on MAINNET.");
      return;
    }

    if (!publicMode) {
      alert("Switch to Public view to submit a storefront request.");
      return;
    }

    if (!solAmount || !recipient) {
      alert("Please enter a SOL amount and recipient wallet address.");
      return;
    }

    const parsedSol = parseFloat(solAmount);
    if (!Number.isFinite(parsedSol) || parsedSol <= 0) {
      alert("Please enter a valid positive SOL amount.");
      return;
    }

    setSubmitting(true);
    try {
      // Fire the backend request so you get a reliable log
      const body = {
        fromPubkey: recipient,               // treat recipient as the customer wallet
        amountSol: parsedSol,
        estimatedAksol:
          parsedSol > 0 ? parsedSol * EST_AKSOL_PER_SOL_HINT : null,
        note: note.trim() || null,
        cluster: "mainnet-beta",
      };

      const resp = await fetch(
        `${BACKEND_BASE_URL}/aksol/storefront-purchase`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      const data = await resp.json().catch(() => ({} as any));

      if (!resp.ok || !data.ok) {
        const msg =
          (data as any)?.error ||
          `Storefront request failed (status ${resp.status}). Please try again or contact support.`;
        console.error("Storefront purchase error:", data);
        logAction("Storefront request failed (mainnet)");
        alert(msg);
        return;
      }

      // Frontend activity log
      logAction(
        `Storefront request: ${solAmount} SOL → AKSOL for ${recipient} (manual fulfillment)`
      );

      // User-facing confirmation
      alert(
        "Storefront request recorded.\n\nYour order will be filled manually by the AKSOL team at fair market value."
      );

      // Reset form
      setSolAmount("");
      setRecipient("");
      setNote("");
    } catch (err) {
      console.error("Error submitting storefront purchase:", err);
      logAction("Storefront request error (mainnet)");
      alert("Unexpected error submitting storefront request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // 🔢 Estimate AKSOL amount based on SOL input and our hint rate
  const estimatedAksol = useMemo(() => {
    const val = parseFloat(solAmount);
    if (!Number.isFinite(val) || val <= 0) return "";
    const est = val * EST_AKSOL_PER_SOL_HINT;
    return est.toLocaleString("en-US", {
      maximumFractionDigits: 4,
    });
  }, [solAmount]);

  const envLabel = isMainnet
    ? "MAINNET – live SOL & AKSOL balances."
    : "DEVNET – storefront is disabled here (for now).";

  const envClassName = isMainnet
    ? "storefront-env-label storefront-env-mainnet"
    : "storefront-env-label storefront-env-devnet";

  return (
    <section className="card card-storefront">
      <header className="card-header storefront-header">
        <div className="card-header-main">
          <h2>Buy AKSOL (Storefront)</h2>
          <p className="card-subtitle">
            Simple direct AKSOL purchases using SOL — fulfilled manually by the{" "}
            <span className="accent">AKSOL team</span>.
          </p>
        </div>
        <button
          type="button"
          className="storefront-toggle-btn"
          onClick={() => setOpen((prev) => !prev)}
        >
          {open ? "Close storefront ▲" : "Open storefront ▼"}
        </button>
      </header>

      <p className={envClassName}>{envLabel}</p>

      {open ? (
        <form className="storefront-form" onSubmit={handleSubmit}>
          {/* Amount row */}
          <div className="storefront-row storefront-row-inline">
            <div className="storefront-field storefront-field-narrow">
              <label htmlFor="storefront-sol-amount">
                SOL amount you want to spend
              </label>
              <div className="storefront-input-with-unit">
                <input
                  id="storefront-sol-amount"
                  type="number"
                  min="0"
                  step="0.0001"
                  inputMode="decimal"
                  placeholder="0.10"
                  value={solAmount}
                  onChange={(e) => setSolAmount(e.target.value)}
                  className="storefront-input storefront-input-amount"
                />
                <span className="storefront-unit">SOL</span>
              </div>
              <small className="storefront-hint">
                We recommend starting with a small test amount (e.g. 0.05–0.1
                SOL).
              </small>
            </div>

            <div className="storefront-field storefront-field-estimate">
              <label>Estimated AKSOL you&apos;ll receive</label>
              <div className="storefront-estimate-pill">
                {estimatedAksol ? (
                  <>
                    <span className="storefront-estimate-value">
                      {estimatedAksol}
                    </span>
                    <span className="storefront-estimate-unit">AKSOL</span>
                  </>
                ) : (
                  <span className="storefront-estimate-placeholder">
                    Enter a SOL amount to see an estimate.
                  </span>
                )}
              </div>
              <small className="storefront-hint">
                Estimate only. Final AKSOL amount will match the live Raydium
                price at the time your order is filled.
              </small>
            </div>
          </div>

          {/* Recipient row */}
          <div className="storefront-row">
            <div className="storefront-field">
              <label htmlFor="storefront-recipient">
                AKSOL recipient (your wallet address)
              </label>
              <input
                id="storefront-recipient"
                type="text"
                placeholder="Paste your Phantom wallet address here"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value.trim())}
                className="storefront-input"
              />
              <small className="storefront-hint">
                This is where your AKSOL will be sent after the order is
                manually fulfilled.
              </small>
            </div>
          </div>

          {/* Optional note row */}
          <div className="storefront-row">
            <div className="storefront-field">
              <label htmlFor="storefront-note">
                Optional note for the AKSOL team
              </label>
              <textarea
                id="storefront-note"
                rows={2}
                placeholder='Example: "Testing AKSOL purchase" or "Gift for my nephew"'
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="storefront-textarea"
              />
            </div>
          </div>

          {/* Summary + submit */}
          <div className="storefront-footer">
            <div className="storefront-summary">
              <p>
                <strong>How this works:</strong> Your request is logged in the
                AKSOL activity feed and on the backend. The team fulfills it
                manually from the official liquidity wallet at fair market
                value, then sends AKSOL directly to your wallet.
              </p>
              <p className="storefront-disclaimer">
                You&apos;ll be able to{" "}
                <span className="accent">
                  verify everything on Solana Explorer
                </span>{" "}
                once the transfer is complete.
              </p>
            </div>
            <button
              type="submit"
              className="btn-primary storefront-submit-btn"
              disabled={submitting || !isMainnet || publicMode === false}
            >
              {submitting
                ? "Submitting request..."
                : isMainnet
                ? "Submit AKSOL purchase request"
                : "Storefront disabled on devnet"}
            </button>
          </div>
        </form>
      ) : (
        <div className="storefront-collapsed-note">
          <p>
            Connect your wallet and open this panel when you&apos;re ready to
            request a manual AKSOL purchase using SOL.
          </p>
          <p className="storefront-disclaimer">
            In this v1, purchases are fulfilled manually by the AKSOL team, not
            by an automated swap contract.
          </p>
        </div>
      )}
    </section>
  );
};

export default StorefrontPurchaseCard;
