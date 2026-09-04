"use client";

import {
  Clock,
  Copy,
  ExternalLink,
  ScrollText,
  Shield,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatUnits } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { useAgent } from "@/components/dashboard/agent-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type AgentPolicy,
  type BalanceResult,
  getBalance,
  getLedger,
  getLimitsForOwner,
  type LedgerEntry,
} from "@/lib/api";
import { SPEND_POLICY_ABI, SPEND_POLICY_ADDRESS } from "@/lib/contracts";

function statusBadgeClass(status: LedgerEntry["status"]): string {
  switch (status) {
    case "approved":
      return "border-emerald-600 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
    case "blocked":
    case "denied":
      return "border-red-600 bg-red-500/10 text-red-700 dark:text-red-400";
    default:
      return "border-amber-600 bg-amber-500/10 text-amber-700 dark:text-amber-400";
  }
}

const DEMO_AGENT_ADDRESS = "0x726cf0c4fe559db9a32396161694c7b88c60c947";

const DEMO_BALANCE: BalanceResult = {
  agentAddress: DEMO_AGENT_ADDRESS,
  usdcBalance: "0.984637",
  ethBalance: "0.012",
  remainingDailyBudget: "9.99",
};

const DEMO_POLICY: AgentPolicy = {
  address: DEMO_AGENT_ADDRESS,
  perTxLimit: "0.25",
  dailyBudget: "10",
  allowlist: ["api.usezenithpay.xyz", "stableenrich.dev"],
  approvalThreshold: "0.05",
  autoSwapEnabled: true,
  swapSlippageTolerance: "0.5",
  policyContract: "0x0000000000000000000000000000000000000000",
};

