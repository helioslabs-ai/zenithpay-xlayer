import { z } from "zod";
import * as balanceService from "../../modules/balance/balance.service";
import { mcpServer } from "../server";

mcpServer.tool(
  "zenithpay_balance",
  "Get agent USDC and ETH balance plus remaining daily budget on Base",
  { agentAddress: z.string().optional() },
  async ({ agentAddress }) => {
    const address = agentAddress ?? process.env.AGENT_ADDRESS ?? "";
    const result = await balanceService.getBalance(address);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result) }],
    };
  },
);
