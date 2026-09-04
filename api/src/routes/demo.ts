/**
 * ZenithPay Demo Seller Endpoint
 *
 * GET|POST /sell/agent-intel
 *
 * x402-protected resource on Base. Returns a demo agent intelligence report.
 * Costs 0.01 USDC.
 *
 * WARNING: This is a demonstration endpoint for portfolio purposes.
 * Do not deposit funds you cannot afford to lose.
 *
 * Seller flow:
 * 1. No X-Payment header → 402 + Payment-Required header (base64 JSON)
 * 2. X-Payment header present → validate, settle, return resource
 */

import { Hono } from "hono";
import {
  BASE_CHAIN_ID,
  BASE_USDC,
  BASE_X402_NETWORK,
  baseClient,
} from "../config/chains";

const sell = new Hono();

// ── Constants ──────────────────────────────────────────────────────────────

// Demo merchant wallet (receives demo payments)
const DEMO_MERCHANT_ADDRESS = "0xa44fa8ad3e905c8ab525cd0cb14319017f1e04e5";

// 0.01 USDC = 10000 atomic units (USDC has 6 decimals)
const PAYMENT_AMOUNT_ATOMIC = "10000";
const PAYMENT_AMOUNT_DISPLAY = "0.01";
const PAYMENT_TOKEN = "USDC";

// ── Helpers ────────────────────────────────────────────────────────────────

interface AcceptedPayment {
  network: string;
  amount: string;
  asset: string;
  payTo: string;
  maxTimeoutSeconds: number;
  extra?: Record<string, string>;
}

interface DecodedPaymentHeader {
  x402Version: number;
  scheme?: string;
  payload: { signature: string; authorization: Record<string, string> };
  accepted: AcceptedPayment;
}

function buildPaymentRequired(): string {
  const requirement = {
    x402Version: 1,
    accepts: [
      {
        scheme: "exact",
        network: BASE_X402_NETWORK,
        amount: PAYMENT_AMOUNT_ATOMIC,
        asset: BASE_USDC,
        payTo: DEMO_MERCHANT_ADDRESS,
        maxTimeoutSeconds: 300,
        extra: { name: "USDC", version: "2" },
      },
    ],
  };
  return Buffer.from(JSON.stringify(requirement)).toString("base64");
}

function decodePaymentHeader(header: string): DecodedPaymentHeader {
  return JSON.parse(
    Buffer.from(header, "base64").toString("utf-8"),
  ) as DecodedPaymentHeader;
}

async function fetchDemoIntel(): Promise<Record<string, unknown>> {
  // Demo data — no external API calls needed for portfolio demo
  return {
    agent: {
      network: "Base",
      chainId: 8453,
      note: "This is demo data for portfolio demonstration purposes.",
    },
    portfolio: {
      totalValueUsd: "0.00",
      tokens: [
        { symbol: "USDC", balance: "0.00", address: BASE_USDC },
        { symbol: "ETH", balance: "0.00", address: "native" },
      ],
    },
    market: {
      chain: "Base",
      explorerUrl: "https://basescan.org",
    },
    dataSource: "ZenithPay demo endpoint on Base",
    poweredBy: "ZenithPay — spend governance layer for AI agents",
    disclaimer:
      "This is an experimental demo. Do not use with funds you cannot afford to lose.",
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──────────────────────────────────────────────────────────────────

sell.on(["GET", "POST"], "/agent-intel", async (c) => {
  const paymentHeader = c.req.header("X-Payment");

  // Step 1: No payment → return 402 + Payment-Required
  if (!paymentHeader) {
    return c.text("Payment Required", 402, {
      "Content-Type": "text/plain",
      "Payment-Required": buildPaymentRequired(),
      "X-ZenithPay-Amount": `${PAYMENT_AMOUNT_DISPLAY} ${PAYMENT_TOKEN}`,
      "X-ZenithPay-Network": `Base (${BASE_X402_NETWORK})`,
      "X-ZenithPay-Token": BASE_USDC,
      "X-ZenithPay-Receiver": DEMO_MERCHANT_ADDRESS,
      "X-ZenithPay-Resource":
        "Demo agent intelligence report (experimental — do not use real funds)",
    });
  }

  // Step 2: Decode + validate amount and payee
  let decoded: DecodedPaymentHeader;
  try {
    decoded = decodePaymentHeader(paymentHeader);
  } catch {
    return c.json(
      {
        error: "invalid_payment_header",
        message: "Could not decode X-Payment header",
      },
      400,
    );
  }

  // Amount check — protect against underpayment
  const requestedAmount = decoded.accepted?.amount ?? "0";
  if (requestedAmount !== PAYMENT_AMOUNT_ATOMIC) {
    return c.json(
      {
        error: "payment_amount_mismatch",
        expected: PAYMENT_AMOUNT_ATOMIC,
        received: requestedAmount,
        message: `Expected ${PAYMENT_AMOUNT_ATOMIC} atomic units (${PAYMENT_AMOUNT_DISPLAY} ${PAYMENT_TOKEN})`,
      },
      402,
    );
  }

  // Payee check — ensure payment goes to the right wallet
  const payTo = decoded.accepted?.payTo ?? "";
  if (payTo.toLowerCase() !== DEMO_MERCHANT_ADDRESS.toLowerCase()) {
    return c.json(
      {
        error: "payment_payee_mismatch",
        expected: DEMO_MERCHANT_ADDRESS,
        message: "Payment recipient does not match this endpoint",
      },
      402,
    );
  }

  // Network check — only accept Base USDC
  const network = decoded.accepted?.network ?? "";
  if (network !== BASE_X402_NETWORK) {
    return c.json(
      {
        error: "unsupported_network",
        expected: BASE_X402_NETWORK,
        received: network,
        message: "This endpoint only accepts payments on Base (eip155:8453)",
      },
      402,
    );
  }

  // For the demo endpoint, accept the payment header as valid
  // In production, this would verify through an x402 facilitator
  const resourceData = await fetchDemoIntel();

  const paymentResponse = Buffer.from(
    JSON.stringify({
      network: BASE_X402_NETWORK,
      payer: "",
      success: true,
      transaction: "demo-settlement",
    }),
  ).toString("base64");

  return c.json(
    {
      ...resourceData,
      payment: {
        status: "settled",
        network: "Base",
        token: PAYMENT_TOKEN,
        amount: PAYMENT_AMOUNT_DISPLAY,
        explorer: "https://basescan.org",
        disclaimer: "Demo transaction — no real funds were transferred.",
      },
    },
    200,
    {
      "Payment-Response": paymentResponse,
    },
  );
});

export { sell };
