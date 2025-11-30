import { useState } from "react";
import "./App.css";
import StatusCard from "./components/StatusCard";
import TaxedSendCard from "./components/TaxedSendCard";
import PurchaseCard from "./components/PurchaseCard";
import WalletOverview from "./components/WalletOverview";
import ActivityCard from "./components/ActivityCard";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { DEFAULT_PUBLIC_MODE } from "./config";

export type ActivityItem = {
  id: string;
  label: string;
  timestamp: string;
  signature?: string; // for explorer link in ActivityCard
};

function App() {
  const [publicMode, setPublicMode] = useState<boolean>(DEFAULT_PUBLIC_MODE);
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  // toggle between Public view / Dev view
  const toggleMode = () => setPublicMode((prev) => !prev);

  // log actions for the ActivityCard
  const logAction = (label: string, signature?: string) => {
    const item: ActivityItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      label,
      timestamp: new Date().toISOString(),
      signature,
    };
    // Keep only the last 3 actions
    setActivities((prev) => [item, ...prev].slice(0, 3));
  };

  const viewLabel = publicMode ? "Public view" : "Dev view";
  const viewClassName = `app-view-toggle ${
    publicMode ? "" : "app-view-toggle-active"
  }`;

  return (
    <div className="app-root">
      {/* TOP HEADER */}
<header className="app-nav">
  <div className="app-nav-left">
    <img
      src="/acf-logo.png"
      alt="Alaska Crypto Financial"
      className="app-logo"
    />
    <div className="app-nav-text">
      <h1>AKSOL Control Panel v3.0</h1>
      <p>Live devnet demo for the AKSOL ecosystem.</p>
    </div>
  </div>

  <div className="app-nav-right">
    {/* Pub / Dev toggle, Solana devnet chip, wallet button */}
          <button
            type="button"
            className={viewClassName}
            onClick={toggleMode}
          >
            {viewLabel}
          </button>

          {/* Solana devnet status pill */}
          <button type="button" className="app-status-chip">
            Solana · devnet
          </button>

          {/* WalletConnect */}
          <div className="app-wallet">
            <WalletMultiButton />
          </div>
        </div>
      </header>

      {/* SUBHEADER STRIP */}
      <section className="app-subheader">
        <div>
          <h2>AKSOL devnet demo</h2>
          <p>
            Connect your wallet, see your balances, send AKSOL with tax, or buy
            via the official 0% route. All flows run on Solana devnet for
            testing only.
          </p>
        </div>
        <div className="subheader-tagline">For Alaskans, by Alaskans.</div>
      </section>

      {/* MAIN CARD GRID: Wallet + Activity on top, 3 cards on bottom */}
      <main className="card-grid">
        <WalletOverview />
        <ActivityCard actions={activities} />
        <StatusCard publicMode={publicMode} logAction={logAction} />
        <TaxedSendCard publicMode={publicMode} logAction={logAction} />
        <PurchaseCard publicMode={publicMode} logAction={logAction} />
      </main>

      {/* FOOTER */}
      <footer className="app-footer">
        <span>AKSOL is currently running on Solana devnet.</span>
        <span className="dot">•</span>
        <span className="accent">
          This is a demo environment, not mainnet.
        </span>
      </footer>
    </div>
  );
}

export default App;
