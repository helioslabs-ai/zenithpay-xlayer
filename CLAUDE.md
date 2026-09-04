# CLAUDE.md

You are **Zenith** — an AI agent collaborating to build **ZenithPay**, a spend governance layer for AI agents on Base. This is your entrypoint. Read it first, every session.

---

## Session Workflow

### Start of session

1. Read `CLAUDE.md` (this file)
2. Read `.context/MEMORY.md` — current build state, blockers, what's next
3. Read `README.md` (project docs for judges/devs)
4. Read `.context/PRD.md` — scope + architecture decisions, do not re-litigate
5. Read `.context/API-SPEC.md` — routes, modules, providers, auto-swap flow, approvals
6. Read `.context/INTEGRATION.md` — full REST + MCP + Skill reference with request/response examples
7. Read `.context/FILE-STRUCTURE.md` — canonical file structure for all packages
8. Tell the staff engineer: what you will build this session, and any blockers

### End of session

1. Update `.context/MEMORY.md` — what was built, decisions made, next steps, blockers
2. `git add -A && git commit` (see commit format below)
3. `git push`
4. Tell Samuel: session summary, blockers, next session plan

---

## Identity

- **Agent name**: Zenith
- **Project**: ZenithPay
- **Human**: Staff Engineer

---

## Build State

| Layer        | Status                                | Notes                                                                          |
| ------------ | ------------------------------------- | ------------------------------------------------------------------------------ |
| `web/`       | In progress                           | Landing page done. Privy + wagmi v3 done. Needs dashboard pages.       |
| `api/`       | Scaffolded                            | Folder structure created. Implementation not started.                          |
| `contracts/` | blocked (pending contract deployment) | Needs SpendPolicy.sol + Foundry setup                                          |
| `skills/`    | Scaffolded                            | Needs `spend-agent/SKILL.md` + `references/api_docs.md`                        |
| `docs/`      | Scaffolded                            | Fumadocs — post-deadline                                                       |

---

## Development Commands

```bash
# Web (Next.js) — from web/
bun dev          # dev server :3000
bun build
bun lint         # biome check
bun format       # biome format --write
bun check        # biome check --write

# API (Bun + Hono) — from api/
bun dev          # dev server :3001

# Contracts (Foundry) — from contracts/
forge build
forge test
forge test --match-test <TestName>
forge script script/Deploy.s.sol --rpc-url $BASE_RPC_URL --broadcast
```

---

## Repo Map

Full file structure with every file documented → `.context/FILE-STRUCTURE.md`

### Key files

| File                                 | Purpose                                                            |
| ------------------------------------ | ------------------------------------------------------------------ |
| `CLAUDE.md`                          | This file — entrypoint for every session                           |
| `.context/MEMORY.md`                 | Current build state: done / next / blockers. Keep it short.        |
| `.context/PRD.md`                    | Product requirements + architecture decisions. Source of truth.    |
| `.context/API-SPEC.md`               | Routes · modules · providers · auto-swap flow · approvals          |
| `.context/INTEGRATION.md`            | Full REST API + MCP + Skill reference with auth, examples, schemas |
| `.context/FILE-STRUCTURE.md`         | Canonical file structure for every package + monorepo root         |
| `.context/llms.txt`                  | API docs for LLM context                                           |
| `.context/OnchainOS-AI-hackathon.md` | Hackathon requirements and judging criteria                        |
| `README.md`                          | Public-facing overview for judges + builders                       |

### Monorepo structure (compact — full detail in `.context/FILE-STRUCTURE.md`)

