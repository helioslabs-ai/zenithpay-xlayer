import { PrivyClient } from "@privy-io/node";
import { env } from "../../env";

let client: PrivyClient | null = null;

export function getPrivyClient(): PrivyClient {
  if (client) return client;

  if (!env.PRIVY_APP_ID || !env.PRIVY_APP_SECRET) {
    throw new Error(
      "Privy is not configured. Set PRIVY_APP_ID and PRIVY_APP_SECRET.",
    );
  }

  client = new PrivyClient({
    appId: env.PRIVY_APP_ID,
    appSecret: env.PRIVY_APP_SECRET,
  });

  return client;
}

export function getPrivyAuthorizationContext() {
  if (!env.PRIVY_AUTHORIZATION_PRIVATE_KEY) {
    return undefined;
  }

  return {
    authorization_private_keys: [env.PRIVY_AUTHORIZATION_PRIVATE_KEY],
  };
}
