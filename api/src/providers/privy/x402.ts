import { createViemAccount } from "@privy-io/node/viem";
import { x402Client, x402HTTPClient, wrapFetchWithPayment } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { BASE_USDC, BASE_X402_NETWORK } from "../../config/chains";
import { getPrivyAuthorizationContext, getPrivyClient } from "./client";

export interface PrivyX402Payment {
  txHash: string;
  amount: string;
  network: string;
  asset: string;
}

/**
 * Pay an x402 resource using a Privy-managed Ethereum wallet.
 *
 * The x402 SDK handles the 402 challenge, EIP-3009 authorization, retry, and
 * settlement response. The facilitator is selected by the resource server;
 * this client never sends funds without the server's payment requirements.
 */
export async function payX402(
  serviceUrl: string,
  walletId: string,
  address: `0x${string}`,
  maxAmount: string,
): Promise<PrivyX402Payment> {
  const privy = getPrivyClient();
  const signer = createViemAccount(privy, {
    walletId,
    address,
    authorizationContext: getPrivyAuthorizationContext(),
  });
  const client = new x402Client().register(
    BASE_X402_NETWORK,
    new ExactEvmScheme(signer),
  );
  const maxUnits = BigInt(Math.floor(Number.parseFloat(maxAmount) * 1_000_000));
  client
    .registerPolicy((_version, requirements) =>
      requirements.filter(
        (requirement) =>
          requirement.network === BASE_X402_NETWORK &&
          requirement.asset.toLowerCase() === BASE_USDC.toLowerCase() &&
          BigInt(requirement.amount) <= maxUnits,
      ),
    )
    .setSpendControls({ maxAmountPerPayment: maxUnits.toString() });
  const fetchWithPayment = wrapFetchWithPayment(fetch, client);

  const response = await fetchWithPayment(serviceUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: "payment" }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`x402 request failed (${response.status}): ${body.slice(0, 200)}`);
  }

  const httpClient = new x402HTTPClient(client);
  const decoded = httpClient.getPaymentSettleResponse((name) =>
    response.headers.get(name),
  ) as {
    transaction?: string;
    network?: string;
    payer?: string;
    success?: boolean;
  };

  if (!decoded.success || !decoded.transaction) {
    throw new Error("x402 facilitator did not confirm settlement");
  }

  return {
    txHash: decoded.transaction,
    amount: maxAmount,
    network: decoded.network ?? BASE_X402_NETWORK,
    asset: BASE_USDC,
  };
}
