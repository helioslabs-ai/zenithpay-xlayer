CREATE TABLE "agents" (
	"address" varchar(42) PRIMARY KEY NOT NULL,
	"privy_wallet_id" text,
	"api_key" text,
	"label" text,
	"owner_eoa" varchar(42) NOT NULL,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approvals" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_address" varchar(42) NOT NULL,
	"merchant" text NOT NULL,
	"service_url" text NOT NULL,
	"amount" text NOT NULL,
	"currency" text DEFAULT 'USDC' NOT NULL,
	"intent" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ledger" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_address" varchar(42) NOT NULL,
	"merchant" text NOT NULL,
	"amount" text NOT NULL,
	"currency" text DEFAULT 'USDC' NOT NULL,
	"intent" text NOT NULL,
	"status" text NOT NULL,
	"reason" text,
	"tx_hash" varchar(66),
	"swap_used" boolean DEFAULT false NOT NULL,
	"okb_spent" text,
	"network" text,
	"asset" text,
	"chain_id" text,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "policies" (
	"agent_address" varchar(42) PRIMARY KEY NOT NULL,
	"per_tx_limit" text NOT NULL,
	"daily_budget" text NOT NULL,
	"allowlist" text[],
	"approval_threshold" text,
	"auto_swap_enabled" boolean DEFAULT true,
	"swap_slippage_tolerance" text DEFAULT '0.01',
	"contract_address" varchar(42)
);
--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_agent_address_agents_address_fk" FOREIGN KEY ("agent_address") REFERENCES "public"."agents"("address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger" ADD CONSTRAINT "ledger_agent_address_agents_address_fk" FOREIGN KEY ("agent_address") REFERENCES "public"."agents"("address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policies" ADD CONSTRAINT "policies_agent_address_agents_address_fk" FOREIGN KEY ("agent_address") REFERENCES "public"."agents"("address") ON DELETE no action ON UPDATE no action;