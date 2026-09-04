import { createPublicClient, http } from "viem";
import {
  BASE_CHAIN_ID,
  BASE_USDC,
  BASE_X402_NETWORK,
  base,
  baseClient,
} from "../../config/chains";
import { SPEND_POLICY_ABI, SPEND_POLICY_ADDRESS } from "../../config/contracts";
import { getPrivyWalletId } from "../wallet/wallet.service";
import { payX402 } from "../../providers/privy/x402";
import { extractHost, unitsToUsdc, usdcToUnits } from "../../utils";
import * as approvalsService from "../approvals/approvals.service";
import * as ledgerService from "../ledger/ledger.service";
import { getLimits } from "../limits/limits.service";
import type { PaymentRequest, PaymentResult } from "./payment.types";
import type { BlockReason } from "../../types";

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
 * 1. SpendPolicy.sol check (on-chain, Base mainnet)
 * 2. USDC balance check
 * 3. Approval threshold check (off-chain)
 * 4. x402 payment via Privy signer
 * 5. Ledger write
 * 6. Return response
 */
export async function executePayment(
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

  // Step 1: On-chain policy check
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

  // Step 3: Approval threshold (off-chain soft gate)
  if (
    policy.approvalThreshold &&
    amountUnits > usdcToUnits(policy.approvalThreshold)
  ) {
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

  // Step 2: USDC balance check
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

  // Step 4: x402 payment via Privy signer
  try {
    const walletId = await getPrivyWalletId(agentAddress);
    const settled = await payX402(
      serviceUrl,
      walletId,
      agentAddress as `0x${string}`,
      maxAmount,
    );

    // Step 5: Ledger write
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

    // Step 6: Return response
    let remainingDailyBudget = "0";
    try {
      const remaining = await baseClient.readContract({
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
      txHash: settled.txHash,
      amount: maxAmount,
      currency: "USDC",
      merchant,
      intent,
      swapUsed: false,
      remainingDailyBudget,
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
