import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import * as balanceService from "../modules/balance/balance.service";
import * as walletService from "../modules/wallet/wallet.service";

const wallet = new Hono();

wallet.post(
  "/genesis",
  zValidator(
    "json",
    z.object({
      email: z.string().email().optional(),
      label: z.string().optional(),
    }),
  ),
  async (c) => {
    const body = c.req.valid("json");
    const ownerEoa =
      c.req.header("X-Owner-Address") ??
      "0x0000000000000000000000000000000000000000";

    try {
      const result = await walletService.createGenesisWallet(body, ownerEoa);
      return c.json(result, 201);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Wallet registration failed";
      const status = message.includes("already registered") ? 409 : 500;
      return c.json(
        {
          error: status === 409 ? "conflict" : "internal_error",
          message,
          status,
        },
        status,
      );
    }
  },
);

function toBalanceResponse(
  b: Awaited<ReturnType<typeof balanceService.getBalance>>,
) {
  return {
    agentAddress: b.address,
    usdcBalance: b.balances.USDC,
    ethBalance: b.balances.ETH,
    remainingDailyBudget: b.remainingDailyBudget ?? null,
  };
}

wallet.get("/balance", async (c) => {
  const address = c.req.query("address");

  try {
    if (address) {
      const result = await balanceService.getBalance(address);
      return c.json({ agents: [toBalanceResponse(result)] });
    }

    const ownerEoa = c.req.header("X-Owner-Address") ?? "";
    const results = await balanceService.getAllAgentBalances(ownerEoa);
    return c.json({ agents: results.map(toBalanceResponse) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Balance query failed";
    return c.json({ error: "internal_error", message, status: 500 }, 500);
  }
});

wallet.get("/agents", async (c) => {
  const ownerEoa = c.req.header("X-Owner-Address") ?? "";
  const agentAddress = c.req.query("address");

  try {
    if (agentAddress) {
      const agent = await walletService.getAgentByAddress(agentAddress);
      return c.json({
        agents: agent ? [{ address: agent.address, label: agent.label }] : [],
      });
    }

    const agents = await walletService.getAgentsByOwner(ownerEoa);
    return c.json({
      agents: agents.map((a) => ({ address: a.address, label: a.label })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Agent list failed";
    return c.json({ error: "internal_error", message, status: 500 }, 500);
  }
});

export { wallet };
