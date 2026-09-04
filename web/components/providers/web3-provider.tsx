"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { createConfig, WagmiProvider } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { base } from "viem/chains";
import {
  createConfig as createPlainWagmiConfig,
  http,
  WagmiProvider as PlainWagmiProvider,
} from "wagmi";

/** Wagmi without Privy connector — only when `NEXT_PUBLIC_PRIVY_APP_ID` is unset. */
const plainWagmiConfig = createPlainWagmiConfig({
  chains: [base],
  transports: {
    [base.id]: http(),
  },
});

/** Wagmi + Privy embedded wallet connector (onboarding, dashboard, `useConnection`, etc.). */
const privyWagmiConfig = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(),
  },
});

const queryClient = new QueryClient();

interface Web3ProviderProps {
  children: ReactNode;
}

export function Web3Provider({ children }: Web3ProviderProps) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!appId) {
    return (
      <QueryClientProvider client={queryClient}>
        <PlainWagmiProvider config={plainWagmiConfig}>
          {children}
        </PlainWagmiProvider>
      </QueryClientProvider>
    );
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["email"],
        appearance: {
          theme: "dark",
          accentColor: "#ffffff",
        },
        embeddedWallets: {
          ethereum: { createOnLogin: "users-without-wallets" },
        },
        defaultChain: base,
        supportedChains: [base],
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={privyWagmiConfig}>{children}</WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
