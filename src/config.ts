// src/config.ts

// Which Solana cluster the dApp targets.
export const DEFAULT_CLUSTER = "devnet" as const;

// Backend base URL.
// In dev: falls back to localhost:8080
// In prod: override with VITE_AKSOL_BACKEND_URL.
export const BACKEND_BASE_URL =
  import.meta.env.VITE_AKSOL_BACKEND_URL ?? "http://localhost:8080";

// Solana Explorer config (devnet)
export const EXPLORER_BASE_URL = "https://explorer.solana.com";
export const EXPLORER_CLUSTER_SUFFIX = "?cluster=devnet";

// Default view mode on first load.
// true  = public view
// false = dev console view
export const DEFAULT_PUBLIC_MODE = true as const;
