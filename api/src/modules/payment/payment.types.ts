import type { BlockReason } from "../../types";

export interface PaymentRequest {
  agentAddress: string;
  serviceUrl: string;
  maxAmount: string;
  intent: string;
}

export interface PaymentApproved {
  status: "approved";
  txHash: string;
  amount: string;
  currency: "USDC" | string;
  merchant: string;
  intent: string;
  swapUsed: boolean;
  remainingDailyBudget: string;
  settledAt: string;
  asset?: string;
  network?: string;
  chainId?: string;
}

export interface PaymentPending {
  status: "pending";
  approvalId: string;
  amount: string;
  merchant: string;
  intent: string;
  message: string;
}

export interface PaymentBlocked {
  status: "blocked";
  reason: BlockReason;
  amount: string;
  merchant: string;
  onchainEvent: "PaymentBlocked";
  txHash?: string;
  message?: string;
}

export type PaymentResult = PaymentApproved | PaymentPending | PaymentBlocked;
