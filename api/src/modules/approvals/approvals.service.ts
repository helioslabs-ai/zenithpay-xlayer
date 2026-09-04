import { and, eq } from "drizzle-orm";
import { getDb } from "../../db/client";
import { approvals } from "../../db/schema/approvals";
import { generateId } from "../../utils";
import * as ledgerService from "../ledger/ledger.service";
import type { CreateApprovalRequest, PendingApproval } from "./approvals.types";

export async function createPendingApproval(
  request: CreateApprovalRequest,
): Promise<PendingApproval> {
  const db = getDb();
  const id = generateId("apr");
  const now = new Date();

  await db.insert(approvals).values({
    id,
    agentAddress: request.agentAddress,
    merchant: request.merchant,
    serviceUrl: request.serviceUrl,
    amount: request.amount,
    currency: "USDC",
    intent: request.intent,
    status: "pending",
    requestedAt: now,
  });

  return {
    id,
    agentAddress: request.agentAddress,
    merchant: request.merchant,
    serviceUrl: request.serviceUrl,
    amount: request.amount,
    currency: "USDC",
    intent: request.intent,
    status: "pending",
    requestedAt: now.toISOString(),
  };
}

export async function getPendingApprovals(
  agentAddress?: string,
): Promise<{ approvals: PendingApproval[]; total: number }> {
  const db = getDb();

  const conditions = [eq(approvals.status, "pending")];
  if (agentAddress) {
    conditions.push(eq(approvals.agentAddress, agentAddress));
  }

  const rows = await db
    .select()
    .from(approvals)
    .where(and(...conditions));

  const mapped: PendingApproval[] = rows.map((r) => ({
    id: r.id,
    agentAddress: r.agentAddress,
    merchant: r.merchant,
    serviceUrl: r.serviceUrl,
    amount: r.amount,
    currency: r.currency,
    intent: r.intent,
    status: r.status as PendingApproval["status"],
    requestedAt: r.requestedAt.toISOString(),
    resolvedAt: r.resolvedAt?.toISOString() ?? null,
  }));

  return { approvals: mapped, total: mapped.length };
}

export async function approvePayment(
  approvalId: string,
): Promise<PendingApproval> {
  const db = getDb();
  const now = new Date();

  const [row] = await db
    .select()
    .from(approvals)
    .where(eq(approvals.id, approvalId));

  if (!row) throw new Error(`Approval ${approvalId} not found`);
  if (row.status !== "pending")
    throw new Error(`Approval ${approvalId} is already ${row.status}`);

  await db
    .update(approvals)
    .set({ status: "approved", resolvedAt: now })
    .where(eq(approvals.id, approvalId));

  // Re-execute the payment flow (steps 2-6) via dynamic import to avoid circular deps
  const { executePayment } = await import("../payment/payment.service");
  const paymentResult = await executePayment({
    agentAddress: row.agentAddress,
    serviceUrl: row.serviceUrl,
    maxAmount: row.amount,
    intent: row.intent,
  });

  return {
    id: row.id,
    agentAddress: row.agentAddress,
    merchant: row.merchant,
    serviceUrl: row.serviceUrl,
    amount: row.amount,
    currency: row.currency,
    intent: row.intent,
    status: "approved",
    requestedAt: row.requestedAt.toISOString(),
    resolvedAt: now.toISOString(),
    txHash: paymentResult.status === "approved" ? paymentResult.txHash : null,
  };
}

export async function denyPayment(
  approvalId: string,
): Promise<PendingApproval> {
  const db = getDb();
  const now = new Date();

  const [row] = await db
    .select()
    .from(approvals)
    .where(eq(approvals.id, approvalId));

  if (!row) throw new Error(`Approval ${approvalId} not found`);
  if (row.status !== "pending")
    throw new Error(`Approval ${approvalId} is already ${row.status}`);

  await db
    .update(approvals)
    .set({ status: "denied", resolvedAt: now })
    .where(eq(approvals.id, approvalId));

  await ledgerService.writeTransaction({
    agentAddress: row.agentAddress,
    merchant: row.merchant,
    amount: row.amount,
    currency: "USDC",
    intent: row.intent,
    status: "denied",
    swapUsed: false,
  });

  return {
    id: row.id,
    agentAddress: row.agentAddress,
    merchant: row.merchant,
    serviceUrl: row.serviceUrl,
    amount: row.amount,
    currency: row.currency,
    intent: row.intent,
    status: "denied",
    requestedAt: row.requestedAt.toISOString(),
    resolvedAt: now.toISOString(),
  };
}
