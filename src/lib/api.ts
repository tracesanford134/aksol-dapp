export type Cluster = "devnet" | "mainnet-beta";

const BACKEND_BASE =
  import.meta.env.VITE_BACKEND_BASE_URL ||
  (import.meta.env.DEV ? "http://localhost:8080" : "");

function buildUrl(path: string) {
  if (!BACKEND_BASE) {
    throw new Error("BACKEND_BASE is not configured for this environment");
  }
  return `${BACKEND_BASE}${path}`;
}

export async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(buildUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Backend HTTP ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}
