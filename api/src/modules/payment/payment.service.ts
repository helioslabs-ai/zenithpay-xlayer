import { createPublicClient, http } from "viem";
import {
  BASE_CHAIN_ID,
  BASE_USDC,
  BASE_X402_NETWORK,
  base,
  OKB_NATIVE,
  XLAYER_CHAIN_ID,
  XLAYER_USDC,
  xlayer,
} from "../../config/chains";
import { SPEND_POLICY_ABI, SPEND_POLICY_ADDRESS } from "../../config/contracts";
import { getPrivyWalletId } from "../wallet/wallet.service";
import { payX402 } from "../../providers/privy/x402";
import * as balanceProvider from "../../providers/onchainos/balance";
import * as paymentsProvider from "../../providers/onchainos/payments";
import * as swapProvider from "../../providers/onchainos/swap";
import { extractHost, unitsToUsdc, usdcToUnits } from "../../utils";
import * as approvalsService from "../approvals/approvals.service";
import * as ledgerService from "../ledger/ledger.service";
import { getLimits } from "../limits/limits.service";
import type { PaymentRequest, PaymentResult } from "./payment.types";
import type { BlockReason } from "../../types";

const viemClient = createPublicClient({
  chain: xlayer,
  transport: http(),
});

const baseClient = createPublicClient({
  chain: base,
  transport: http(),
});

const erc20BalanceAbi = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

/**
 * Core payment execution — follows the non-negotiable 6-step flow:
 * 1. SpendPolicy.sol check (on-chain)
 * 2. USDC balance check
 * 3. OKB auto-swap (conditional)
 * 4. x402 payment (verify + settle)
 * 5. Ledger write
 * 6. Return response
 */
export async function executePayment(
  request: PaymentRequest,
): Promise<PaymentResult> {
  return executeBasePayment(request);
}

async function executeBasePayment(
  request: PaymentRequest,
): Promise<PaymentResult> {
  const { agentAddress, serviceUrl, maxAmount, intent } = request;
  const merchant = extractHost(serviceUrl);
  const amountUnits = usdcToUnits(maxAmount);
  const policy = await getLimits(agentAddress);
  const zeroAddress =
    "0x0000000000000000000000000000000000000000" as `0x${string}`;

  const blocked = async (
    reason: BlockReason,
    message?: string,
  ): Promise<PaymentResult> => {
    await ledgerService.writeTransaction({
      agentAddress,
      merchant,
      amount: maxAmount,
      currency: "USDC",
      intent,
      status: "blocked",
      reason,
      swapUsed: false,
      network: BASE_X402_NETWORK,
      asset: BASE_USDC,
      chainId: BASE_CHAIN_ID,
    });
    return {
      status: "blocked",
      reason,
      amount: maxAmount,
      merchant,
      onchainEvent: "PaymentBlocked",
      ...(message ? { message } : {}),
    };
  };

  try {
    const [allowed, reason] = (await baseClient.readContract({
      address: SPEND_POLICY_ADDRESS,
      abi: SPEND_POLICY_ABI,
      functionName: "checkPayment",
      args: [agentAddress as `0x${string}`, zeroAddress, amountUnits],
    })) as [boolean, string];
    if (!allowed) return blocked(mapOnchainReason(reason));
  } catch (error) {
    return blocked(
      "policy_check_failed",
      error instanceof Error ? error.message : "Base policy check failed",
    );
  }

  if (policy.approvalThreshold && amountUnits > usdcToUnits(policy.approvalThreshold)) {
    const approval = await approvalsService.createPendingApproval({
      agentAddress,
      merchant,
      serviceUrl,
      amount: maxAmount,
      intent,
    });
    return {
      status: "pending",
      approvalId: approval.id,
      amount: maxAmount,
      merchant,
      intent,
      message: "Payment exceeds approval threshold. Awaiting human review at GET /approvals.",
    };
  }

  try {
    const balance = await baseClient.readContract({
      address: BASE_USDC,
      abi: erc20BalanceAbi,
      functionName: "balanceOf",
      args: [agentAddress as `0x${string}`],
    });
    if (balance < amountUnits) return blocked("insufficient_balance");
  } catch (error) {
    return blocked(
      "payment_failed",
      error instanceof Error ? error.message : "Base balance check failed",
    );
  }

  try {
    const walletId = await getPrivyWalletId(agentAddress);
    const settled = await payX402(
      serviceUrl,
      walletId,
      agentAddress as `0x${string}`,
      maxAmount,
    );
    await ledgerService.writeTransaction({
      agentAddress,
      merchant,
      amount: maxAmount,
      currency: "USDC",
      intent,
      status: "approved",
      txHash: settled.txHash,
      swapUsed: false,
      network: settled.network,
      asset: settled.asset,
      chainId: BASE_CHAIN_ID,
    });
    return {
      status: "approved",
      txHash: settled.txHash,
      amount: maxAmount,
      currency: "USDC",
      merchant,
      intent,
      swapUsed: false,
      okbSpent: null,
      remainingDailyBudget: "0",
      settledAt: new Date().toISOString(),
      network: settled.network,
      asset: settled.asset,
      chainId: BASE_CHAIN_ID,
    };
  } catch (error) {
    return blocked(
      "payment_failed",
      error instanceof Error ? error.message : "Privy x402 payment failed",
    );
  }
}

