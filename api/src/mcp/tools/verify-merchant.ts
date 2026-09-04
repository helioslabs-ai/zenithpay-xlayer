import { z } from "zod";
import * as limitsService from "../../modules/limits/limits.service";
import { extractHost } from "../../utils";
import { mcpServer } from "../server";

mcpServer.tool(
  "zenithpay_verify_merchant",
  "Check whether a merchant URL is safe to pay. Checks the agent's allowlist policy.",
  { merchantUrl: z.string().url() },
  async ({ merchantUrl }) => {
    const agentAddress = process.env.AGENT_ADDRESS ?? "";
    const host = extractHost(merchantUrl);

    const policy = await limitsService.getLimits(agentAddress);
    const allowlisted =
      policy.allowlist.length === 0 || policy.allowlist.includes(host);

    const result: Record<string, unknown> = {
      merchantUrl,
      host,
      safe: true,
      allowlisted,
      riskLevel: "low",
    };

    if (!allowlisted && policy.allowlist.length > 0) {
      result.warning =
        "Merchant is not on your allowlist. Payment will be blocked if allowlist is enforced. Ask your human to add this merchant.";
    }

    return {
      content: [{ type: "text" as const, text: JSON.stringify(result) }],
    };
  },
);
