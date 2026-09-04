<div align="center">

<img src="/zenithpay-banner.png" alt="ZenithPay" width="100%"/>

<br/>

# ZenithPay

> Your Agent Spends. You Own the Rules.

**The spend governance layer for AI agents — with onchain-enforced policies, x402 payment settlements in USDC, and a full audit trail. Live on Base.**

> **Safety notice:** This is an experimental project for demonstration purposes.
> Do not deposit funds you cannot afford to lose. Smart contracts, APIs,
> third-party services, and transaction execution can fail and may cause
> permanent asset loss. This notice is not legal or financial advice and does
> not remove any legal obligations.

<br/>

[![Network](<https://img.shields.io/badge/Network-Base%20(8453)-0052FF?style=flat-square&logoColor=white>)](https://base.org)
[![Payments](https://img.shields.io/badge/Protocol-x402-FF69B4?style=flat-square&logoColor=white)](https://www.x402.org)
[![USDC Settlement](https://img.shields.io/badge/Settlement-USDC-2775CA?style=flat-square&logoColor=white)](https://www.circle.com/usdc)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](./LICENSE)

<br/>

[**Live Demo**](https://usezenithpay.xyz) · [**Video Demo**](https://youtu.be/fwr1vvNi7QA) · [**Docs**](https://docs.usezenithpay.xyz) · [**Agent Skill**](https://api.usezenithpay.xyz/skill.md)

</div>

---

## Overview

ZenithPay is a **security middleware layer** that sits between AI agents and the services they pay for. It enforces spend rules at the **smart contract level** — limits no API can override and no server outage can remove.

Think of it as a **programmable corporate card policy engine for AI agents**: per-transaction caps, daily budgets, merchant allowlists, and optional approval thresholds, all enforced onchain — with payments settled as **x402 USDC micropayments** on Base, and a full audit trail.

---

## The Problem

The agentic economy is growing fast. But agents that spend money introduce a new category of risk that no one has solved cleanly:

- **Unrestricted wallet access** — one compromised agent or plugin drains everything
- **Off-chain guardrails** — centralized, bypassable, and subject to downtime
- **Key exposure** — most agent wallets store private keys in APIs or local storage; a single exploit empties the balance

There is no reliable way to **govern how agents spend**, and no **secure key management** that survives a compromised stack.

---

## The Solution

ZenithPay closes this gap with three layers working together:

| Layer                         | What it does                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------ |
| **Privy Wallet**              | Managed agent wallets via Privy — keys secured server-side, never exposed to the API       |
| **Onchain Policy Governance** | `SpendPolicy.sol` enforces limits at the contract level — no API call can override it      |
| **USDC x402 Payments**        | x402 USDC micropayments on Base via the x402 protocol                                      |

---

## How It Works

### Architecture

```
+---------------------------------------------------------------------------+
|                            AI Agent                                        |
|       Claude Code . Cursor . Codex . Gemini CLI . Any MCP client          |
|              Agent Wallet: USDC / ETH on Base (Privy-managed)             |
+--------+-------------------+----------------------+-----------------------+
         |              MCP Server            REST API
         |              Agent Skill
         +-------------------+----------------------+
                             |
                  zenithpay_pay_service()
                             |
+----------------------------v-----------------------------------------+
|                          ZenithPay API                                |
|                                                                      |
|   1. Policy Gate                                                     |
|      Read SpendPolicy.sol -> check perTxLimit + dailyBudget          |
|      Check merchant allowlist                                        |
|                                                                      |
|   2. Decision                                                        |
|      APPROVED  -> execute immediately                                |
|      PENDING   -> queue for human review (approvalThreshold hit)     |
|      BLOCKED   -> reject with reason, log to ledger                  |
|                                                                      |
|   3. Execution                                                       |
|      Settle via x402 on Base                                         |
|      Emit PaymentExecuted / PaymentBlocked onchain                   |
+----------------------------+------------------------------------------+
                             |
           +-----------------+------------------+
           |                                    |
+----------v--------------+      +--------------v--------------------------+
|   Privy Wallet          |      |   Base Mainnet (Chain ID 8453)          |
|   Infrastructure        |      |                                         |
|                         |      |  SpendPolicy.sol                        |
|  Managed Agent Wallets  |      |  +-- perTxLimit    (onchain enforced)   |
|  Server-side Signing    |      |  +-- dailyBudget   (onchain enforced)   |
|                         |      |  +-- allowlist     (onchain enforced)   |
|                         |      |  +-- approvalThreshold (off-chain gate) |
+-------------------------+      +-----------------------------------------+
```

### x402 Payment Flow

```
Client (Buyer)                    ZenithPay Seller Route                    x402 Facilitator
      |                                     |                                     |
      |---- GET/POST /sell/agent-intel ---->|                                     |
      |<--- 402 + Payment-Required ---------|                                     |
      |        (USDC amount + payTo)        |                                     |
      |                                     |                                     |
      |---- POST /pay (buyer flow) -------->|                                     |
      |        with serviceUrl=/sell/...    |                                     |
      |                                     |---- verify + settle --------------->|
      |                                     |<------------- txHash + success -----|
      |<--- approved { txHash, network } ---|                                     |
```

ZenithPay wraps the buyer flow in `POST /pay`, while `/sell/agent-intel` is the seller-side x402 route that issues payment requirements and returns the paid resource after settlement.

### Payment Flow (step by step)

```
Agent wants to pay api.service.com for $0.10 USDC
        |
        v
[1] zenithpay_get_limits       -> perTxLimit: $0.25, dailyBudget: $3.00, spent today: $0.40
        |
        v
[2] zenithpay_balance          -> USDC: $2.50, ETH: 0.01
        |
        v
[3] zenithpay_verify_merchant  -> security check passes, merchant allowlisted
        |
        v
[4] SpendPolicy.sol check      -> $0.10 < $0.25 perTxLimit, daily budget not exceeded
        |
        v
[5] x402 settle                -> x402 protocol on Base
        |
        v
[6] PaymentExecuted event      -> logged onchain + to ledger
        |
        v
Agent receives: { status: "approved", txHash: "0x..." }
```

### Optional Human Approval Queue

When a payment exceeds the `approvalThreshold`, the agent is not blocked — it waits:

```
Agent requests $0.20 payment -> above $0.10 approvalThreshold
        |
        v
status: "pending" + approvalId returned to agent
        |
        v
Human reviews intent, amount, and merchant
        |
        +-- Approve -> payment executes immediately via x402
        +-- Deny   -> payment cancelled, reason logged, agent notified
```

---

## Spend Policy

Limits are enforced at the smart contract level. Even if ZenithPay's API goes down, the policy holds.

| Field               | Enforced  | Behaviour                                 |
| ------------------- | --------- | ----------------------------------------- |
| `perTxLimit`        | On-chain  | Blocks if any single payment exceeds cap  |
| `dailyBudget`       | On-chain  | Blocks if cumulative daily spend exceeded |
| `allowlist`         | On-chain  | Blocks if merchant address not on list    |
| `approvalThreshold` | Off-chain | Queues for human review if exceeded       |

**Presets:**

- Conservative -> $0.10 per tx / $1.00 daily
- Balanced -> $0.50 per tx / $5.00 daily
- Open -> $2.00 per tx / $20.00 daily

---

## Agent Quickstart

<div>
<table>
  <tr>
    <td align="center"><strong>Works<br/>with</strong></td>
    <td align="center"><img src="docs/public/assets/openclaw.svg" width="28" alt="OpenClaw" /><br/><sub>OpenClaw</sub></td>
    <td align="center"><img src="docs/public/assets/claude.svg" width="28" alt="Claude" /><br/><sub>Claude Code</sub></td>
    <td align="center"><img src="docs/public/assets/codex.svg" width="28" alt="Codex" /><br/><sub>Codex</sub></td>
    <td align="center"><img src="docs/public/assets/cursor.svg" width="28" alt="Cursor" /><br/><sub>Cursor</sub></td>
  </tr>
</table>
</div>

```bash
# Tell your agent:
Read https://api.usezenithpay.xyz/skill.md and follow the setup and onboarding instructions
```

**What happens:**

| Step | Action                                                                                    |
| ---- | ----------------------------------------------------------------------------------------- |
| 1    | Agent checks `~/.zenithpay/config.json` — wallet exists? Skip to step 4                  |
| 2    | Agent prompts for email -> `POST /wallet/genesis` -> Privy wallet created, no key stored  |
| 3    | Agent installs MCP server -> tools persist across sessions                                |
| 4    | **You:** Open link from agent -> connect wallet -> set spend limits -> sign onchain       |
| 5    | Agent verifies policy is active -> ready to spend                                         |

**Agent tool call order at runtime:**

```
zenithpay_get_limits -> zenithpay_balance -> zenithpay_verify_merchant -> zenithpay_pay_service -> zenithpay_ledger
```

### Three ways to connect

| Method    | Command                                                                                                 |
| --------- | ------------------------------------------------------------------------------------------------------- |
| **Skill** | `curl -s https://api.usezenithpay.xyz/skill.md` — agent reads, gets tools + onboarding                  |
| **MCP**   | Add to config: `url: https://api.usezenithpay.xyz/mcp` with `Authorization` + `X-Agent-Address` headers |
| **REST**  | `POST /pay` with Bearer token — any language, any framework                                             |

---

## Agent Tools (MCP + Skill)

Six tools available via MCP server and Agent Skill. Approval actions are REST-only by design.

| Tool                        | Description                                                     |
| --------------------------- | --------------------------------------------------------------- |
| `zenithpay_balance`         | USDC + ETH balance + remaining daily budget                     |
| `zenithpay_get_limits`      | Read current onchain spend policy                               |
| `zenithpay_verify_merchant` | Security scan + allowlist check before paying                   |
| `zenithpay_pay_service`     | Policy-gated x402 payment                                       |
| `zenithpay_set_limits`      | Deploy / update onchain spend policy (requires human signature) |
| `zenithpay_ledger`          | Full onchain + internal transaction audit trail                 |

---

## API Reference

All endpoints require `Authorization: Bearer $ZENITHPAY_API_KEY` except `/health`.

| Method | Route                    | Description                                                    |
| ------ | ------------------------ | -------------------------------------------------------------- |
| `GET`  | `/health`                | Health check — no auth required                                |
| `POST` | `/wallet/genesis`        | Create Privy-managed agent wallet                              |
| `GET`  | `/wallet/balance`        | USDC + ETH balance + remaining daily budget                    |
| `GET`  | `/wallet/agents`         | List all agents under authenticated account                    |
| `POST` | `/pay`                   | Execute policy-gated x402 payment (buyer entry point)          |
| `GET`  | `/sell/agent-intel`      | Seller-side x402 endpoint — returns 402 challenge or paid data |
| `GET`  | `/limits`                | Read current spend policy for agent(s)                         |
| `POST` | `/limits`                | Deploy / update spend policy — requires human EOA signature    |
| `GET`  | `/ledger`                | Full transaction audit trail                                   |
| `GET`  | `/approvals`             | Pending payments awaiting human review                         |
| `POST` | `/approvals/:id/approve` | Approve pending payment — executes immediately                 |
| `POST` | `/approvals/:id/deny`    | Deny pending payment — cancels and logs                        |

**`POST /pay` responses:** `approved` (txHash) . `pending` (approvalId) . `blocked` (reason)

Full schemas -> [docs.usezenithpay.xyz](https://docs.usezenithpay.xyz)

---

## Tech Stack

| Layer            | Technology                                                |
| ---------------- | --------------------------------------------------------- |
| Frontend         | Next.js 16, Tailwind v4, shadcn/ui, Motion               |
| Backend API      | Bun, Hono                                                 |
| Database         | PostgreSQL, Supabase, Drizzle ORM                         |
| Wallet Connect   | Privy (embedded wallets + auth)                           |
| Smart Contracts  | Solidity, Foundry, OpenZeppelin                           |
| Blockchain       | Base mainnet (chain ID 8453)                              |
| Payment Protocol | x402 on Base                                              |
| Agent Wallet     | Privy-managed wallets                                     |
| Agent Protocol   | MCP (Model Context Protocol)                              |
| Web Deploy       | Vercel                                                    |
| API Deploy       | Railway                                                   |

---

## Setup

**Prerequisites:** [Bun](https://bun.sh) . [Foundry](https://getfoundry.sh) . [Privy app](https://privy.io) . [Supabase](https://supabase.com) project

### 1. Clone and install

```bash
git clone https://github.com/zenith-hq/zenithpay-buildx.git
cd zenithpay-buildx
bun install
```

### 2. Configure environment

```bash
cp api/.env.example api/.env
cp web/.env.example web/.env.local
```

`api/.env`:

```bash
BASE_RPC_URL=https://mainnet.base.org
PRIVY_APP_ID=...
PRIVY_APP_SECRET=...
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
SPEND_POLICY_ADDRESS=0x...         # fill after step 3
ZENITHPAY_API_KEY_SECRET=...
```

`contracts/.env`:

```bash
DEPLOYER_PRIVATE_KEY=0x...
BASE_RPC_URL=https://mainnet.base.org
```

`web/.env.local`:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_PRIVY_APP_ID=...
SPEND_POLICY_ADDRESS=0x...
```

### 3. Deploy contracts to Base

```bash
cd contracts
forge build && forge test
forge script script/Deploy.s.sol --rpc-url $BASE_RPC_URL --broadcast --slow
```

Copy the deployed address -> `SPEND_POLICY_ADDRESS` in `api/.env`, then:

```bash
cd api && bun run db:migrate
```

### 4. Run locally

```bash
cd web && bun dev   # :3000
cd api && bun dev   # :3001
```

### 5. Deploy to production

| Service | Host                           | Config                                   |
| ------- | ------------------------------ | ---------------------------------------- |
| `api/`  | [Railway](https://railway.app) | Root: `api/` . CNAME `api` -> Railway URL |
| `web/`  | [Vercel](https://vercel.com)   | Root: `web/` . auto-deploys on push      |
| `docs/` | [Vercel](https://vercel.com)   | Root: `docs/` . auto-deploys on push     |

---

## Project Structure

```
zenithpay-buildx/
|
+-- api/                                        # Bun + Hono -- REST . MCP . Agent Skill
|   +-- src/
|       +-- app.ts                              # Entry -- /health . /mcp . /skill.md
|       |
|       +-- providers/                          # External service integrations
|       |   +-- privy.ts                        # Privy wallet creation + management
|       |   +-- balance.ts                      # Balance queries on Base
|       |   +-- payments.ts                     # x402 payment verify + settle
|       |
|       +-- modules/
|       |   +-- payment/payment.service.ts      # Core flow -- policy gate -> x402 settle
|       |   +-- wallet/wallet.service.ts        # Wallet creation via Privy
|       |   +-- limits/limits.service.ts        # SpendPolicy.sol read/write via viem
|       |   +-- approvals/                      # Human review queue -- approve . deny
|       |   +-- balance/                        # Balance reads
|       |   +-- ledger/                         # Audit trail -- every payment logged with intent
|       |
|       +-- routes/
|       |   +-- pay.ts                          # POST /pay -- buyer entry point for policy-gated x402
|       |   +-- demo.ts                         # GET /sell/agent-intel -- seller-side x402 resource route
|       |   +-- limits.ts                       # GET + POST /limits -- policy read/write
|       |   +-- wallet.ts                       # POST /wallet/genesis . GET /wallet/balance . /agents
|       |   +-- ledger.ts                       # GET /ledger -- full transaction audit trail
|       |   +-- approvals.ts                    # GET /approvals . POST /approvals/:id/approve|deny
|       |   +-- agents.ts                       # POST /agents/link -- owner-agent mapping
|       |
|       +-- mcp/
|       |   +-- server.ts                       # MCP server -- StreamableHTTPTransport at /mcp
|       |   +-- tools/                          # 6 tools: balance . pay . limits . verify . ledger
|       |
|       +-- middleware/                         # auth . logger . rate-limit
|
+-- contracts/
|   +-- src/SpendPolicy.sol                     # Onchain enforcement -- PaymentExecuted/Blocked
|
+-- skills/
|   +-- spend-agent/SKILL.md                    # Agent Skill -- curl https://api.usezenithpay.xyz/skill.md
|
+-- web/                                        # Next.js 16 -- marketing + dashboard
|   +-- components/
|   |   +-- providers/web3-provider.tsx          # Privy provider config
|   |   +-- signin.tsx                          # Privy wallet connect
|   +-- app/
|       +-- onboarding/onboarding-flow.tsx      # Onboarding + chain enforcement
|       +-- (marketing)/                        # Landing page
|       +-- (dashboard)/                        # Wallet . Pay . Limits . Approvals . Ledger
|
+-- docs/                                       # Fumadocs -- docs.usezenithpay.xyz
```

---

## Roadmap

### Phase 1 — Foundation (current)

- [x] `SpendPolicy.sol` — onchain enforcement, Base mainnet
- [x] Privy-managed agent wallets — secure key management
- [x] x402-native payment routing with USDC on Base
- [x] Human approval queue for above-threshold payments
- [x] MCP server + Agent Skill — any agent framework
- [x] Dashboard — spend policy, ledger, approvals

### Phase 2 — Production

- [ ] Guardian-per-agent contracts — funds locked inside the contract, not just policy-gated
- [ ] Smart accounts + session keys (ERC-4337) — scoped, expiring agent permissions
- [ ] ERC-8004 agent trust identity
- [ ] `npx skills add zenithpay/spend-agent`

### Phase 3 — Platform

- [ ] Agent Card — virtual cards backed by the SpendPolicy engine
- [ ] Agent Credit — credit lines backed by onchain spend history
- [ ] ZenithPay SDK — drop-in npm package for any agent framework
- [ ] Multi-agent dashboard — manage agent fleets with unified policy

---

## Acknowledgements

- [x402 Protocol](https://www.x402.org) — machine-native micropayments
- [Base](https://base.org) — the chain powering ZenithPay
- [Privy](https://privy.io) — wallet infrastructure
- [Coinbase Developer Platform](https://www.coinbase.com/developer-platform) — x402 facilitator

---

## Contributing

PRs welcome. Open an issue first for significant changes.

---

## License

MIT