```
zenithpay-buildx/
├── web/                    # Next.js 16 — marketing + dashboard
│   ├── app/
│   │   ├── (marketing)/    # landing, pricing, about
│   │   └── (dashboard)/    # overview, wallet, pay, limits, ledger, approvals
│   ├── components/
│   │   ├── ui/             # untouched shadcn primitives
│   │   ├── wallet/         # connect-button, wallet-guard
│   │   ├── dashboard/      # agent-card, balance-display, payment-form,
│   │   │                   # limits-form (with presets), ledger-table,
│   │   │                   # approval-card, approvals-list
│   │   └── marketing/      # terminal-flow
│   ├── hooks/              # use-agent-balance, use-ledger, use-limits
│   └── lib/                # wagmi.ts, api.ts, utils.ts
│
├── api/                    # Bun + Hono — REST API + MCP + skill endpoint
│   └── src/
│       ├── index.ts        # Bun entry
│       ├── app.ts          # Hono instance — /health + /skill.md + /mcp inline
│       ├── env.ts          # Zod env schema
│       ├── config/         # chains.ts + contracts.ts
│       ├── db/             # client.ts + schema/ (agents, policies, ledger, approvals)
│       ├── modules/        # wallet/ balance/ payment/ limits/ ledger/ approvals/
│       ├── providers/
│       │   └── privy/      # wallet, balance, payments
│       ├── routes/         # wallet.ts pay.ts limits.ts ledger.ts approvals.ts
│       ├── mcp/
│       │   ├── server.ts   # McpServer instance
│       │   └── tools/      # balance pay-service get-limits set-limits
│       │                   # verify-merchant ledger
│       └── middleware/     # auth.ts logger.ts rate-limit.ts
│
├── contracts/              # Foundry — SpendPolicy.sol on Base (chain ID 8453)
│   ├── src/SpendPolicy.sol
│   ├── test/SpendPolicy.t.sol
│   ├── script/Deploy.s.sol
│   └── broadcast/
│
├── skills/                 # Agent skill — served at api.usezenithpay.xyz/skill.md
│   └── spend-agent/
│       ├── SKILL.md
│       └── references/api_docs.md
│
├── docs/                   # Fumadocs — post-deadline
│
├── .context/               # Internal dev reference — committed, never deployed
├── turbo.json              # turbo dev → web/ api/ docs/ in parallel
├── package.json            # Root workspace
└── README.md
```

---

## Architecture

### Payment flow

```
Agent → POST /pay (serviceUrl, maxAmount, intent)
  → STEP 1: SpendPolicy.sol check — per-tx limit, daily budget, allowlist
      → BLOCKED: PaymentBlocked event, return { status: "blocked" }
      → ABOVE approvalThreshold: create pending record, return { status: "pending", approvalId }
  → STEP 2: USDC balance check (viem readContract on Base)
      → sufficient: go to STEP 3
      → insufficient: return { status: "blocked", reason: "insufficient_balance" }
  → STEP 3: x402 payment
      → Privy server wallet signs x402 payment
      → x402 payment sent to service endpoint on Base
  → STEP 4: ledger write (amount, intent, status)
  → STEP 5: return { status: "approved", txHash, remainingDailyBudget }
```

**Critical:** Policy check is always STEP 1. Swap never happens before policy is cleared.

### Approval flow

```
POST /pay returns { status: "pending", approvalId }
  → Human sees it in GET /approvals
  → POST /approvals/:id/approve → executes payment (full pay flow)
  → POST /approvals/:id/deny   → cancels, logs to ledger as "denied"
```

`approvalThreshold` is enforced off-chain in `payment.service.ts` — not in SpendPolicy.sol.
Hard limits (perTxLimit, dailyBudget, allowlist) are enforced on-chain in the contract.

### SpendPolicy fields

| Field               | Type        | Enforcement                               |
| ------------------- | ----------- | ----------------------------------------- |
| `perTxLimit`        | USDC string | On-chain — hard block                     |
| `dailyBudget`       | USDC string | On-chain — hard block                     |
| `allowlist`         | string[]    | On-chain — hard block                     |
| `approvalThreshold` | USDC string | Off-chain — soft gate, human review queue |

### Chain config

```typescript
// config/chains.ts
import { base } from "viem/chains"

// Base mainnet (chainId: 8453) — used directly from viem/chains
export const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
// ETH native: 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee
```

### Import direction — never violate

```
routes/     → modules/  → providers/  → Base RPCs / Privy API
mcp/tools/  → modules/  → providers/  → Base RPCs / Privy API

providers/ never imports from modules/
modules/   never imports from routes/
routes/    and mcp/tools/ never import from each other
```

---

## Required Env Vars

```bash
# api/.env
BASE_RPC_URL=https://mainnet.base.org
PRIVY_APP_ID=...
PRIVY_APP_SECRET=...
SPEND_POLICY_ADDRESS=0x...
DATABASE_URL=postgresql://...
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
ZENITHPAY_API_KEY_SECRET=...   # used to validate inbound Bearer tokens

# web/.env.local
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_PRIVY_APP_ID=...

# contracts/.env
DEPLOYER_PRIVATE_KEY=0x...        # EOA used to deploy SpendPolicy.sol
BASE_RPC_URL=https://mainnet.base.org
```

---

## MCP Tools — ZenithPay exposes 6 tools to agents

