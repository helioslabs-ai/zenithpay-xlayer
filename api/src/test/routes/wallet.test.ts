import { describe, expect, it, vi } from "vitest";
import { app } from "../../app";

const API_KEY = "test_secret_key_minimum_32_characters_long";
const AUTH_HEADER = { Authorization: `Bearer ${API_KEY}` };

vi.mock("../../modules/wallet/wallet.service", () => ({
  createGenesisWallet: vi.fn().mockResolvedValue({
    agentAddress: "0xcadf000000000000000000000000000000001a9",
    label: "test-agent",
    balances: { USDC: "0.00", ETH: "0.00" },
    createdAt: "2026-01-01T00:00:00.000Z",
  }),
  getAgentsByOwner: vi.fn().mockResolvedValue([
    {
      address: "0xcadf000000000000000000000000000000001a9",
      label: "test-agent",
    },
  ]),
}));

vi.mock("../../modules/balance/balance.service", () => ({
  getBalance: vi.fn().mockResolvedValue({
    address: "0xcadf000000000000000000000000000000001a9",
    label: "test-agent",
    balances: { USDC: "12.50", ETH: "0.80" },
    remainingDailyBudget: "1.75",
  }),
  getAllAgentBalances: vi.fn().mockResolvedValue([
    {
      address: "0xcadf000000000000000000000000000000001a9",
      label: "test-agent",
      balances: { USDC: "12.50", ETH: "0.80" },
      remainingDailyBudget: "1.75",
    },
  ]),
}));

describe("Wallet routes", () => {
  it("POST /wallet/genesis without auth → 201 (public route)", async () => {
    const res = await app.request("/wallet/genesis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.agentAddress).toBeDefined();
  });

  it("POST /wallet/genesis with auth, valid body → 201", async () => {
    const res = await app.request("/wallet/genesis", {
      method: "POST",
      headers: { ...AUTH_HEADER, "Content-Type": "application/json" },
      body: JSON.stringify({ label: "test-agent" }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.agentAddress).toBeDefined();
    expect(body.label).toBe("test-agent");
  });

  it("POST /wallet/genesis with optional email → 201", async () => {
    const res = await app.request("/wallet/genesis", {
      method: "POST",
      headers: { ...AUTH_HEADER, "Content-Type": "application/json" },
      body: JSON.stringify({ email: "agent@test.com", label: "test-agent" }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.agentAddress).toBeDefined();
  });

  it("GET /wallet/balance without auth → 200 (public route)", async () => {
    const res = await app.request("/wallet/balance");
    expect(res.status).toBe(200);
  });

  it("GET /wallet/balance with auth → 200", async () => {
    const res = await app.request("/wallet/balance", {
      headers: AUTH_HEADER,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.agents).toBeDefined();
    expect(Array.isArray(body.agents)).toBe(true);
  });

  it("GET /wallet/agents with auth → 200", async () => {
    const res = await app.request("/wallet/agents", {
      headers: AUTH_HEADER,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.agents).toBeDefined();
    expect(Array.isArray(body.agents)).toBe(true);
  });

  it("GET /wallet/agents without auth → 200 (public route)", async () => {
    const res = await app.request("/wallet/agents");
    expect(res.status).toBe(200);
  });
});
