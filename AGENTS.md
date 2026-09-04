# AGENTS.md

Global operating guide for any coding agent working in this repo (Cursor, Codex, Claude Code, Gemini, etc.).

- **Claude Code-specific skill triggers** live in `CLAUDE.md`.
- **Product + architecture source of truth** lives in `.context/PRD.md`.

---

## Project

**ZenithPay** — spend management layer for AI agents on Base.

> Agents securely pay x402-native HTTP endpoints with enforced on-chain spend policies, Privy-managed agent wallets, and full audit trail on Base mainnet.

**Origin:** Originally built for a hackathon, now a portfolio piece demonstrating onchain agent payments.
**Deadline:** March 26, 2026

---

## Repo map

| Path                                 | Purpose                                                             |
| ------------------------------------ | ------------------------------------------------------------------- |
| `.context/PRD.md`                    | Architecture decisions + full product spec. Source of truth.        |
| `.context/MEMORY.md`                 | Current build state: done / next / blockers. Updated every session. |
| `web/`                               | Frontend — Next.js 16 + Tailwind v4 + shadcn/ui                     |
| `api/`                               | Backend API — Bun + Hono                                            |
| `contracts/`                         | Smart contracts — Solidity + Foundry                                |

---

## Development commands

All run with `bun`. Each workspace has its own `bun.lock`.

```bash
# Web (Next.js) — cd web/
bun dev              # dev server :3000
bun build            # production build
bun lint             # biome check
bun format           # biome format --write
bun check            # biome check --write

# Contracts (Foundry) — cd contracts/
forge build
forge test
forge test --match-test <TestName>
forge script script/Deploy.s.sol --rpc-url $BASE_RPC_URL --broadcast --slow

# API (Bun + Hono) — cd api/
bun dev              # dev server :3001
bun test             # run tests
```

---

## Build state

| Layer        | Status          | What's needed                                                           |
| ------------ | --------------- | ----------------------------------------------------------------------- |
| `web/`       | In progress     | Landing page done. Privy removed, wagmi v3 done. Needs dashboard pages. |
| `api/`       | **Not created** | Full Bun + Hono scaffold + providers layer                              |
| `contracts/` | **Not created** | SpendPolicy.sol + Foundry setup                                         |

---

## Architecture

### Payment flow

```
Agent → zenithpay_pay_service(url, maxAmount, intent)
  → Check USDC balance            (viem readContract on Base)
  → [If USDC < required]
      return error — insufficient balance
  → SpendPolicy.sol checkAndRecord()  ← on-chain enforcement gate
  → Privy server wallet signs x402 payment
  → x402 payment sent to service endpoint on Base
  → txHash returned
  → PaymentExecuted event emitted on-chain
  → Ledger entry written to Supabase
```

Blocked call path: `SpendPolicy.sol` reverts → `PaymentBlocked` event → error returned to agent.

**x402 Payments on Base:**

- Agent's Privy server wallet signs EIP-3009 `transferWithAuthorization` for USDC on Base
- `@x402/fetch` handles the 402 challenge-response flow automatically
- Settlement happens on Base mainnet — standard gas, no facilitator needed

Full spec in `.context/PRD.md` §4.

### API provider layer (`api/src/providers/`)

| File                            | Responsibility                                          |
| ------------------------------- | ------------------------------------------------------- |
| `privy/wallet.ts`               | Privy server wallet — create, sign, manage agent wallets |
| `privy/balance.ts`              | Read USDC/ETH balances via viem on Base                  |
| `privy/payments.ts`             | x402 payment execution with Privy signer                 |

### Base chain config

```typescript
// api/src/config/chains.ts
import { base } from "viem/chains"

// Base mainnet (chainId: 8453) — used directly from viem/chains
export const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
// ETH native: 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee
```

### Required env vars

```bash
# api/
BASE_RPC_URL=https://mainnet.base.org
PRIVY_APP_ID=...
PRIVY_APP_SECRET=...
SPEND_POLICY_ADDRESS=0x...
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...

# web/
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_PRIVY_APP_ID=...
```

---

## Session workflow

### Start of session

1. Read `AGENTS.md`
2. Read `.context/MEMORY.md` — current build state
3. Read `.context/PRD.md` — scope + architecture
4. State what you'll do and any blockers

### End of session

1. Update `.context/MEMORY.md` — what changed, decisions made, what's next, blockers
2. Commit + push

---

## Commit format

```
<type>: <what was built or decided>

- detail

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

Types: `feat` `fix` `contracts` `deploy` `docs` `test`

Commit after every meaningful unit. Deploy commits must include contract address + chain.

---

## Hard rules

1. Every decision gets logged in `.context/MEMORY.md`
2. Every session ends with a commit
3. No mocks, no workarounds — real execution only
4. Do not re-litigate decisions already in `.context/PRD.md` — read and build
5. Build on **Base mainnet** (chainId: 8453)
6. x402 payments on Base with Privy-managed agent wallets
7. Complete at least one Base transaction and capture the tx hash
8. Keep the GitHub repo public

## Solidity rules

- CEI pattern on all external calls — non-negotiable
- Never `tx.origin` for auth — always `msg.sender`
- Custom errors over `require` strings
- Events for every state change
- NatSpec on all public/external functions
- Run security audit before any deployment

## TypeScript rules

- Never use JS `number` for token amounts — use `bigint`
- `Address` type from viem (`0x${string}`) for all addresses
- Always check `receipt.status` after transactions
- Handle wallet disconnection, chain switching, tx revert gracefully

---

## Base + Privy — Integration layer

Privy manages agent wallets (server-side). viem reads balances and interacts with contracts on Base. `@x402/fetch` handles x402 payment flows.

### Provider files (`api/src/providers/privy/`)

| File           | Responsibility                                     |
| -------------- | -------------------------------------------------- |
| `wallet.ts`    | Privy server wallet — create, sign, manage wallets |
| `balance.ts`   | Read USDC/ETH balances via viem on Base             |
| `payments.ts`  | x402 payment execution with Privy signer            |

### Hard rules — ecosystem

- **Agent wallet:** Privy server wallet — API key auth, server-side signing. No browser wallet for agents.
- **Frontend auth:** Privy email login — embedded wallet optional
- **Frontend wallet connect:** wagmi + Privy on Base
- **Payment execution:** `@x402/fetch` with Privy signer on Base — standard gas
- **x402 routing:** `@x402/fetch` client-side; settlement on Base mainnet
- **No auto-swap:** agents must hold sufficient USDC before payment

---

## Tech stack

| Layer               | Technology                                                                          |
| ------------------- | ----------------------------------------------------------------------------------- |
| Chain               | Base mainnet (chainId: 8453)                                                        |
| Agent wallet        | Privy server wallet (API key auth, server-side signing)                              |
| Balance / portfolio | viem `readContract` on Base (USDC + ETH)                                            |
| Payment routing     | x402 (`@x402/fetch` + `@x402/hono`) with Privy signer on Base                       |
| Policy enforcement  | SpendPolicy.sol (Solidity + Foundry)                                                |
| Backend             | Hono + Bun                                                                          |
| Database            | Supabase + Drizzle                                                                  |
| Frontend            | Next.js 16 + Tailwind v4 + shadcn/ui                                                |
| Frontend auth       | Privy email login + embedded wallet                                                  |
| Frontend wallet     | wagmi + Privy on Base                                                                |