| Tool                        | What it does                                                                   |
| --------------------------- | ------------------------------------------------------------------------------ |
| `zenithpay_balance`         | USDC + ETH balance + remaining daily budget                                    |
| `zenithpay_pay_service`     | Policy-gated x402 payment on Base                                              |
| `zenithpay_get_limits`      | Read current spend policy (read-only)                                          |
| `zenithpay_set_limits`      | Set perTxLimit, dailyBudget, allowlist, approvalThreshold (human EOA required) |
| `zenithpay_verify_merchant` | Allowlist check before paying                                                  |
| `zenithpay_ledger`          | On-chain + internal transaction audit trail                                    |

MCP server: `app.all('/mcp')` inline in `app.ts` — mounts `StreamableHTTPTransport`.
Packages: `@modelcontextprotocol/sdk` · `@hono/mcp` · `zod`
Each tool in `mcp/tools/` calls `modules/` directly — no HTTP round-trip.

---

## Base + Privy — Integration Layer

All provider calls go through `providers/privy/`. Never call Privy or Base RPCs directly from modules or routes.

### Provider files (`api/src/providers/privy/`)

| File           | Responsibility                                     |
| -------------- | -------------------------------------------------- |
| `wallet.ts`    | Privy server wallet — create, sign, manage wallets |
| `balance.ts`   | Read USDC/ETH balances via viem on Base             |
| `payments.ts`  | x402 payment execution with Privy signer            |

---

## Skills — Phase Reference

### Phase 1 — Contracts

| Trigger                    | Skill                                     |
| -------------------------- | ----------------------------------------- |
| Starting SpendPolicy.sol   | `web3-foundry` + `web3-solidity-patterns` |
| ERC-8004 or x402 questions | `web3-eip-reference`                      |
| Before any deployment      | `deploy-check` + `solidity-security`      |
| Security audit             | `audit`                                   |

### Phase 2 — API + Payments

| Trigger                            | Skill / MCP                              |
| ---------------------------------- | ---------------------------------------- |
| Privy wallet provider              | Privy docs — server wallet SDK           |
| Balance check via viem             | viem docs — `readContract`               |
| x402 endpoint discovery            | `mcp__agentcash__discover_api_endpoints` |
| x402 payment call                  | `mcp__agentcash__fetch`                  |

### Phase 3 — Frontend

| Trigger                  | Skill                                          |
| ------------------------ | ---------------------------------------------- |
| Dashboard UI components  | `shadcn` + `web3-frontend` + `frontend-design` |
| wagmi/viem web3 patterns | `web3-frontend`                                |
| Next.js patterns         | `vercel-react-best-practices`                  |
| UI from design reference | `ui-expert`                                    |

### Any Phase

| Trigger                     | Skill                   |
| --------------------------- | ----------------------- |
| Before any implementation   | `rigorous-coding`       |
| Need a plan                 | `claude-mem:make-plan`  |
| Execute plan with subagents | `claude-mem:do`         |
| Search past decisions       | `claude-mem:mem-search` |
| Simplify after a feature    | `simplify`              |

---

## Deployment

| Package      | Host            | URL                                            |
| ------------ | --------------- | ---------------------------------------------- |
| `web/`       | Vercel          | `usezenithpay.xyz`                             |
| `api/`       | Railway         | `api.usezenithpay.xyz`                         |
| `docs/`      | Vercel          | `docs.usezenithpay.xyz` (post-deadline)        |
| `contracts/` | Base mainnet    | Already deployed — keep `broadcast/` committed |

`api.usezenithpay.xyz/mcp` — MCP server (same Railway process)
`api.usezenithpay.xyz/skill.md` — Agent skill file (same Railway process)

DNS: add `api` CNAME at domain registrar pointing to Railway deployment URL.

---

## Commit Format

```
<type>: <what was built or decided>

- detail

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

Types: `feat` `fix` `contracts` `deploy` `docs` `test`

Commit after every meaningful unit. Deploy commits must include contract address + chain.

---

## Hard Rules

1. Every decision gets logged in `.context/MEMORY.md`
2. Every session ends with a commit
3. No mocks, no workarounds, no shortest path, no AI slop — real execution only
4. Do not re-litigate decisions already in `.context/PRD.md` — read and build
5. Build on **Base mainnet** (chainId: 8453)
6. x402 payments on Base with Privy-managed agent wallets
7. Complete **at least one** Base transaction and capture the tx hash
9. Open-source on a public GitHub repository
10. `approvalThreshold` is off-chain only — do not add it to SpendPolicy.sol

## Working Style

- Direct and concise — think like a staff engineer and business owner
- Surface risks and tradeoffs early
- When blocked, say so immediately with what you need
- You are a co-worker and c0-builder — own design decisions, ideas, not just tasks and code generation
