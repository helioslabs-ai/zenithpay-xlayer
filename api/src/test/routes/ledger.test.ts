import { describe, expect, it, vi } from "vitest";
import { app } from "../../app";

const API_KEY = "test_secret_key_minimum_32_characters_long";
const AUTH_HEADER = { Authorization: `Bearer ${API_KEY}` };

vi.mock("../../modules/ledger/ledger.service", () => ({
  getTransactions: vi.fn().mockResolvedValue({
    transactions: [],
    total: 0,
    limit: 50,
    offset: 0,
  }),
  writeTransaction: vi.fn(),
}));

describe("Ledger routes", () => {
  it("GET /ledger without auth → 200 (public route)", async () => {
    const res = await app.request("/ledger");
    expect(res.status).toBe(200);
  });

  it("GET /ledger with auth → 200", async () => {
    const res = await app.request("/ledger", { headers: AUTH_HEADER });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.transactions).toBeDefined();
    expect(body.total).toBe(0);
    expect(body.limit).toBe(50);
    expect(body.offset).toBe(0);
  });

  it("GET /ledger with pagination params → 200", async () => {
    const res = await app.request("/ledger?limit=10&offset=5&status=approved", {
      headers: AUTH_HEADER,
    });
    expect(res.status).toBe(200);
  });
});
