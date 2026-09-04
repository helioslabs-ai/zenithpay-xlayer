const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

export interface AgentPolicy {
  address: string;
  perTxLimit: string;
  dailyBudget: string;
  allowlist: string[];
  approvalThreshold: string | null;
  autoSwapEnabled: boolean;
  swapSlippageTolerance: string;
  policyContract: string;
}

export interface BalanceResult {
  agentAddress: string;
  usdcBalance: string;
  ethBalance: string;
  remainingDailyBudget: string | null;
}

export interface LedgerEntry {
  id: string;
  agentAddress: string;
  merchant: string;
  amount: string;
  currency: string;
  intent: string | null;
  status: "approved" | "blocked" | "pending" | "denied";
  reason: string | null;
  txHash: string | null;
  swapUsed: boolean;
  okbSpent: string | null;
  createdAt: string;
}

export interface PendingApproval {
  id: string;
  agentAddress: string;
  merchant: string;
  serviceUrl: string;
  amount: string;
  intent: string;
  status: "pending" | "approved" | "denied";
  requestedAt: string;
  resolvedAt: string | null;
}

export interface PaymentResult {
  status: "approved" | "blocked" | "pending";
  txHash?: string;
  amount?: string;
  merchant?: string;
  reason?: string;
  approvalId?: string;
  swapUsed?: boolean;
  okbSpent?: string | null;
  remainingDailyBudget?: string;
}

export interface GenesisResult {
  agentAddress: string;
  apiKey: string;
  label: string | null;
  createdAt: string;
  message: string;
}

export async function getBalance(
  agentAddress: string,
): Promise<BalanceResult | null> {
  const res = await apiFetch<{ agents: BalanceResult[] }>(
    `/wallet/balance?address=${agentAddress}`,
  );
  return res.agents[0] ?? null;
}

export function getLimits(agentAddress: string) {
  return apiFetch<{ agents: AgentPolicy[] }>(`/limits?address=${agentAddress}`);
}

export function getLimitsForOwner(ownerAddress: string) {
  return apiFetch<{ agents: AgentPolicy[] }>("/limits", {
    headers: { "X-Owner-Address": ownerAddress },
  });
}

export interface SetLimitsResult {
  status: string;
  policyContract: string;
  txHash: string | null;
  agentAddress: string;
  apiKey: string | null;
  perTxLimit: string;
  dailyBudget: string;
  allowlist: string[];
  autoSwapEnabled: boolean;
  swapSlippageTolerance: string;
}

export function setLimits(params: {
  agentAddress: string;
  perTxLimit: string;
  dailyBudget: string;
  allowlist?: string[];
  approvalThreshold?: string;
  autoSwapEnabled?: boolean;
  swapSlippageTolerance?: string;
  label?: string;
  humanSignature: string;
  timestamp: number;
}) {
  return apiFetch<SetLimitsResult>("/limits", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export function getLedger(agentAddress: string) {
  return apiFetch<{ transactions: LedgerEntry[] }>(
    `/ledger?agent=${agentAddress}`,
  );
}

export function getApprovals(agentAddress?: string) {
  const query = agentAddress ? `?agent=${agentAddress}` : "";
  return apiFetch<{ approvals: PendingApproval[] }>(`/approvals${query}`);
}

export function approvePayment(
  approvalId: string,
  body: { humanSignature: string; timestamp: number },
) {
  return apiFetch<PaymentResult>(`/approvals/${approvalId}/approve`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function denyPayment(
  approvalId: string,
  body: { humanSignature: string; timestamp: number },
) {
  return apiFetch<{ status: string }>(`/approvals/${approvalId}/deny`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function executePayment(params: {
  agentAddress: string;
  serviceUrl: string;
  maxAmount: string;
  intent: string;
}) {
  return apiFetch<PaymentResult>("/pay", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export function linkAgent(params: {
  agentAddress: string;
  ownerAddress: string;
}) {
  return apiFetch<{ agentAddress: string; ownerAddress: string }>(
    "/agents/link",
    {
      method: "POST",
      body: JSON.stringify(params),
    },
  );
}

export function createGenesisWallet(
  params: { email?: string; label?: string },
  ownerAddress?: string,
) {
  return apiFetch<GenesisResult>("/wallet/genesis", {
    method: "POST",
    body: JSON.stringify(params),
    headers: ownerAddress ? { "X-Owner-Address": ownerAddress } : undefined,
  });
}

export interface AgentInfo {
  address: string;
  label: string | null;
}

export function getAgentsByOwner(ownerAddress: string) {
  return apiFetch<{ agents: AgentInfo[] }>("/wallet/agents", {
    headers: { "X-Owner-Address": ownerAddress },
  });
}

export function getAgentByAddress(agentAddress: string) {
  return apiFetch<{ agents: AgentInfo[] }>(
    `/wallet/agents?address=${agentAddress}`,
  );
}
