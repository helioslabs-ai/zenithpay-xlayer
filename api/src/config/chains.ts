import { createPublicClient, defineChain, http } from "viem";
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

export const baseClient = createPublicClient({
  chain: base,
  transport: http(env.BASE_RPC_URL),
});
