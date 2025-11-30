// src/components/StatusCard.tsx
import { useState } from "react";

type StatusData = {
  ok?: boolean;
  cluster?: string;
  backendVersion?: string;
  solanaVersion?: string;
  error?: string;
  [key: string]: any;
};

type StatusCardProps = {
  publicMode: boolean;
  logAction: (label: string) => void;
};

function StatusCard({ publicMode, logAction }: StatusCardProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<StatusData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  const backendBaseUrl =
    import.meta.env.VITE_BACKEND_BASE_URL || "http://localhost:8080";

  const handleCheckStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`${backendBaseUrl}/aksol/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cluster: import.meta.env.VITE_SOLANA_CLUSTER || "devnet",
        }),
      });

      if (!resp.ok) {
        throw new Error(`Backend HTTP ${resp.status}`);
      }

      const json = (await resp.json()) as StatusData;
      setData(json);

      if (json.ok) {
        logAction("System status: backend online");
      } else {
        logAction("System status: backend reported an error");
      }
    } catch (err: any) {
      console.error("Status check error:", err);
      const msg =
        (err && typeof err.message === "string" && err.message) ||
        (typeof err === "string" && err) ||
        "Failed to reach backend.";
      setError(msg);
      logAction(`System status check failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const isOk = data?.ok === true;

  return (
    <section className="card">
      <h2>System status</h2>
      <small>
        Check that the AKSOL backend and Solana node are online before you demo.
        This runs against the current cluster
        {" ("}
        {import.meta.env.VITE_SOLANA_CLUSTER || "devnet"}
        {")"}.
      </small>

      <button onClick={handleCheckStatus} disabled={loading}>
        {loading ? "Checking status…" : "Run status check"}
      </button>
      <small>
        Calls <code>POST /aksol/status</code> on the AKSOL backend.
      </small>

      {isOk && (
        <div className="status-ok">
          Backend online · cluster:{" "}
          <strong>{data?.cluster ?? "unknown"}</strong> · Solana:{" "}
          <code>{data?.solanaVersion ?? "n/a"}</code>
        </div>
      )}

      {error && <div className="status-error">Error: {error}</div>}

      {!isOk && !error && data && (
        <div className="status-error">
          Backend responded but did not report <code>ok: true</code>.
        </div>
      )}

      {data && (
        <div style={{ marginTop: "0.5rem" }}>
          <button
            type="button"
            onClick={() => setShowDebug((prev) => !prev)}
            style={{
              background: "transparent",
              color: "#9ca3af",
              boxShadow: "none",
              paddingLeft: 0,
            }}
          >
            {showDebug ? "Hide debug details" : "Show raw status details"}
          </button>
          {showDebug && (
            <pre style={{ marginTop: "0.25rem", fontSize: "0.75rem" }}>
              {JSON.stringify(data, null, 2)}
            </pre>
          )}
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
          <strong>Note:</strong> This is a devnet demo environment. On mainnet,
          this card will also confirm the AKSOL program and mint configuration.
        </p>
      )}
    </section>
  );
}

export default StatusCard;
