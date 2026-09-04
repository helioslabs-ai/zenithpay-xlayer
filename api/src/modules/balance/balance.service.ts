import { eq } from "drizzle-orm";
import { formatUnits } from "viem";
import { BASE_USDC, baseClient } from "../../config/chains";
import { SPEND_POLICY_ABI, SPEND_POLICY_ADDRESS } from "../../config/contracts";
import { getDb } from "../../db/client";
import { agents } from "../../db/schema/agents";
import { unitsToUsdc } from "../../utils";
import type { AgentBalance } from "./balance.types";

const erc20BalanceAbi = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

export async function getBalance(agentAddress: string): Promise<AgentBalance> {
  const db = getDb();
  const [agent] = await db
    .select()
    .from(agents)
    .where(eq(agents.address, agentAddress));

  const usdcBalance = formatUnits(
    await baseClient.readContract({
      address: BASE_USDC,
      abi: erc20BalanceAbi,
      functionName: "balanceOf",
      args: [agentAddress as `0x${string}`],
    }),
    6,
  );

  const ethBalance = formatUnits(
    await baseClient.getBalance({
      address: agentAddress as `0x${string}`,
    }),
    18,
  );

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
    // Contract not deployed yet or agent not registered
  }

  return {
    address: agentAddress,
    label: agent?.label ?? null,
    balances: { USDC: usdcBalance, ETH: ethBalance },
    remainingDailyBudget,
  };
}

export async function getAllAgentBalances(
  ownerEoa: string,
): Promise<AgentBalance[]> {
  const db = getDb();
  const agentList = await db
    .select()
    .from(agents)
    .where(eq(agents.ownerEoa, ownerEoa));

  const results: AgentBalance[] = [];
  for (const agent of agentList) {
    const balance = await getBalance(agent.address);
    results.push(balance);
  }
  return results;
}
