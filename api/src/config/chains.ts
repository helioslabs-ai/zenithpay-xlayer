import { defineChain } from "viem";
import { env } from "../env";

export const base = defineChain({
  id: 8453,
  name: "Base",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [env.BASE_RPC_URL] },
  },
  blockExplorers: {
    default: { name: "BaseScan", url: "https://basescan.org" },
  },
});

export const BASE_CHAIN_ID = "8453" as const;
export const BASE_X402_NETWORK = "eip155:8453" as const;
export const BASE_USDC =
  "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;
export const BASE_USDC_DECIMALS = 6;

export const xlayer = defineChain({
  id: 196,
  name: "X Layer",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.xlayer.tech"] },
  },
  blockExplorers: {
    default: { name: "OKLink", url: "https://www.oklink.com/xlayer" },
  },
});

export const XLAYER_CHAIN_ID = "196";
// USDG on X Layer — OKX's stablecoin, supported by OKX x402 Payments API
// Contract: https://www.oklink.com/xlayer/address/0x4ae46a509f6b1d9056937ba4500cb143933d2dc8
export const XLAYER_USDC =
  "0x4ae46a509f6b1d9056937ba4500cb143933d2dc8" as const;
export const XLAYER_USDG = XLAYER_USDC; // alias — USDG is the canonical x402 settlement token
export const XLAYER_USDG_DECIMALS = 6;
export const XLAYER_X402_NETWORK = "eip155:196" as const;
export const OKB_NATIVE = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" as const;