async function executeLegacyXLayerPayment(
  request: PaymentRequest,
): Promise<PaymentResult> {
  const { agentAddress, serviceUrl, maxAmount, intent } = request;
  const merchant = extractHost(serviceUrl);
  const amountUnits = usdcToUnits(maxAmount);

  // ── STEP 1: SpendPolicy.sol check ──
  const policy = await getLimits(agentAddress);

  // Merchant is identified by URL in this flow; zero address is the on-chain placeholder.
  // If merchantAllowlistEnabled=false (default), the contract skips the merchant check.
  // If enabled, the human must allowlist specific EVM addresses via the dashboard.
  const ZERO_ADDRESS =
    "0x0000000000000000000000000000000000000000" as `0x${string}`;

  try {
    const [allowed, reason] = (await viemClient.readContract({
      address: SPEND_POLICY_ADDRESS,
      abi: SPEND_POLICY_ABI,
      functionName: "checkPayment",
      args: [agentAddress as `0x${string}`, ZERO_ADDRESS, amountUnits],
    })) as [boolean, string];

    if (!allowed) {
      const blockReason = mapOnchainReason(reason);

      await ledgerService.writeTransaction({
        agentAddress,
        merchant,
        amount: maxAmount,
        currency: "USDG",
        intent,
        status: "blocked",
        reason: blockReason,
        swapUsed: false,
      });

      return {
        status: "blocked",
        reason: blockReason,
        amount: maxAmount,
        merchant,
        onchainEvent: "PaymentBlocked",
      };
    }
  } catch (error) {
    // RPC failure — fail closed: block the payment rather than skip the policy check
    const message =
      error instanceof Error ? error.message : "Policy check failed";
    await ledgerService.writeTransaction({
      agentAddress,
      merchant,
      amount: maxAmount,
      currency: "USDG",
      intent,
      status: "blocked",
      reason: "policy_check_failed",
      swapUsed: false,
    });
    return {
      status: "blocked",
      reason: "policy_check_failed",
      amount: maxAmount,
      merchant,
      onchainEvent: "PaymentBlocked",
      message,
    };
  }

  // Check approval threshold (off-chain soft gate)
  if (policy.approvalThreshold) {
    const thresholdUnits = usdcToUnits(policy.approvalThreshold);
    if (amountUnits > thresholdUnits) {
      const approval = await approvalsService.createPendingApproval({
        agentAddress,
        merchant,
        serviceUrl,
        amount: maxAmount,
        intent,
      });

      return {
        status: "pending",
        approvalId: approval.id,
        amount: maxAmount,
        merchant,
        intent,
        message:
          "Payment exceeds approval threshold. Awaiting human review at GET /approvals.",
      };
    }
  }

  // ── STEP 2: USDC balance check ──
  const tokenBalances = await balanceProvider.getTokenBalances(agentAddress, [
    XLAYER_USDC,
    OKB_NATIVE,
  ]);

  let usdcBalance = 0;
  let okbBalance = 0;
  for (const tb of tokenBalances) {
    const addr = (tb.tokenContractAddress ?? "").toLowerCase();
    if (addr === XLAYER_USDC.toLowerCase()) {
      usdcBalance = Number.parseFloat(tb.balance);
    }
    if (
      addr === "" ||
      addr === OKB_NATIVE.toLowerCase() ||
      tb.symbol === "OKB"
    ) {
      okbBalance = Number.parseFloat(tb.balance);
    }
  }

  const amountFloat = Number.parseFloat(maxAmount);
  let swapUsed = false;
  let okbSpent: string | null = null;

  // ── STEP 3: OKB auto-swap (conditional) ──
  if (usdcBalance < amountFloat) {
    const deficit = amountFloat - usdcBalance;

    if (!policy.autoSwapEnabled) {
      await ledgerService.writeTransaction({
        agentAddress,
        merchant,
        amount: maxAmount,
        currency: "USDG",
        intent,
        status: "blocked",
        reason: "auto_swap_disabled",
        swapUsed: false,
      });

      return {
        status: "blocked",
        reason: "auto_swap_disabled",
        amount: maxAmount,
        merchant,
        onchainEvent: "PaymentBlocked",
      };
    }

    if (okbBalance <= 0) {
      await ledgerService.writeTransaction({
        agentAddress,
        merchant,
        amount: maxAmount,
        currency: "USDG",
        intent,
        status: "blocked",
        reason: "insufficient_balance",
        swapUsed: false,
      });

      return {
        status: "blocked",
        reason: "insufficient_balance",
        amount: maxAmount,
        merchant,
        onchainEvent: "PaymentBlocked",
      };
    }

    try {
      const quote = await swapProvider.quoteOkbToUsdc(
        usdcToUnits(deficit.toFixed(6)).toString(),
        agentAddress,
      );

      // Check slippage tolerance before executing swap
      // fromTokenAmount is in wei (18 decimals), okbBalance is in UI units
      const slippageTolerance = Number.parseFloat(policy.swapSlippageTolerance);
      const estimatedOkbWei = BigInt(quote.routerResult.fromTokenAmount);
      const maxOkbWei =
        estimatedOkbWei +
        (estimatedOkbWei * BigInt(Math.floor(slippageTolerance * 10000))) /
          10000n;
      const maxOkbUi = Number(maxOkbWei) / 1e18;

      if (maxOkbUi > okbBalance) {
        await ledgerService.writeTransaction({
          agentAddress,
          merchant,
          amount: maxAmount,
          currency: "USDG",
          intent,
          status: "blocked",
          reason: "swap_slippage_exceeded",
          swapUsed: false,
        });

        return {
          status: "blocked",
          reason: "swap_slippage_exceeded",
          amount: maxAmount,
          merchant,
          onchainEvent: "PaymentBlocked",
        };
      }

      const swapResult = await swapProvider.swapOkbToUsdc(
        quote.routerResult.fromTokenAmount,
        agentAddress,
      );

      swapUsed = true;
      okbSpent = swapResult.routerResult.fromTokenAmount;
    } catch {
      await ledgerService.writeTransaction({
        agentAddress,
        merchant,
        amount: maxAmount,
        currency: "USDG",
        intent,
        status: "blocked",
        reason: "swap_quote_failed",
        swapUsed: false,
      });

      return {
        status: "blocked",
        reason: "swap_quote_failed",
        amount: maxAmount,
        merchant,
        onchainEvent: "PaymentBlocked",
      };
    }
  }

  // ── STEP 4: x402 payment ──
  let txHash: string;
  let settledNetwork = "eip155:196";
  let settledAsset: string = XLAYER_USDC;
  try {
    await paymentsProvider.verifyX402(serviceUrl, agentAddress, maxAmount);
    const settleResult = await paymentsProvider.settleX402(
      serviceUrl,
      agentAddress,
      maxAmount,
      "", // signature handled by OKX Payments API internally
    );
    txHash = settleResult.txHash;
    settledNetwork = settleResult.network ?? "eip155:196";
    settledAsset = settleResult.asset ?? XLAYER_USDC;
  } catch {
    await ledgerService.writeTransaction({
      agentAddress,
      merchant,
      amount: maxAmount,
      currency: "USDG",
      intent,
      status: "blocked",
      reason: "payment_failed",
      swapUsed,
      okbSpent,
    });

    return {
      status: "blocked",
      reason: "payment_failed",
      amount: maxAmount,
      merchant,
      onchainEvent: "PaymentBlocked",
    };
  }

  // ── STEP 5: Ledger write ──
  await ledgerService.writeTransaction({
    agentAddress,
    merchant,
    amount: maxAmount,
    currency: "USDG",
    intent,
    status: "approved",
    txHash,
    swapUsed,
    okbSpent,
    network: settledNetwork,
    asset: settledAsset,
    chainId: XLAYER_CHAIN_ID,
  });

  // ── STEP 6: Return response ──
  let remainingDailyBudget = "0";
  try {
    const remaining = await viemClient.readContract({
      address: SPEND_POLICY_ADDRESS,
      abi: SPEND_POLICY_ABI,
      functionName: "getRemainingDailyBudget",
      args: [agentAddress as `0x${string}`],
    });
    remainingDailyBudget = unitsToUsdc(remaining as bigint);
  } catch {
    // fallback
  }

  return {
    status: "approved",
    txHash,
    amount: maxAmount,
    currency: "USDG",
    merchant,
    intent,
    swapUsed,
    okbSpent,
    remainingDailyBudget,
    settledAt: new Date().toISOString(),
    network: settledNetwork,
    asset: settledAsset,
    chainId: XLAYER_CHAIN_ID,
  };
}

function mapOnchainReason(
  reason: string,
): PaymentResult extends { reason: infer R } ? R : never {
  const map: Record<string, string> = {
    exceeds_per_tx_limit: "per_tx_limit_exceeded",
    exceeds_daily_limit: "daily_budget_exceeded",
    merchant_not_allowed: "merchant_not_allowlisted",
    agent_not_active: "agent_not_active",
  };
  return (map[reason] ?? reason) as ReturnType<typeof mapOnchainReason>;
}
