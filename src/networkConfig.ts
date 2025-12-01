// src/networkConfig.ts

export type NetworkName = "devnet" | "mainnet-beta";

export interface AksolNetworkConfig {
  name: NetworkName;
  label: string;
  programId: string;
  mint: string;
  configPda?: string;
  rpcUrl: string;
}

const {
  VITE_AKSOL_DEVNET_PROGRAM_ID,
  VITE_AKSOL_DEVNET_MINT,
  VITE_AKSOL_MAINNET_PROGRAM_ID,
  VITE_AKSOL_MAINNET_MINT,
  VITE_AKSOL_MAINNET_CONFIG,
  VITE_SOLANA_DEVNET_RPC,
  VITE_SOLANA_MAINNET_RPC,
} = import.meta.env;

export const DEVNET_CONFIG: AksolNetworkConfig = {
  name: "devnet",
  label: "Devnet (test)",
  programId: VITE_AKSOL_DEVNET_PROGRAM_ID,
  mint: VITE_AKSOL_DEVNET_MINT,
  rpcUrl: VITE_SOLANA_DEVNET_RPC ?? "https://api.devnet.solana.com",
};

export const MAINNET_CONFIG: AksolNetworkConfig = {
  name: "mainnet-beta",
  label: "Mainnet (real money)",
  programId: VITE_AKSOL_MAINNET_PROGRAM_ID,
  mint: VITE_AKSOL_MAINNET_MINT,
  configPda: VITE_AKSOL_MAINNET_CONFIG,
  rpcUrl: VITE_SOLANA_MAINNET_RPC ?? "https://api.mainnet-beta.solana.com",
};

export const NETWORKS: Record<NetworkName, AksolNetworkConfig> = {
  devnet: DEVNET_CONFIG,
  "mainnet-beta": MAINNET_CONFIG,
};
