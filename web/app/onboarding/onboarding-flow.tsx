"use client";

import {
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Shield,
  Wallet,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  useChainId,
  useConnect,
  useAccount,
  useConnectors,
  useSignMessage,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { LogoMark } from "@/components/logo-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setLimits } from "@/lib/api";
import {
  SPEND_POLICY_ABI,
  SPEND_POLICY_ADDRESS,
  usdcToUnits,
  BASE_EXPLORER,
  BASE_USDC_ADDRESS,
} from "@/lib/contracts";

const BASE_CHAIN_ID = 8453;

type Step = "connect" | "policy" | "signing" | "fund" | "done";

const PRESETS = {
  conservative: {
    label: "Conservative",
    description: "$0.10 / tx · $1 daily",
    perTxLimit: "0.10",
    dailyBudget: "1.00",
    approvalThreshold: "0.05",
  },
  balanced: {
    label: "Balanced",
    description: "$0.25 / tx · $3 daily",
    perTxLimit: "0.25",
    dailyBudget: "3.00",
    approvalThreshold: "0.10",
  },
  open: {
    label: "Open",
    description: "$1 / tx · $10 daily",
    perTxLimit: "1.00",
    dailyBudget: "10.00",
    approvalThreshold: "0.50",
  },
} as const;

const BASE_USDC = BASE_USDC_ADDRESS;

const STEPS: { key: Step; label: string }[] = [
  { key: "connect", label: "Connect" },
  { key: "policy", label: "Policy" },
  { key: "fund", label: "Fund" },
  { key: "done", label: "Done" },
];

function stepIndex(step: Step): number {
  if (step === "signing") return 1;
  return STEPS.findIndex((s) => s.key === step);
}

export function OnboardingFlow() {
  const searchParams = useSearchParams();
  const agentAddress = searchParams.get("agent");

  const { address, isConnected } = useAccount();
  const { connectAsync, isPending: connectPending } = useConnect();
  const { switchChainAsync } = useSwitchChain();
  const chainId = useChainId();
  const connectors = useConnectors();
  const { signMessageAsync } = useSignMessage();
  const { writeContractAsync } = useWriteContract();

  const [step, setStep] = useState<Step>(isConnected ? "policy" : "connect");
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);

  const { isLoading: waitingForTx, isSuccess: txConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isConnected && step === "connect") setStep("policy");
  }, [isConnected, step]);

  const [selectedPreset, setSelectedPreset] =
    useState<keyof typeof PRESETS>("balanced");
  const [perTxLimit, setPerTxLimit] = useState<string>(
    PRESETS.balanced.perTxLimit,
  );
  const [dailyBudget, setDailyBudget] = useState<string>(
    PRESETS.balanced.dailyBudget,
  );
  const [approvalThreshold, setApprovalThreshold] = useState<string>(
    PRESETS.balanced.approvalThreshold,
  );
  const [agentName, setAgentName] = useState<string>("");
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function applyPreset(key: keyof typeof PRESETS) {
    setSelectedPreset(key);
    setPerTxLimit(PRESETS[key].perTxLimit);
    setDailyBudget(PRESETS[key].dailyBudget);
    setApprovalThreshold(PRESETS[key].approvalThreshold);
  }

  async function handleConnect() {
    const connector = connectors[0];
    if (!connector) {
      toast.error("No wallet connector available");
      return;
    }

    try {
      await connectAsync({ connector });
      if (chainId !== BASE_CHAIN_ID) {
        await switchChainAsync({ chainId: BASE_CHAIN_ID });
      }
    } catch {
      toast.error("Wallet connection was cancelled or failed");
    }
  }

  async function handleSign() {
    if (!agentAddress || !address) return;
    setSigning(true);
    setError(null);
    setTxHash(undefined);

    try {
      setStep("signing");

      // Step 1: Call registerAgent onchain — John becomes humanOwner in SpendPolicy.sol
      const hash = await writeContractAsync({
        address: SPEND_POLICY_ADDRESS,
        abi: SPEND_POLICY_ABI,
        functionName: "registerAgent",
        args: [
          agentAddress as `0x${string}`,
          usdcToUnits(perTxLimit),
          usdcToUnits(dailyBudget),
          false, // merchantAllowlistEnabled — managed off-chain via allowlist field
        ],
      });
      setTxHash(hash);

      // Step 2: Sign and POST /limits for off-chain fields only
      // (approvalThreshold, autoSwapEnabled, swapSlippageTolerance)
      // The signature auto-links the agent to the signer's address in DB
      const timestamp = Date.now();
      const message = JSON.stringify({
        agentAddress,
        perTxLimit,
        dailyBudget,
        timestamp,
      });
      const signature = await signMessageAsync({ message });

      const result = await setLimits({
        agentAddress,
        perTxLimit,
        dailyBudget,
        approvalThreshold,
        autoSwapEnabled: true,
        swapSlippageTolerance: "0.01",
        label: agentName.trim() || undefined,
        humanSignature: signature,
        timestamp,
      });

      if (result.apiKey) {
        localStorage.setItem(`zpk_${agentAddress}`, result.apiKey);
      }

      setStep("fund");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set policy");
      setStep("policy");
    } finally {
      setSigning(false);
    }
  }

  function copyAddress() {
    if (!agentAddress) return;
    navigator.clipboard.writeText(agentAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!agentAddress) {
    return (
      <div className="border border-dashed p-8 text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          Missing agent address. Use the deep link from your agent terminal:
        </p>
        <code className="text-xs font-mono">
          usezenithpay.xyz/onboarding?agent=0x...
        </code>
      </div>
    );
  }

  const currentIdx = stepIndex(step);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <LogoMark className="size-5" />
          <span className="text-[18px] font-mono tracking-widest text-muted-foreground">
            ZenithPay
          </span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Activate Your Agent
        </h1>
        <p className="text-sm text-muted-foreground">
          Set a spend policy to activate your agent and enable transactions
        </p>
      </div>

      {/* Agent detected */}
      <div className="border border-dashed p-3 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
            Agent detected
          </p>
          <div className="flex items-center gap-1.5">
            <code className="text-xs font-mono text-foreground break-all">
              {agentAddress}
            </code>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
              onClick={copyAddress}
            >
              {copied ? (
                <Check className="size-3" />
              ) : (
                <Copy className="size-3" />
              )}
            </button>
          </div>
        </div>
        <a
          href={`${BASE_EXPLORER}/address/${agentAddress}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[10px] border px-1.5 py-0.5 font-mono text-muted-foreground hover:text-foreground hover:border-foreground transition-colors shrink-0"
        >
          Base · 8453
          <ExternalLink className="size-2.5" />
        </a>
      </div>

      {/* Progress */}
      <div className="flex items-center">
        {STEPS.map((s, idx) => {
          const isDone = idx < currentIdx;
          const isActive = idx === currentIdx;
          const isLast = idx === STEPS.length - 1;

          return (
            <div
              key={s.key}
              className="flex items-center flex-1 last:flex-none"
            >
              <div className="flex items-center gap-1.5 shrink-0">
                <div
                  className="flex size-6 items-center justify-center border text-[10px] font-mono transition-colors"
                  style={
                    isDone
                      ? {
                          borderColor: "var(--brand-accent)",
                          backgroundColor: "var(--brand-accent)",
                          color: "var(--background)",
                        }
                      : isActive
                        ? {
                            borderColor: "var(--brand-accent)",
                            color: "var(--brand-accent)",
                          }
                        : {}
                  }
                >
                  {isDone ? <Check className="size-3" /> : idx + 1}
                </div>
                <span
                  className="text-[10px] uppercase tracking-wider transition-colors"
                  style={
                    isActive
                      ? { color: "var(--brand-accent)", fontWeight: 500 }
                      : isDone
                        ? { color: "var(--brand-accent)" }
                        : {}
                  }
                >
                  {s.label}
                </span>
              </div>
              {!isLast && (
                <div
                  className="mx-3 h-px flex-1 transition-colors"
                  style={{
                    backgroundColor:
                      idx < currentIdx
                        ? "var(--brand-accent)"
                        : "var(--border)",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step 1: Connect */}
      {step === "connect" && (
        <div className="border p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Wallet className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-medium uppercase tracking-wider">
              Connect Wallet
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Connect your wallet to register the spend policy onchain and become
            the policy owner. Only you can modify or revoke the agent&apos;s
            limits.
          </p>
          <Button
            className="w-full rounded-none"
            onClick={handleConnect}
            disabled={connectPending}
          >
            {connectPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Connecting...
              </>
            ) : (
              "Connect Wallet"
            )}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Supports wallets via Privy
          </p>
        </div>
      )}

      {/* Step 2: Policy */}
      {step === "policy" && (
        <div className="border p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-medium uppercase tracking-wider">
              Set Spend Policy
            </h2>
          </div>

          {/* Agent name */}
          <div className="space-y-1.5">
            <Label
              htmlFor="agentName"
              className="text-xs uppercase tracking-wider"
            >
              Agent Name
            </Label>
            <Input
              id="agentName"
              className="rounded-none font-mono text-xs"
              placeholder="e.g. Shopping Agent, Research Bot"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
            />
          </div>

          {/* Presets */}
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map((key) => (
              <button
                key={key}
                type="button"
                className="border p-3 text-left transition-colors"
                style={
                  selectedPreset === key
                    ? {
                        borderColor: "var(--brand-accent)",
                        backgroundColor:
                          "oklch(from var(--brand-accent) l c h / 0.06)",
                      }
                    : {}
                }
                onClick={() => applyPreset(key)}
              >
                <p className="text-xs font-medium">{PRESETS[key].label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                  {PRESETS[key].description}
                </p>
              </button>
            ))}
          </div>

          {/* Inputs */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="perTx"
                className="text-xs uppercase tracking-wider"
              >
                Per-Transaction Limit (USDC)
              </Label>
              <Input
                id="perTx"
                className="rounded-none font-mono text-xs"
                value={perTxLimit}
                onChange={(e) => setPerTxLimit(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="daily"
                className="text-xs uppercase tracking-wider"
              >
                Daily Budget (USDC)
              </Label>
              <Input
                id="daily"
                className="rounded-none font-mono text-xs"
                value={dailyBudget}
                onChange={(e) => setDailyBudget(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="threshold"
                className="text-xs uppercase tracking-wider"
              >
                Approval Threshold (USDC)
              </Label>
              <Input
                id="threshold"
                className="rounded-none font-mono text-xs"
                value={approvalThreshold}
                onChange={(e) => setApprovalThreshold(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">
                Payments above this require your approval
              </p>
            </div>
          </div>

          {error && (
            <div className="border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-xs font-mono text-destructive">{error}</p>
            </div>
          )}

          <Button
            className="w-full rounded-none"
            onClick={handleSign}
            disabled={signing || !perTxLimit || !dailyBudget}
          >
            {signing ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Signing...
              </>
            ) : (
              "Sign & Activate"
            )}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Calls SpendPolicy.registerAgent() on Base — gas ~$0.001 in ETH
          </p>
        </div>
      )}

      {/* Step 2.5: Signing in progress */}
      {step === "signing" && (
        <div className="border p-10 flex flex-col items-center gap-3">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
          {txHash ? (
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                {waitingForTx
                  ? "Waiting for confirmation on Base..."
                  : txConfirmed
                    ? "Transaction confirmed — saving policy..."
                    : "Transaction submitted..."}
              </p>
              <a
                href={`${BASE_EXPLORER}/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-foreground underline underline-offset-4"
              >
                {txHash.slice(0, 10)}...{txHash.slice(-8)}
                <ExternalLink className="size-2.5" />
              </a>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Confirm the transaction in your wallet...
            </p>
          )}
        </div>
      )}

      {/* Step 3: Fund */}
      {step === "fund" && (
        <div className="border p-6 space-y-4">
          <div className="flex items-center gap-2">
            <div
              className="flex size-5 items-center justify-center"
              style={{ color: "var(--brand-accent)" }}
            >
              <Check className="size-4" />
            </div>
            <h2 className="text-sm font-medium uppercase tracking-wider">
              Policy Activated
            </h2>
          </div>

          {txHash && (
            <a
              href={`${BASE_EXPLORER}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground hover:text-foreground border border-dashed px-3 py-2"
            >
              <Check
                className="size-3"
                style={{ color: "var(--brand-accent)" }}
              />
              Onchain tx confirmed
              <span className="font-mono">
                {txHash.slice(0, 10)}...{txHash.slice(-8)}
              </span>
              <ExternalLink className="size-2.5 ml-auto" />
            </a>
          )}

          <p className="text-sm text-muted-foreground">
            Fund the agent wallet to start making payments:
          </p>

          <div className="border border-dashed p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Agent address
              </span>
              <button
                type="button"
                className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors"
                onClick={copyAddress}
              >
                {copied ? "Copied" : "Copy"}
                <Copy className="size-3" />
              </button>
            </div>
            <code className="text-xs font-mono break-all block">
              {agentAddress}
            </code>
          </div>

          <div className="space-y-0 border border-dashed">
            {[
              { label: "Network", value: "Base mainnet (8453)" },
              {
                label: "USDC",
                value: `${BASE_USDC.slice(0, 10)}...${BASE_USDC.slice(-8)}`,
              },
              {
                label: "Gas token",
                value: "ETH (optional — only needed for non-x402 transactions)",
              },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex justify-between border-b border-dashed last:border-0 px-3 py-2 text-xs"
              >
                <span className="text-muted-foreground uppercase tracking-wider text-[10px]">
                  {label}
                </span>
                <span className="font-mono text-[10px]">{value}</span>
              </div>
            ))}
          </div>

          <Button className="w-full rounded-none" onClick={() => setStep("done")}>
            I&apos;ve funded the wallet
          </Button>
          <Button variant="ghost" className="w-full rounded-none" asChild>
            <a href="/dashboard">Continue to dashboard →</a>
          </Button>
        </div>
      )}

      {/* Step 4: Done */}
      {step === "done" && (
        <div className="border p-10 flex flex-col items-center gap-4 text-center">
          <div
            className="flex size-12 items-center justify-center border"
            style={{
              borderColor: "var(--brand-accent)",
              backgroundColor: "oklch(from var(--brand-accent) l c h / 0.1)",
            }}
          >
            <Check
              className="size-6"
              style={{ color: "var(--brand-accent)" }}
            />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Agent Activated</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Return to your agent terminal to continue. The agent will verify
              the policy on your next request.
            </p>
          </div>
          <Button variant="outline" className="rounded-none" asChild>
            <a href="/dashboard">Open Dashboard</a>
          </Button>
        </div>
      )}
    </div>
  );
}
