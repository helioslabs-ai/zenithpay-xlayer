import { z } from "zod";
import * as paymentService from "../../modules/payment/payment.service";
import { mcpServer } from "../server";

mcpServer.tool(
  "zenithpay_pay_service",
  "Execute a policy-gated x402 payment on Base. SpendPolicy.sol is checked on-chain before spending. Returns: { status, txHash, amount, currency (USDC), merchant, network, asset, chainId }",
  {
    serviceUrl: z.string().url(),
    maxAmount: z.string(),
    intent: z.string(),
  },
  async ({ serviceUrl, maxAmount, intent }) => {
    const agentAddress = process.env.AGENT_ADDRESS ?? "";
    const result = await paymentService.executePayment({
      agentAddress,
      serviceUrl,
      maxAmount,
      intent,
    });
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result) }],
    };
  },
);
