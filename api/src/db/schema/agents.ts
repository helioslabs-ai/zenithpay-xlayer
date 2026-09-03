import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const agents = pgTable("agents", {
  address: varchar("address", { length: 42 }).primaryKey(),
  privyWalletId: text("privy_wallet_id"),
  apiKey: text("api_key"),
  label: text("label"),
  ownerEoa: varchar("owner_eoa", { length: 42 }).notNull(),
  email: text("email"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
