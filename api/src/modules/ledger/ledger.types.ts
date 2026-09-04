import type { PaymentStatus } from "../../types";

export interface LedgerEntry {
  id: string;
  agentAddress: string;
  merchant: string;
  amount: string;
  currency: string;
  intent: string;
  status: PaymentStatus;
  reason?: string | null;
  txHash?: string | null;
  swapUsed: boolean;
  /** @deprecated Legacy field — always null for Base payments */
  okbSpent?: string | null;
  createdAt: string;
  network?: string | null;
  asset?: string | null;
  chainId?: string | null;
}

export interface LedgerQuery {
  agentAddress?: string;
  limit?: number;
  offset?: number;
  status?: string;
}

export interface LedgerResult {
  transactions: LedgerEntry[];
  total: number;
  limit: number;
  offset: number;
}
