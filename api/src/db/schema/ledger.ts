import {
  boolean,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { agents } from "./agents";

export const ledger = pgTable("ledger", {
  id: text("id").primaryKey(),
  agentAddress: varchar("agent_address", { length: 42 })
    .notNull()
    .references(() => agents.address),
  merchant: text("merchant").notNull(),
  amount: text("amount").notNull(),
  currency: text("currency").default("USDC").notNull(),
  intent: text("intent").notNull(),
  status: text("status").notNull(),
  reason: text("reason"),
  txHash: varchar("tx_hash", { length: 66 }),
  swapUsed: boolean("swap_used").default(false).notNull(),
  okbSpent: text("okb_spent"),
  network: text("network"),
  asset: text("asset"),
  chainId: text("chain_id"),
  timestamp: timestamp("timestamp", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
