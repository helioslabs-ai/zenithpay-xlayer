"use client";

import {
  Clock,
  ExternalLink,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAgent } from "@/components/dashboard/agent-context";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getLedger, type LedgerEntry } from "@/lib/api";

const EXPLORER_URL = "https://basescan.org";
const REFRESH_INTERVAL = 15_000;

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function StatusBadge({ status }: { status: LedgerEntry["status"] }) {
  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-1 border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
        <ShieldCheck className="size-3" />
        OK
      </span>
    );
  }
  if (status === "blocked" || status === "denied") {
    return (
      <span className="inline-flex items-center gap-1 border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 font-mono text-[10px] text-red-600 dark:text-red-400">
        <ShieldAlert className="size-3" />
        {status}
      </span>
    );
  }
  return (
    <span className="inline-flex border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-600 dark:text-amber-400">
      {status}
    </span>
  );
}

function StatCell({
  label,
  value,
  valueClass,
  loading,
}: {
  label: string;
  value: string;
  valueClass?: string;
  loading: boolean;
}) {
  return (
    <div className="bg-background px-4 py-3">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">
        {label}
      </span>
      {loading ? (
        <Skeleton className="h-8 w-16 rounded-none" />
      ) : (
        <span
          className={`text-2xl font-bold tabular-nums font-mono ${valueClass ?? ""}`}
        >
          {value}
        </span>
      )}
    </div>
  );
}

export default function LedgerPage() {
  const { agentAddress, hasAgent } = useAgent();
  const [transactions, setTransactions] = useState<LedgerEntry[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async (isInitial = false) => {
    if (!hasAgent) {
      setTransactions([]);
      if (isInitial) setInitialLoading(false);
      return;
    }
    try {
      const res = await getLedger(agentAddress);
      setTransactions(res.transactions);
      setLastUpdated(new Date());
    } finally {
      if (isInitial) setInitialLoading(false);
    }
  }, [agentAddress, hasAgent]);

  useEffect(() => {
    setInitialLoading(true);
    load(true);
    const interval = setInterval(() => load(false), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [load]);

  const executed = transactions.filter((t) => t.status === "approved");
  const blocked = transactions.filter(
    (t) => t.status === "blocked" || t.status === "denied",
  );
  const totalSpent = executed.reduce(
    (sum, t) => sum + parseFloat(t.amount || "0"),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ledger</h1>
          <p className="text-sm text-muted-foreground">
            Full audit - on-chain events, agent intents, and transactions
          </p>
        </div>
        {lastUpdated && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
            <RefreshCw className="size-3" />
            {formatTime(lastUpdated.toISOString())}
          </div>
        )}
      </div>

      {!hasAgent && (
        <div className="border border-dashed p-6 text-sm text-muted-foreground">
          No agent linked to this wallet yet. Your transaction history will appear after onboarding.
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border border border-border">
        <StatCell
          label="Total Transactions"
          value={String(transactions.length)}
          loading={initialLoading}
        />
        <StatCell
          label="Executed"
          value={String(executed.length)}
          valueClass={executed.length > 0 ? "text-emerald-500" : undefined}
          loading={initialLoading}
        />
        <StatCell
          label="Blocked"
          value={String(blocked.length)}
          valueClass={blocked.length > 0 ? "text-red-500" : undefined}
          loading={initialLoading}
        />
        <StatCell
          label="Total Spent"
          value={`$${totalSpent.toFixed(2)}`}
          loading={initialLoading}
        />
      </div>

      {/* Table */}
      {initialLoading ? (
        <div className="space-y-px">
          {["a", "b", "c", "d", "e", "f"].map((id) => (
            <Skeleton key={`ledger-skel-${id}`} className="h-12 w-full rounded-none" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="flex flex-col items-center py-24 text-center border border-dashed">
          <Clock
            className="size-8 text-muted-foreground/30 mb-3"
            strokeWidth={1}
          />
          <p className="text-sm text-muted-foreground">No transactions yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Transactions will appear here once your agent starts spending
          </p>
        </div>
      ) : (
        <div className="border border-dashed">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b">
                <TableHead className="text-[10px] uppercase tracking-widest text-muted-foreground h-8">
                  Time
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-widest text-muted-foreground h-8">
                  Date
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-widest text-muted-foreground h-8">
                  Merchant
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-widest text-muted-foreground h-8">
                  Amount
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-widest text-muted-foreground h-8">
                  Status
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-widest text-muted-foreground h-8">
                  Swap
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-widest text-muted-foreground h-8">
                  Intent / Reason
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-widest text-muted-foreground h-8 w-8">
                  TX
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id} className="font-mono text-xs border-b">
                  <TableCell className="text-muted-foreground whitespace-nowrap py-2.5">
                    {formatTime(tx.createdAt)}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap py-2.5">
                    {formatDate(tx.createdAt)}
                  </TableCell>
                  <TableCell className="py-2.5 max-w-[140px]">
                    <span className="truncate block">{tx.merchant}</span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap py-2.5">
                    ${tx.amount} {tx.currency}
                  </TableCell>
                  <TableCell className="py-2.5">
                    <StatusBadge status={tx.status} />
                  </TableCell>
                  <TableCell className="py-2.5">
                    {tx.swapUsed ? (
                      <span className="border border-dashed px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {tx.okbSpent} ETH
                      </span>
                    ) : (
                      <span className="text-muted-foreground/30">—</span>
                    )}
                  </TableCell>
                  <TableCell className="py-2.5 max-w-[220px]">
                    <span className="truncate block font-sans text-xs text-muted-foreground">
                      {tx.status === "blocked" || tx.status === "denied"
                        ? (tx.reason ?? "—")
                        : (tx.intent ?? "—")}
                    </span>
                  </TableCell>
                  <TableCell className="py-2.5">
                    {tx.txHash ? (
                      <a
                        href={`${EXPLORER_URL}/tx/${tx.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="size-3" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground/30">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