const DEMO_TRANSACTIONS: LedgerEntry[] = [
  { id: "d1", agentAddress: DEMO_AGENT_ADDRESS, merchant: "api.usezenithpay.xyz", amount: "0.01", currency: "USDC", intent: "DeFi research on Base", status: "approved", reason: null, txHash: "0x3f2a1b8c...", swapUsed: false, okbSpent: null, createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
  { id: "d2", agentAddress: DEMO_AGENT_ADDRESS, merchant: "api.usezenithpay.xyz", amount: "0.01", currency: "USDC", intent: "Token price lookup", status: "approved", reason: null, txHash: "0x7a4c2d1e...", swapUsed: false, okbSpent: null, createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString() },
  { id: "d3", agentAddress: DEMO_AGENT_ADDRESS, merchant: "api.usezenithpay.xyz", amount: "0.01", currency: "USDC", intent: "On-chain data fetch", status: "approved", reason: null, txHash: "0x9b3e5f2a...", swapUsed: false, okbSpent: null, createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString() },
  { id: "d4", agentAddress: DEMO_AGENT_ADDRESS, merchant: "api.usezenithpay.xyz", amount: "0.01", currency: "USDC", intent: "Exceeds per-tx limit", status: "blocked", reason: "per_tx_limit", txHash: null, swapUsed: false, okbSpent: null, createdAt: new Date(Date.now() - 1000 * 60 * 40).toISOString() },
  { id: "d5", agentAddress: DEMO_AGENT_ADDRESS, merchant: "stableenrich.dev", amount: "0.05", currency: "USDC", intent: "Company data enrichment", status: "blocked", reason: "above_approval_threshold", txHash: null, swapUsed: false, okbSpent: null, createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString() },
  { id: "d6", agentAddress: DEMO_AGENT_ADDRESS, merchant: "api.usezenithpay.xyz", amount: "0.01", currency: "USDC", intent: "Market index query", status: "approved", reason: null, txHash: "0x1c8d4a7b...", swapUsed: false, okbSpent: null, createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString() },
  { id: "d7", agentAddress: DEMO_AGENT_ADDRESS, merchant: "api.usezenithpay.xyz", amount: "0.01", currency: "USDC", intent: "Swap rate check", status: "approved", reason: null, txHash: "0x5e2f9c3d...", swapUsed: false, okbSpent: null, createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
  { id: "d8", agentAddress: DEMO_AGENT_ADDRESS, merchant: "stableenrich.dev", amount: "0.05", currency: "USDC", intent: "LinkedIn enrichment", status: "approved", reason: null, txHash: "0x8d1a3f6c...", swapUsed: true, okbSpent: "0.003", createdAt: new Date(Date.now() - 1000 * 60 * 150).toISOString() },
  { id: "d9", agentAddress: DEMO_AGENT_ADDRESS, merchant: "api.usezenithpay.xyz", amount: "0.01", currency: "USDC", intent: "Balance check", status: "approved", reason: null, txHash: "0x2b7e4d9a...", swapUsed: false, okbSpent: null, createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString() },
  { id: "d10", agentAddress: DEMO_AGENT_ADDRESS, merchant: "api.usezenithpay.xyz", amount: "0.25", currency: "USDC", intent: "Bulk data request", status: "blocked", reason: "per_tx_limit", txHash: null, swapUsed: false, okbSpent: null, createdAt: new Date(Date.now() - 1000 * 60 * 240).toISOString() },
];

export default function DashboardPage() {
  const { address } = useAccount();
  const { agentAddress: AGENT_ADDRESS, hasAgent, isDemo } = useAgent();
  const [balance, setBalance] = useState<BalanceResult | null>(null);
  const [policies, setPolicies] = useState<AgentPolicy[]>([]);
  const [transactions, setTransactions] = useState<LedgerEntry[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    if (isDemo) {
      setBalance(DEMO_BALANCE);
      setPolicies([DEMO_POLICY]);
      setTransactions(DEMO_TRANSACTIONS);
      setInitialLoading(false);
      return;
    }

    let cancelled = false;
    async function load() {
      if (!hasAgent) {
        if (!cancelled) {
          setBalance(null);
          setPolicies([]);
          setTransactions([]);
          setInitialLoading(false);
        }
        return;
      }
      try {
        const [balRes, limRes, ledRes] = await Promise.allSettled([
          getBalance(AGENT_ADDRESS),
          address
            ? getLimitsForOwner(address)
            : Promise.resolve({ agents: [] }),
          getLedger(AGENT_ADDRESS),
        ]);
        if (cancelled) return;
        if (balRes.status === "fulfilled") setBalance(balRes.value);
        if (limRes.status === "fulfilled") setPolicies(limRes.value.agents);
        if (ledRes.status === "fulfilled")
          setTransactions(ledRes.value.transactions);
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [address, AGENT_ADDRESS, hasAgent, isDemo]);

  const [copied, setCopied] = useState(false);

  function copyAddress() {
    navigator.clipboard.writeText(AGENT_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Read policy directly from contract as fallback when DB lookup returns empty
  const { data: onchainPolicy } = useReadContract({
    address: SPEND_POLICY_ADDRESS,
    abi: SPEND_POLICY_ABI,
    functionName: "getPolicy",
    args: [AGENT_ADDRESS as `0x${string}`],
    query: { enabled: Boolean(AGENT_ADDRESS) },
  });

  const policy = policies[0];
  const dailyBudget =
    policy?.dailyBudget ??
    (onchainPolicy?.dailyLimit
      ? formatUnits(onchainPolicy.dailyLimit, 6)
      : null);
  const recentTx = transactions.slice(0, 5);
  const pendingCount = transactions.filter(
    (t) => t.status === "pending",
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Agent wallets, spend policies, and recent agent activity
        </p>
      </div>

      {!hasAgent && (
        <div className="border border-dashed p-6 text-sm text-muted-foreground">
          No agent linked to this wallet yet. Create a wallet in onboarding to see balances, limits, and activity.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-none border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              USDC Balance
            </CardTitle>
            <Shield className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {initialLoading ? (
              <Skeleton className="h-7 w-24 rounded-none" />
            ) : (
              <p className="text-2xl font-bold font-mono">
                ${balance?.usdcBalance ?? "0.00"}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-none border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Daily Budget
            </CardTitle>
            <Shield className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {initialLoading ? (
              <Skeleton className="h-7 w-24 rounded-none" />
            ) : dailyBudget ? (
              <p className="text-2xl font-bold font-mono">${dailyBudget}</p>
            ) : (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Policy not set
                </p>
                <Link
                  href="/dashboard/limits"
                  className="text-xs underline underline-offset-4 text-muted-foreground hover:text-foreground"
                >
                  Configure limits →
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-none border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Pending Approvals
            </CardTitle>
            <ShieldCheck className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {initialLoading ? (
              <Skeleton className="h-7 w-16 rounded-none" />
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold font-mono">{pendingCount}</p>
                {pendingCount > 0 && (
                  <Link
                    href="/dashboard/approvals"
                    className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
                  >
                    review
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-none border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Total Transactions
            </CardTitle>
            <ScrollText className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {initialLoading ? (
              <Skeleton className="h-7 w-16 rounded-none" />
            ) : (
              <p className="text-2xl font-bold font-mono">
                {transactions.length}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Fund Agent — spans 2 cols */}
        <Card className="rounded-none border lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium uppercase tracking-wider">
              Agent Wallet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Balances */}
            <div className="space-y-0">
              <div className="flex items-center justify-between border-b border-dashed py-2.5">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                  USDC
                </span>
                {initialLoading ? (
                  <Skeleton className="h-4 w-20 rounded-none" />
                ) : (
                  <span className="text-sm font-bold font-mono">
                    ${balance?.usdcBalance ?? "0.00"}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between border-b border-dashed py-2.5">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                  ETH
                </span>
                {initialLoading ? (
                  <Skeleton className="h-4 w-16 rounded-none" />
                ) : (
                  <span className="text-sm font-mono">
                    {balance?.ethBalance ?? "0.00"} ETH
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                  Network
                </span>
                <span className="text-xs font-mono">Base (8453)</span>
              </div>
            </div>

            {/* Address + Fund CTA */}
            <div className="border border-dashed p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Agent address
                </span>
                <a
                  href={`https://basescan.org/address/${AGENT_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="size-3" />
                </a>
              </div>
              <code className="text-xs font-mono break-all block text-muted-foreground">
                {AGENT_ADDRESS}
              </code>
            </div>

            <button
              type="button"
              onClick={copyAddress}
              className="w-full flex items-center justify-center gap-2 border border-foreground bg-foreground text-background px-4 py-2.5 text-xs font-medium uppercase tracking-wider hover:opacity-90 transition-opacity"
            >
              {copied ? (
                "Address copied!"
              ) : (
                <>
                  <Copy className="size-3.5" />
                  Copy Address to Fund
                </>
              )}
            </button>

            <p className="text-[10px] text-muted-foreground text-center">
              Send USDC or ETH to the address above on Base
            </p>
          </CardContent>
        </Card>

        {/* Recent Activity — spans 3 cols */}
        <Card className="rounded-none border lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium uppercase tracking-wider">
              Recent Activity
            </CardTitle>
            <Link
              href="/dashboard/ledger"
              className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {initialLoading ? (
              <div className="space-y-2">
                {["a", "b", "c"].map((id) => (
                  <Skeleton
                    key={`overview-tx-skel-${id}`}
                    className="h-8 w-full rounded-none"
                  />
                ))}
              </div>
            ) : recentTx.length === 0 ? (
              <div className="border border-dashed p-8 text-center space-y-2">
                <Clock className="mx-auto size-5 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">
                  No transactions yet
                </p>
                <Link
                  href="/dashboard/pay"
                  className="mt-1 inline-block text-xs underline underline-offset-4 text-muted-foreground hover:text-foreground"
                >
                  Execute your first payment →
                </Link>
              </div>
            ) : (
              <div className="space-y-1">
                {recentTx.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between border p-2 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center border px-1.5 py-0.5 font-mono text-[10px] ${statusBadgeClass(tx.status)}`}
                      >
                        {tx.status}
                      </span>
                      <span className="truncate max-w-[160px] font-mono">
                        {tx.merchant}
                      </span>
                    </div>
                    <span className="font-mono">${tx.amount}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
