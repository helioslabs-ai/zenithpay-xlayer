import { describe, expect, it, vi } from "vitest";
import { app } from "../../app";

const API_KEY = "test_secret_key_minimum_32_characters_long";
const AUTH_HEADER = { Authorization: `Bearer ${API_KEY}` };
const JSON_HEADERS = { ...AUTH_HEADER, "Content-Type": "application/json" };

vi.mock("../../modules/limits/limits.service", () => ({
  getLimits: vi.fn().mockResolvedValue({
    address: "0x0000000000000000000000000000000000000001",
    perTxLimit: "0.25",
    dailyBudget: "3.00",
    allowlist: ["exa.ai"],
    approvalThreshold: "0.25",
    policyContract: "0xF5875F25ccEB2edDc57F218eaF1F71c5CF161f21",
  }),
  getLimitsForOwner: vi.fn().mockResolvedValue([]),
  setLimits: vi.fn().mockResolvedValue({
    status: "deployed",
    policyContract: "0xF5875F25ccEB2edDc57F218eaF1F71c5CF161f21",
    txHash: null,
    agentAddress: "0x0000000000000000000000000000000000000001",
    perTxLimit: "0.25",
    dailyBudget: "3.00",
    allowlist: ["exa.ai"],
  }),
}));

describe("Limits routes", () => {
  it("GET /limits without auth → 200 (public route)", async () => {
    const res = await app.request("/limits");
    expect(res.status).toBe(200);
  });

  it("GET /limits with auth → 200", async () => {
    const res = await app.request(
      "/limits?address=0x0000000000000000000000000000000000000001",
      { headers: AUTH_HEADER },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.agents).toBeDefined();
    expect(Array.isArray(body.agents)).toBe(true);
  });

  it("POST /limits without auth → 201 (public route, uses humanSignature)", async () => {
    const res = await app.request("/limits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentAddress: "0x0000000000000000000000000000000000000001",
        perTxLimit: "0.25",
        dailyBudget: "3.00",
        humanSignature: "0xsig",
      }),
    });
    expect(res.status).toBe(201);
  });

  it("POST /limits missing humanSignature → 400", async () => {
    const res = await app.request("/limits", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        agentAddress: "0x0000000000000000000000000000000000000001",
        perTxLimit: "0.25",
        dailyBudget: "3.00",
      }),
    });
    expect(res.status).toBe(400);
  });

  it("POST /limits valid → 201", async () => {
    const res = await app.request("/limits", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        agentAddress: "0x0000000000000000000000000000000000000001",
        perTxLimit: "0.25",
        dailyBudget: "3.00",
        humanSignature: "0xsig123",
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.status).toBe("deployed");
  });
});
