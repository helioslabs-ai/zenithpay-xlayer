import { and, sql } from "drizzle-orm";
import { createPublicClient, http, recoverMessageAddress } from "viem";
import { base } from "../../config/chains";
import { SPEND_POLICY_ABI, SPEND_POLICY_ADDRESS } from "../../config/contracts";
import { getDb } from "../../db/client";
import { agents } from "../../db/schema/agents";
import { policies } from "../../db/schema/policies";
import { unitsToUsdc } from "../../utils";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

import type {
  AgentPolicy,
  SetLimitsRequest,
  SetLimitsResult,
} from "./limits.types";

const viemClient = createPublicClient({
  chain: base,
  transport: http(),
});

export async function getLimits(agentAddress: string): Promise<AgentPolicy> {
  const db = getDb();
  const agentLower = agentAddress.toLowerCase();
  const [localPolicy] = await db
    .select()
    .from(policies)
    .where(sql`lower(${policies.agentAddress}) = ${agentLower}`);

  let perTxLimit = "0";
  let dailyBudget = "0";

  try {
    const onchainPolicy = (await viemClient.readContract({
      address: SPEND_POLICY_ADDRESS,
      abi: SPEND_POLICY_ABI,
      functionName: "getPolicy",
      args: [agentLower as `0x${string}`],
    })) as {
      perTxLimit: bigint;
      dailyLimit: bigint;
      dailySpent: bigint;
      windowStart: bigint;
      status: number;
      merchantAllowlistEnabled: boolean;
      humanOwner: string;
    };

    perTxLimit = unitsToUsdc(onchainPolicy.perTxLimit);
    dailyBudget = unitsToUsdc(onchainPolicy.dailyLimit);
  } catch {
    // Contract not deployed or agent not registered — fall back to DB
    if (localPolicy) {
      perTxLimit = localPolicy.perTxLimit;
      dailyBudget = localPolicy.dailyBudget;
    }
  }

  return {
    address: agentAddress,
    perTxLimit,
    dailyBudget,
    allowlist: localPolicy?.allowlist ?? [],
    approvalThreshold: localPolicy?.approvalThreshold ?? null,
    autoSwapEnabled: localPolicy?.autoSwapEnabled ?? true,
    swapSlippageTolerance: localPolicy?.swapSlippageTolerance ?? "0.01",
    policyContract: SPEND_POLICY_ADDRESS,
  };
}

export async function getLimitsForOwner(
  ownerEoa: string,
): Promise<AgentPolicy[]> {
  const db = getDb();
  const agentList = await db
    .select()
    .from(agents)
    .where(sql`lower(${agents.ownerEoa}) = ${ownerEoa.toLowerCase()}`);

  const results: AgentPolicy[] = [];
  for (const agent of agentList) {
    const policy = await getLimits(agent.address);
    results.push(policy);
  }
  return results;
}

export async function setLimits(
  request: SetLimitsRequest,
): Promise<SetLimitsResult> {
  const db = getDb();
  const agentLower = request.agentAddress.toLowerCase();

  // Browser onboarding path: verify humanSignature and auto-link if needed.
  // MCP direct call path: timestamp is absent — skip verification (zpk_ auth
  // is enforced at the HTTP layer before reaching this function).
  if (request.timestamp !== undefined) {
    const message = JSON.stringify({
      agentAddress: request.agentAddress,
      perTxLimit: request.perTxLimit,
      dailyBudget: request.dailyBudget,
      timestamp: request.timestamp,
    });

    const signer = await recoverMessageAddress({
      message,
      signature: request.humanSignature as `0x${string}`,
    });

    const [agentRecord] = await db
      .select({ ownerEoa: agents.ownerEoa })
      .from(agents)
      .where(sql`lower(${agents.address}) = ${agentLower}`);

    if (!agentRecord) {
      throw new Error("Agent not found");
    }

    const ownerLower = agentRecord.ownerEoa.toLowerCase();
    const signerLower = signer.toLowerCase();

    if (ownerLower === ZERO_ADDRESS) {
      // Auto-link: first human to activate becomes the owner — atomic with policy set
      await db
        .update(agents)
        .set({
          ownerEoa: signerLower,
          ...(request.label !== undefined ? { label: request.label } : {}),
        })
        .where(
          and(
            sql`lower(${agents.address}) = ${agentLower}`,
            sql`lower(${agents.ownerEoa}) = ${ZERO_ADDRESS}`,
          ),
        );
    } else if (ownerLower !== signerLower) {
      throw new Error("Unauthorized: signer is not the agent owner");
    } else if (request.label !== undefined) {
      await db
        .update(agents)
        .set({ label: request.label })
        .where(sql`lower(${agents.address}) = ${agentLower}`);
    }
  }

  // Store policy locally (off-chain components like approvalThreshold)
  await db
    .insert(policies)
    .values({
      agentAddress: agentLower,
      perTxLimit: request.perTxLimit,
      dailyBudget: request.dailyBudget,
      allowlist: request.allowlist ?? [],
      approvalThreshold: request.approvalThreshold ?? null,
      autoSwapEnabled: request.autoSwapEnabled ?? true,
      swapSlippageTolerance: request.swapSlippageTolerance ?? "0.01",
      contractAddress: SPEND_POLICY_ADDRESS,
    })
    .onConflictDoUpdate({
      target: policies.agentAddress,
      set: {
        perTxLimit: request.perTxLimit,
        dailyBudget: request.dailyBudget,
        allowlist: request.allowlist ?? [],
        approvalThreshold: request.approvalThreshold ?? null,
        autoSwapEnabled: request.autoSwapEnabled ?? true,
        swapSlippageTolerance: request.swapSlippageTolerance ?? "0.01",
      },
    });

  // Fetch the agent's apiKey to return to the caller. Safe to expose here because
  // we've already verified the caller is the owner via humanSignature (browser path)
  // or they're calling via the authenticated MCP path (zpk_ key at HTTP layer).
  const [agentRow] = await db
    .select({ apiKey: agents.apiKey })
    .from(agents)
    .where(sql`lower(${agents.address}) = ${agentLower}`);

  return {
    status: "deployed",
    policyContract: SPEND_POLICY_ADDRESS,
    txHash: null,
    agentAddress: request.agentAddress,
    apiKey: agentRow?.apiKey ?? null,
    perTxLimit: request.perTxLimit,
    dailyBudget: request.dailyBudget,
    allowlist: request.allowlist ?? [],
    autoSwapEnabled: request.autoSwapEnabled ?? true,
    swapSlippageTolerance: request.swapSlippageTolerance ?? "0.01",
  };
}
