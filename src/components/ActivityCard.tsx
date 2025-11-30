// src/components/ActivityCard.tsx
import type { ActivityItem } from "../App";
import { EXPLORER_BASE_URL, EXPLORER_CLUSTER_SUFFIX } from "../config";

interface ActivityCardProps {
  actions: ActivityItem[];
}

function formatTime(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ActivityCard({ actions }: ActivityCardProps) {
  return (
    <section className="card">
      <h2>Recent activity</h2>
      <small>Last few AKSOL actions from this session.</small>

      {actions.length === 0 ? (
        <p
          style={{
            marginTop: "0.5rem",
            fontSize: "0.85rem",
            color: "#9ca3af",
          }}
        >
          No activity yet. Check status, send AKSOL, or buy with 0% tax to see
          history here.
        </p>
      ) : (
        <ul
          style={{
            marginTop: "0.6rem",
            listStyle: "none",
            padding: 0,
          }}
        >
          {actions.map((a) => {
            const explorerUrl = a.signature
              ? `${EXPLORER_BASE_URL}/tx/${a.signature}${EXPLORER_CLUSTER_SUFFIX}`
              : null;

            return (
              <li
                key={a.id}
                style={{
                  fontSize: "0.85rem",
                  padding: "0.35rem 0",
                  borderBottom: "1px solid rgba(31, 41, 55, 0.9)",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "0.75rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.15rem",
                  }}
                >
                  <span>{a.label}</span>
                  {explorerUrl && (
                    <a
                      href={explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        fontSize: "0.75rem",
                        color: "#38bdf8",
                        textDecoration: "underline",
                      }}
                    >
                      View on Explorer
                    </a>
                  )}
                </div>
                <span
                  style={{
                    color: "#6b7280",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {formatTime(a.timestamp)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default ActivityCard;
