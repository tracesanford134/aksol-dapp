// src/lib/solanaTx.ts
import { Transaction, VersionedTransaction } from "@solana/web3.js";

export type AnyTransaction = Transaction | VersionedTransaction;

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function decodeTransaction(base64: string): AnyTransaction {
  const bytes = base64ToUint8Array(base64);

  // Try VersionedTransaction first
  try {
    return VersionedTransaction.deserialize(bytes);
  } catch {
    // Fallback to legacy Transaction
    return Transaction.from(bytes);
  }
}
