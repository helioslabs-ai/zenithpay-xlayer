import crypto from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../../db/client";
import { agents } from "../../db/schema/agents";
import { getPrivyClient } from "../../providers/privy/client";
import type { GenesisWalletRequest, GenesisWalletResult } from "./wallet.types";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function generateApiKey(): string {
  return `zpk_${crypto.randomBytes(32).toString("hex")}`;
}

export async function createGenesisWallet(
  request: GenesisWalletRequest,
  ownerEoa: string,
): Promise<GenesisWalletResult> {
  const db = getDb();

  const [ownedAgent] = await db
    .select()
    .from(agents)
    .where(sql`lower(${agents.ownerEoa}) = ${ownerEoa.toLowerCase()}`);

  if (ownedAgent) {
    if (!ownedAgent.privyWalletId) {
      throw new Error(
        "Agent belongs to a legacy wallet system and must be recreated on Base",
      );
    }
    return {
      agentAddress: ownedAgent.address,
      network: "base",
      walletProvider: "privy",
      apiKey: ownedAgent.apiKey ?? "",
      label: ownedAgent.label,
      createdAt: ownedAgent.createdAt.toISOString(),
      message: `Wallet already exists. Activate at https://usezenithpay.xyz/onboarding?agent=${ownedAgent.address}`,
    };
  }

  const privy = getPrivyClient();
  const wallet = await privy.wallets().create({
    chain_type: "ethereum",
    display_name: request.label ?? "ZenithPay agent",
  });
  const agentAddress = wallet.address.toLowerCase();

  const apiKey = generateApiKey();

  await db.insert(agents).values({
    address: agentAddress,
    privyWalletId: wallet.id,
    apiKey,
    label: request.label ?? null,
    ownerEoa: ownerEoa.toLowerCase(),
    email: request.email ?? null,
  });

  return {
    agentAddress,
    network: "base",
    walletProvider: "privy",
    apiKey,
    label: request.label ?? null,
    createdAt: new Date().toISOString(),
    message: `Wallet created. Activate at https://usezenithpay.xyz/onboarding?agent=${agentAddress}`,
  };
}

export async function getPrivyWalletId(agentAddress: string): Promise<string> {
  const db = getDb();
  const [agent] = await db
    .select({ privyWalletId: agents.privyWalletId })
    .from(agents)
    .where(sql`lower(${agents.address}) = ${agentAddress.toLowerCase()}`);

  if (!agent?.privyWalletId) {
    throw new Error("Agent is not backed by a Privy wallet on Base");
  }

  return agent.privyWalletId;
}

export async function getAgentsByOwner(ownerEoa: string) {
  const db = getDb();
  return db
    .select()
    .from(agents)
    .where(sql`lower(${agents.ownerEoa}) = ${ownerEoa.toLowerCase()}`);
}

export async function getAgentByAddress(agentAddress: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(agents)
    .where(sql`lower(${agents.address}) = ${agentAddress.toLowerCase()}`);
  return row ?? null;
}

export async function linkAgent(
  agentAddress: string,
  ownerAddress: string,
): Promise<{ agentAddress: string; ownerAddress: string }> {
  const db = getDb();
  const agentLower = agentAddress.toLowerCase();
  const ownerLower = ownerAddress.toLowerCase();

  const rows = await db
    .select()
    .from(agents)
    .where(
      and(
        sql`lower(${agents.address}) = ${agentLower}`,
        sql`lower(${agents.ownerEoa}) = ${ZERO_ADDRESS}`,
      ),
    );

  if (rows.length === 0) {
    const existing = await db
      .select()
      .from(agents)
      .where(sql`lower(${agents.address}) = ${agentLower}`);
    if (existing.length === 0) {
      throw new Error("Agent not found");
    }
    throw new Error("Agent already linked to an owner");
  }

  await db
    .update(agents)
    .set({ ownerEoa: ownerLower })
    .where(
      and(
        sql`lower(${agents.address}) = ${agentLower}`,
        sql`lower(${agents.ownerEoa}) = ${ZERO_ADDRESS}`,
      ),
    );

  return { agentAddress: agentLower, ownerAddress: ownerLower };
}
