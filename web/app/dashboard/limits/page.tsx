"use client";

import { ExternalLink, Loader2, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { formatUnits } from "viem";
import {
  useAccount,
  useReadContract,
  useSignMessage,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { useAgent } from "@/components/dashboard/agent-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { type AgentPolicy, getLimitsForOwner, setLimits } from "@/lib/api";
import {
  AgentStatus,
  SPEND_POLICY_ABI,
  SPEND_POLICY_ADDRESS,
  usdcToUnits,
  BASE_EXPLORER,
} from "@/lib/contracts";

const PRESETS = [
  { label: "Conservative", perTx: "5", daily: "25", threshold: "10" },
  { label: "Standard", perTx: "25", daily: "100", threshold: "50" },
  { label: "Power User", perTx: "100", daily: "500", threshold: "200" },
];

export default function LimitsPage() {
  const { address } = useAccount();
  const { agentAddress: AGENT_ADDRESS, hasAgent } = useAgent();
  const { signMessageAsync } = useSignMessage();
  const { writeContractAsync } = useWriteContract();

  const [policy, setPolicy] = useState<AgentPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);

  const [perTxLimit, setPerTxLimit] = useState("");
  const [dailyBudget, setDailyBudget] = useState("");
  const [approvalThreshold, setApprovalThreshold] = useState("");
  const [autoSwapEnabled, setAutoSwapEnabled] = useState(true);
  const [swapSlippageTolerance, setSwapSlippageTolerance] = useState("0.01");
  const [allowlistInput, setAllowlistInput] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  // Read onchain agent status and policy directly from contract
  const { data: onchainStatus } = useReadContract({
    address: SPEND_POLICY_ADDRESS,
    abi: SPEND_POLICY_ABI,
    functionName: "agentStatus",
    args: [AGENT_ADDRESS as `0x${string}`],
    query: { enabled: Boolean(AGENT_ADDRESS) },
  });

  const { data: onchainPolicy } = useReadContract({
    address: SPEND_POLICY_ADDRESS,
    abi: SPEND_POLICY_ABI,
    functionName: "getPolicy",
    args: [AGENT_ADDRESS as `0x${string}`],
    query: { enabled: Boolean(AGENT_ADDRESS) },
  });

  const { isLoading: waitingForTx, data: receipt } =
    useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    async function load() {
      if (!address || !hasAgent) {
        setPolicy(null);
        setLoading(false);
        return;
      }
      try {
        const res = await getLimitsForOwner(address);
        const existing = res.agents[0];
        if (existing) {
          setPolicy(existing);
          setPerTxLimit(existing.perTxLimit);
          setDailyBudget(existing.dailyBudget);
          setApprovalThreshold(existing.approvalThreshold ?? "");
          setAutoSwapEnabled(existing.autoSwapEnabled);
          setSwapSlippageTolerance(existing.swapSlippageTolerance);
          setAllowlistInput(existing.allowlist.join(", "));
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [address, hasAgent]);

  // Populate form inputs from onchain when DB lookup returned nothing
  // biome-ignore lint/correctness/useExhaustiveDependencies: only run when onchainPolicy loads
  useEffect(() => {
    if (
      policy ||
      !onchainPolicy ||
      onchainPolicy.status === AgentStatus.NotRegistered
    )
      return;
    const perTx = formatUnits(onchainPolicy.perTxLimit, 6);
    const daily = formatUnits(onchainPolicy.dailyLimit, 6);
    setPerTxLimit(perTx);
    setDailyBudget(daily);
  }, [onchainPolicy]);

  function applyPreset(preset: (typeof PRESETS)[number]) {
    setSelectedPreset(preset.label);
    setPerTxLimit(preset.perTx);
    setDailyBudget(preset.daily);
    setApprovalThreshold(preset.threshold);
  }

  async function handleSave() {
    if (!address) return;
    setSaving(true);
    setSaveError(null);
    setTxHash(undefined);

    try {
      const isRegistered =
        onchainStatus !== undefined &&
        onchainStatus !== AgentStatus.NotRegistered;

      // Step 1: Write onchain — hard limits (perTxLimit, dailyBudget)
      let hash: `0x${string}`;
      if (isRegistered) {
        hash = await writeContractAsync({
          address: SPEND_POLICY_ADDRESS,
          abi: SPEND_POLICY_ABI,
          functionName: "updatePolicy",
          args: [
            AGENT_ADDRESS as `0x${string}`,
            usdcToUnits(perTxLimit),
            usdcToUnits(dailyBudget),
          ],
        });
      } else {
        hash = await writeContractAsync({
          address: SPEND_POLICY_ADDRESS,
          abi: SPEND_POLICY_ABI,
          functionName: "registerAgent",
          args: [
            AGENT_ADDRESS as `0x${string}`,
            usdcToUnits(perTxLimit),
            usdcToUnits(dailyBudget),
            false,
          ],
        });
      }
      setTxHash(hash);

      // Step 2: Sign and POST /limits for off-chain fields
      const timestamp = Date.now();
      const message = JSON.stringify({
        agentAddress: AGENT_ADDRESS,
        perTxLimit,
        dailyBudget,
        timestamp,
      });
      const signature = await signMessageAsync({ message });

      const allowlist = allowlistInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await setLimits({
        agentAddress: AGENT_ADDRESS,
        perTxLimit,
        dailyBudget,
        allowlist: allowlist.length > 0 ? allowlist : undefined,
        approvalThreshold: approvalThreshold || undefined,
        autoSwapEnabled,
        swapSlippageTolerance,
        humanSignature: signature,
        timestamp,
      });

      if (res.apiKey) {
        localStorage.setItem(`zpk_${AGENT_ADDRESS}`, res.apiKey);
      }
      setPolicy(res as unknown as AgentPolicy);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to save policy",
      );
    } finally {
      setSaving(false);
    }
  }

  const isRegistered =
    onchainStatus !== undefined && onchainStatus !== AgentStatus.NotRegistered;

  // Prefer DB policy; fall back to onchain data for display
  const displayPerTx =
    policy?.perTxLimit ??
    (onchainPolicy?.perTxLimit
      ? formatUnits(onchainPolicy.perTxLimit, 6)
      : null);
  const displayDaily =
    policy?.dailyBudget ??
    (onchainPolicy?.dailyLimit
      ? formatUnits(onchainPolicy.dailyLimit, 6)
      : null);
  const displayApproval = policy?.approvalThreshold ?? null;
  const displayContract = policy?.policyContract ?? SPEND_POLICY_ADDRESS;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Spend Limits</h1>
        <p className="text-sm text-muted-foreground">
          Configure your agent spend policy, enforced on-chain
        </p>
      </div>

      {!hasAgent && (
        <div className="border border-dashed p-6 text-sm text-muted-foreground">
          No agent linked to this wallet yet. Complete onboarding to register an agent and set limits.
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-none" />
          <Skeleton className="h-48 w-full rounded-none" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <Card className="rounded-none border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider">
                  <Shield className="size-4" />
                  Policy Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      className="flex-1 border px-2 py-2 text-xs text-left transition-colors"
                      style={
                        selectedPreset === preset.label
                          ? {
                              borderColor: "var(--brand-accent)",
                              backgroundColor:
                                "oklch(from var(--brand-accent) l c h / 0.06)",
                            }
                          : {}
                      }
                      onClick={() => applyPreset(preset)}
                    >
                      <p className="font-medium">{preset.label}</p>
                      <p className="text-muted-foreground font-mono text-[10px] mt-0.5">
                        ${preset.perTx} / ${preset.daily}
                      </p>
                    </button>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="perTxLimit"
                    className="text-xs uppercase tracking-wider"
                  >
                    Per-Transaction Limit (USDC)
                  </Label>
                  <Input
                    id="perTxLimit"
                    className="rounded-none font-mono text-xs"
                    placeholder="25.00"
                    value={perTxLimit}
                    onChange={(e) => setPerTxLimit(e.target.value)}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    On-chain hard limit — cannot be overridden
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="dailyBudget"
                    className="text-xs uppercase tracking-wider"
                  >
                    Daily Budget (USDC)
                  </Label>
                  <Input
                    id="dailyBudget"
                    className="rounded-none font-mono text-xs"
                    placeholder="100.00"
                    value={dailyBudget}
                    onChange={(e) => setDailyBudget(e.target.value)}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    On-chain daily cap, resets at midnight UTC
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="approvalThreshold"
                    className="text-xs uppercase tracking-wider"
                  >
                    Approval Threshold (USDC)
                  </Label>
                  <Input
                    id="approvalThreshold"
                    className="rounded-none font-mono text-xs"
                    placeholder="50.00"
                    value={approvalThreshold}
                    onChange={(e) => setApprovalThreshold(e.target.value)}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Off-chain gate — payments above this require your approval
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="allowlist"
                    className="text-xs uppercase tracking-wider"
                  >
                    Merchant Allowlist
                  </Label>
                  <Input
                    id="allowlist"
                    className="rounded-none font-mono text-xs"
                    placeholder="https://api.example.com, https://service.io"
                    value={allowlistInput}
                    onChange={(e) => setAllowlistInput(e.target.value)}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Comma-separated URLs. Empty = all merchants allowed.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-none border">
              <CardHeader>
                <CardTitle className="text-sm font-medium uppercase tracking-wider">
                  Auto-Swap
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">ETH → USDC Auto-Swap</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Swap ETH when USDC balance is insufficient
                    </p>
                  </div>
                  <Switch
                    checked={autoSwapEnabled}
                    onCheckedChange={setAutoSwapEnabled}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="slippage"
                    className="text-xs uppercase tracking-wider"
                  >
                    Slippage Tolerance
                  </Label>
                  <Input
                    id="slippage"
                    className="rounded-none font-mono text-xs"
                    placeholder="0.01"
                    value={swapSlippageTolerance}
                    onChange={(e) => setSwapSlippageTolerance(e.target.value)}
                    disabled={!autoSwapEnabled}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    e.g. 0.01 = 1% max slippage
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="rounded-none border">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-sm font-medium uppercase tracking-wider">
                  Current Policy
                  {onchainStatus !== undefined && (
                    <Badge
                      variant="outline"
                      className="rounded-none text-[10px] font-mono normal-case"
                    >
                      {isRegistered ? "Registered onchain" : "Not registered"}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {displayPerTx ? (
                  <div className="space-y-0">
                    {[
                      { label: "Per-Tx Limit", value: `$${displayPerTx}` },
                      { label: "Daily Budget", value: `$${displayDaily}` },
                      {
                        label: "Approval Gate",
                        value: displayApproval ? `$${displayApproval}` : "None",
                      },
                    ].map(({ label, value }) => (
                      <div
                        key={label}
                        className="flex justify-between border-b border-dashed py-2 text-xs"
                      >
                        <span className="text-muted-foreground uppercase tracking-wider">
                          {label}
                        </span>
                        <span className="font-mono">{value}</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-b border-dashed py-2 text-xs">
                      <span className="text-muted-foreground uppercase tracking-wider">
                        Auto-Swap
                      </span>
                      <Badge
                        variant="outline"
                        className={`rounded-none text-[10px] font-mono ${
                          policy?.autoSwapEnabled
                            ? "border-emerald-600 text-emerald-700 dark:text-emerald-400"
                            : ""
                        }`}
                      >
                        {policy?.autoSwapEnabled ? "Enabled" : "—"}
                      </Badge>
                    </div>
                    <div className="flex justify-between py-2 text-xs">
                      <span className="text-muted-foreground uppercase tracking-wider">
                        Contract
                      </span>
                      <a
                        href={`${BASE_EXPLORER}/address/${displayContract}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 font-mono hover:text-foreground text-muted-foreground underline underline-offset-4"
                      >
                        {displayContract.slice(0, 8)}...
                        <ExternalLink className="size-2.5" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="border border-dashed p-6 text-center">
                    <p className="text-xs text-muted-foreground">
                      No policy set — configure and save to activate
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {txHash && (
              <a
                href={`${BASE_EXPLORER}/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 border border-dashed p-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="size-3 shrink-0" />
                <span className="font-mono">
                  {waitingForTx
                    ? "Confirming tx..."
                    : receipt
                      ? "Tx confirmed"
                      : "Tx submitted"}
                  {" · "}
                  {txHash.slice(0, 10)}...{txHash.slice(-8)}
                </span>
              </a>
            )}

            {saveError && (
              <div className="border border-red-600 bg-red-500/10 p-3">
                <p className="text-xs font-mono text-red-700 dark:text-red-400">
                  {saveError}
                </p>
              </div>
            )}

            {!address && (
              <div className="border border-dashed p-3">
                <p className="text-xs text-muted-foreground text-center">
                  Connect your wallet to sign and save the policy
                </p>
              </div>
            )}

            <Button
              className="w-full rounded-none"
              onClick={handleSave}
              disabled={saving || !perTxLimit || !dailyBudget || !address || !hasAgent}
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {waitingForTx ? "Waiting for tx..." : "Signing..."}
                </>
              ) : isRegistered ? (
                "Update Policy Onchain"
              ) : (
                "Register Policy Onchain"
              )}
            </Button>
            <p className="text-[10px] text-muted-foreground text-center">
              {isRegistered
                ? "Calls SpendPolicy.updatePolicy() on Base"
                : "Calls SpendPolicy.registerAgent() on Base"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
