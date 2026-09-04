"use client";

import {
  AlertTriangle,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
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
  BASE_EXPLORER,
} from "@/lib/contracts";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { address } = useAccount();
  const { agentAddress: AGENT_ADDRESS, agentDisplayName, hasAgent } = useAgent();
  const { signMessageAsync } = useSignMessage();
  const { writeContractAsync } = useWriteContract();

  const [policy, setPolicy] = useState<AgentPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [autoSwapEnabled, setAutoSwapEnabled] = useState(true);
  const [swapSlippageTolerance, setSwapSlippageTolerance] = useState("0.01");

  const [copied, setCopied] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);

  // Danger zone state
  const [dangerTxHash, setDangerTxHash] = useState<`0x${string}` | undefined>(
    undefined,
  );
  const [dangerAction, setDangerAction] = useState<string | null>(null);
  const [dangerError, setDangerError] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  // Read onchain agent status and policy
  const { data: onchainStatus, refetch: refetchStatus } = useReadContract({
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

  const { isLoading: waitingForDangerTx, isSuccess: dangerTxConfirmed } =
    useWaitForTransactionReceipt({ hash: dangerTxHash });

  // Refetch status after danger zone tx confirms
  useEffect(() => {
    if (dangerTxConfirmed) {
      refetchStatus();
    }
  }, [dangerTxConfirmed, refetchStatus]);

  useEffect(() => {
    if (!hasAgent) {
      setApiKey(null);
      return;
    }
    const stored = localStorage.getItem(`zpk_${AGENT_ADDRESS}`);
    setApiKey(stored);
  }, [AGENT_ADDRESS, hasAgent]);

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
          setAutoSwapEnabled(existing.autoSwapEnabled);
          setSwapSlippageTolerance(existing.swapSlippageTolerance);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [address, hasAgent]);

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  async function handleSaveSwapSettings() {
    if (!address) return;
    // Use DB policy if available; fall back to onchain values
    const perTxLimit =
      policy?.perTxLimit ??
      (onchainPolicy?.perTxLimit
        ? formatUnits(onchainPolicy.perTxLimit, 6)
        : "0");
    const dailyBudget =
      policy?.dailyBudget ??
      (onchainPolicy?.dailyLimit
        ? formatUnits(onchainPolicy.dailyLimit, 6)
        : "0");

    setSaving(true);
    setSaveError(null);
    setSaved(false);

    try {
      const timestamp = Date.now();
      const message = JSON.stringify({
        agentAddress: AGENT_ADDRESS,
        perTxLimit,
        dailyBudget,
        timestamp,
      });
      const signature = await signMessageAsync({ message });

      const res = await setLimits({
        agentAddress: AGENT_ADDRESS,
        perTxLimit,
        dailyBudget,
        allowlist: policy?.allowlist,
        approvalThreshold: policy?.approvalThreshold ?? undefined,
        autoSwapEnabled,
        swapSlippageTolerance,
        humanSignature: signature,
        timestamp,
      });
      if (res.apiKey) {
        localStorage.setItem(`zpk_${AGENT_ADDRESS}`, res.apiKey);
        setApiKey(res.apiKey);
      }
      setPolicy((prev) =>
        prev
          ? {
              ...prev,
              autoSwapEnabled: res.autoSwapEnabled,
              swapSlippageTolerance: res.swapSlippageTolerance,
            }
          : prev,
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDangerAction(
    action: "deactivate" | "reactivate" | "revoke",
  ) {
    if (!address) return;
    setDangerError(null);
    setDangerTxHash(undefined);
    setDangerAction(action);

    const fnMap = {
      deactivate: "deactivateAgent",
      reactivate: "reactivateAgent",
      revoke: "revokeAgent",
    } as const;

    try {
      const hash = await writeContractAsync({
        address: SPEND_POLICY_ADDRESS,
        abi: SPEND_POLICY_ABI,
        functionName: fnMap[action],
        args: [AGENT_ADDRESS as `0x${string}`],
      });
      setDangerTxHash(hash);
      if (action === "revoke") setConfirmRevoke(false);
    } catch (err) {
      setDangerError(
        err instanceof Error ? err.message : `Failed to ${action}`,
      );
    } finally {
      setDangerAction(null);
    }
  }

  const isDeactivated = onchainStatus === AgentStatus.Deactivated;
  const isRevoked = onchainStatus === AgentStatus.Revoked;
  const isActive = onchainStatus === AgentStatus.Active;
  const isNotRegistered =
    onchainStatus === AgentStatus.NotRegistered || onchainStatus === undefined;

  // Display values: DB first, onchain fallback
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
  const canSaveSwap =
    Boolean(address) && (Boolean(policy) || Boolean(onchainPolicy?.perTxLimit));

  const maskedKey = apiKey
    ? `${apiKey.slice(0, 8)}${"•".repeat(apiKey.length - 12)}${apiKey.slice(-4)}`
    : "zpk_••••••••••••••••••••••••••••••••";
  const curlCommand = `curl https://zp-api-q4hd.onrender.com/skill.md`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Agent configuration, auto-swap, and API access
        </p>
      </div>

      {!hasAgent && (
        <div className="border border-dashed p-6 text-sm text-muted-foreground">
          No agent linked to this wallet yet. Complete onboarding to create an agent wallet and API key.
        </div>
      )}

      {/* Active Agent card */}
      <div className="border">
        <div className="flex items-center justify-between px-4 py-3 border-b border-dashed">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Active Agent
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              1 active agent
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onchainStatus !== undefined && (
              <Badge
                variant="outline"
                className={cn(
                  "rounded-none text-[10px] font-mono",
                  isActive &&
                    "border-emerald-600 text-emerald-700 dark:text-emerald-400",
                  isDeactivated &&
                    "border-yellow-600 text-yellow-700 dark:text-yellow-400",
                  isRevoked && "border-red-600 text-red-700 dark:text-red-400",
                )}
              >
                {isActive
                  ? "Active"
                  : isDeactivated
                    ? "Deactivated"
                    : isRevoked
                      ? "Revoked"
                      : "Not registered"}
              </Badge>
            )}
            <Badge
              variant="outline"
              className="rounded-none text-[10px] font-mono"
            >
              Base · 8453
            </Badge>
          </div>
        </div>

        <div className="px-4 py-4 flex items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <p className="text-sm font-semibold truncate">{agentDisplayName}</p>
            <div className="flex items-center gap-1.5">
              <code className="text-[10px] font-mono text-muted-foreground">
                {AGENT_ADDRESS.slice(0, 10)}...{AGENT_ADDRESS.slice(-8)}
              </code>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => copyToClipboard(AGENT_ADDRESS, "agent")}
              >
                <Copy className="size-3" />
              </button>
              {copied === "agent" && (
                <span className="text-[10px] text-muted-foreground">
                  Copied
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 pt-1">
              {loading ? (
                <Skeleton className="h-3 w-32 rounded-none" />
              ) : (
                <>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {displayPerTx ? `$${displayPerTx}/tx` : "—/tx"}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {displayDaily ? `$${displayDaily}/day` : "—/day"}
                  </span>
                  <a
                    href={`${BASE_EXPLORER}/address/${policy?.policyContract ?? SPEND_POLICY_ADDRESS}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-foreground"
                  >
                    SpendPolicy
                    <ExternalLink className="size-2.5" />
                  </a>
                </>
              )}
            </div>
          </div>

          <div
            className={cn(
              "shrink-0 size-2 rounded-full mt-1.5",
              isActive
                ? "bg-emerald-500"
                : isDeactivated
                  ? "bg-yellow-500"
                  : "bg-muted-foreground/30",
            )}
            title={
              isActive
                ? "Policy active"
                : isDeactivated
                  ? "Agent deactivated"
                  : isRevoked
                    ? "Agent revoked"
                    : "No policy set"
            }
          />
        </div>
      </div>

      <Card className="rounded-none border">
        <CardHeader>
          <CardTitle className="text-sm font-medium uppercase tracking-wider">
            Auto-Swap Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border border-dashed p-3 text-xs text-muted-foreground">
            Auto-swap exchanges ETH for USDC when the agent wallet has
            insufficient USDC. Only the exact amount needed is swapped.
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Auto-Swap ETH → USDC</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Automatically acquire USDC before payments
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
              e.g. 0.01 = 1% max slippage on ETH→USDC swaps
            </p>
          </div>

          {saveError && (
            <div className="border border-red-600 bg-red-500/10 p-3">
              <p className="text-xs font-mono text-red-700 dark:text-red-400">
                {saveError}
              </p>
            </div>
          )}

          {saved && (
            <div className="border border-emerald-600 bg-emerald-500/10 p-3">
              <p className="text-xs font-mono text-emerald-700 dark:text-emerald-400">
                Settings saved
              </p>
            </div>
          )}

          <Button
            className="rounded-none text-xs"
            size="sm"
            onClick={handleSaveSwapSettings}
            disabled={saving || !canSaveSwap}
          >
            {saving ? (
              <>
                <Loader2 className="size-3 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Swap Settings"
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-none border">
        <CardHeader>
          <CardTitle className="text-sm font-medium uppercase tracking-wider">
            API Access
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider">
              ZenithPay API Key
            </Label>
            <div className="flex items-center gap-2">
              <Input
                className="rounded-none font-mono text-xs"
                value={showKey ? (apiKey ?? maskedKey) : maskedKey}
                readOnly
              />
              <Button
                variant="ghost"
                size="icon"
                className="size-9 rounded-none shrink-0"
                onClick={() => setShowKey((v) => !v)}
              >
                {showKey ? (
                  <EyeOff className="size-3" />
                ) : (
                  <Eye className="size-3" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-9 rounded-none shrink-0"
                onClick={() => copyToClipboard(apiKey ?? maskedKey, "key")}
              >
                <Copy className="size-3" />
              </Button>
            </div>
            {copied === "key" && (
              <p className="text-[10px] text-muted-foreground">Copied</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider">
              Agent Skill
            </Label>
            <div className="flex items-center gap-2">
              <Input
                className="rounded-none font-mono text-xs"
                value={curlCommand}
                readOnly
              />
              <Button
                variant="ghost"
                size="icon"
                className="size-9 rounded-none shrink-0"
                onClick={() => copyToClipboard(curlCommand, "curl")}
              >
                <Copy className="size-3" />
              </Button>
            </div>
            {copied === "curl" && (
              <p className="text-[10px] text-muted-foreground">Copied</p>
            )}
            <p className="text-[10px] text-muted-foreground">
              Agents curl this URL to discover ZenithPay tools
            </p>
          </div>

          <a
            href="https://zp-api-q4hd.onrender.com/skill.md"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
          >
            View skill.md
            <ExternalLink className="size-3" />
          </a>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="rounded-none border border-red-600/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-red-700 dark:text-red-400">
            <AlertTriangle className="size-4" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {dangerTxHash && (
            <a
              href={`${BASE_EXPLORER}/tx/${dangerTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 border border-dashed p-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="size-3 shrink-0" />
              <span className="font-mono">
                {waitingForDangerTx
                  ? "Confirming tx..."
                  : dangerTxConfirmed
                    ? "Tx confirmed"
                    : "Tx submitted"}
                {" · "}
                {dangerTxHash.slice(0, 10)}...{dangerTxHash.slice(-8)}
              </span>
            </a>
          )}

          {dangerError && (
            <div className="border border-red-600 bg-red-500/10 p-3">
              <p className="text-xs font-mono text-red-700 dark:text-red-400">
                {dangerError}
              </p>
            </div>
          )}

          {/* Deactivate / Reactivate */}
          {!isRevoked && (
            <div className="flex items-center justify-between border border-dashed p-3">
              <div>
                <p className="text-sm font-medium">
                  {isDeactivated ? "Reactivate Agent" : "Deactivate Agent"}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {isDeactivated
                    ? "Re-enables the agent — policy remains on-chain"
                    : "Pauses the agent — policy remains on-chain, reversible"}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "rounded-none text-xs",
                  isDeactivated
                    ? "border-emerald-600 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
                    : "border-red-600 text-red-700 hover:bg-red-500/10 dark:text-red-400",
                )}
                disabled={!address || dangerAction !== null || isNotRegistered}
                onClick={() =>
                  handleDangerAction(
                    isDeactivated ? "reactivate" : "deactivate",
                  )
                }
              >
                {dangerAction === "deactivate" ||
                dangerAction === "reactivate" ? (
                  <>
                    <Loader2 className="size-3 animate-spin" />
                    {isDeactivated ? "Reactivating..." : "Deactivating..."}
                  </>
                ) : isDeactivated ? (
                  "Reactivate"
                ) : (
                  "Deactivate"
                )}
              </Button>
            </div>
          )}

          {/* Revoke */}
          {!isRevoked && (
            <div className="flex items-center justify-between border border-red-600/50 bg-red-500/5 p-3">
              <div>
                <p className="text-sm font-medium text-red-700 dark:text-red-400">
                  Revoke Agent Permanently
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Irreversible. Agent loses all authorization forever.
                </p>
              </div>
              {confirmRevoke ? (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-none text-xs"
                    onClick={() => setConfirmRevoke(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-none text-xs border-red-600 bg-red-500/10 text-red-700 hover:bg-red-500/20 dark:text-red-400"
                    disabled={dangerAction !== null}
                    onClick={() => handleDangerAction("revoke")}
                  >
                    {dangerAction === "revoke" ? (
                      <>
                        <Loader2 className="size-3 animate-spin" />
                        Revoking...
                      </>
                    ) : (
                      "Confirm Revoke"
                    )}
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-none text-xs border-red-600 bg-red-500/10 text-red-700 hover:bg-red-500/20 dark:text-red-400"
                  disabled={
                    !address || dangerAction !== null || isNotRegistered
                  }
                  onClick={() => setConfirmRevoke(true)}
                >
                  Revoke
                </Button>
              )}
            </div>
          )}

          {isRevoked && (
            <div className="border border-red-600/50 bg-red-500/5 p-3">
              <p className="text-xs font-mono text-red-700 dark:text-red-400">
                This agent has been permanently revoked and cannot be
                reactivated.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
