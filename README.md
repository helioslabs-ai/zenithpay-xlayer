<div align="center">

<img src="/zenithpay-banner.png" alt="ZenithPay" width="100%"/>

<br/>

> **Note for judges:** If the OKX Wallet extension shows a phishing warning on `usezenithpay.xyz`, this is a **false positive** — new `.xyz` domains are flagged heuristically. The site is safe. Click **"Continue anyway"** or disable the extension temporarily. A whitelist request has been submitted to OKX Web3 Security.

# ZenithPay

> Your Agent Spends. You Own the Rules.

**The spend governance layer for AI agents — with onchain-enforced policies, gasless x402 payment settlements in USDG, and a full audit trail. Live on X Layer and powered by OKX OnchainOS.**

> **Safety notice:** This repository is an experimental portfolio and hackathon
> project, not a production payment product. Do not deposit funds or connect a
> wallet you care about. Smart contracts, APIs, third-party services, and
> transaction execution can fail and may cause permanent asset loss. Use only
> funds you can afford to lose. This notice is not legal or financial advice
> and does not remove any legal obligations.

<br/>

[![Network](<https://img.shields.io/badge/Network-X%20Layer%20(196)-19191A?style=flat-square&logoColor=white>)](https://www.okx.com/xlayer)
[![Payments](https://img.shields.io/badge/Protocol-x402-FF69B4?style=flat-square&logoColor=white)](https://www.x402.org)
[![USDG Settlement](https://img.shields.io/badge/Settlement-USDG-84cc16?style=flat-square&logoColor=white)](https://www.okx.com/xlayer)
[![OKX OnchainOS](https://img.shields.io/badge/Powered%20by-OKX%20OnchainOS-000000?style=flat-square&logoColor=white)](https://web3.okx.com/onchain-os)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](./LICENSE)

<br/>

[**Live Demo**](https://usezenithpay.xyz) · [**Video Demo**](https://youtu.be/fwr1vvNi7QA) · [**Docs**](https://docs.usezenithpay.xyz) · [**Agent Skill**](https://api.usezenithpay.xyz/skill.md) · [**Contract**](https://www.oklink.com/xlayer/address/0x1250e52B7154E12F66e8E347ce116F463D4E248B) · [**Agent TX**](https://www.oklink.com/x-layer/address/0x726Cf0C4Fe559DB9A32396161694C7b88C60C947/token-transfer)

</div>

---

## Overview

ZenithPay is a **security middleware layer** that sits between AI agents and the services they pay for. It enforces spend rules at the **smart contract level** — limits no API can override and no server outage can remove.

Think of it as a **programmable corporate card policy engine for AI agents**: per-transaction caps, daily budgets, merchant allowlists, and optional approval thresholds, all enforced onchain — with payments settled as **x402 USDG micropayments** via OKX, zero gas on X Layer, and a full audit trail.

---

## The Problem

X Layer is enabling a massive agentic economy. But agents that spend money introduce a new category of risk that no one has solved cleanly:

- **Unrestricted wallet access** → one compromised agent or plugin drains everything
- **Off-chain guardrails** → centralized, bypassable, and subject to downtime
- **Key exposure** → most agent wallets store private keys in APIs or local storage; a single exploit empties the balance

There is no reliable way to **govern how agents spend**, and no **secure key management** that survives a compromised stack.

---

## The Solution

ZenithPay closes this gap with three layers working together:

| Layer                         | What it does                                                                                                |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **TEE Wallet**                | Keys live in a hardware enclave via OKX Agentic Wallet — never exposed, even to the API                     |
| **Onchain Policy Governance** | `SpendPolicy.sol` enforces limits at the contract level — no API call can override it                       |
| **USDG x402 Payments**        | Zero-gas USDG micropayments via OKX Payments API and OKX x402 Facilitator; auto-swap OKB → USDG when needed |

---

## Live Proof

| Description                                          | Chain   | Address / TX Hash                                                                                                      |
| ---------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------- |
| Deployed Agent Address (OKX Agentic Wallet, TEE)     | X Layer | [`0x726Cf0C4...C947`](https://www.oklink.com/xlayer/address/0x726Cf0C4Fe559DB9A32396161694C7b88C60C947)                |
| Deployed Contract (SpendPolicy.sol)                  | X Layer | [`0x1250e52B...248B`](https://www.oklink.com/xlayer/address/0x1250e52B7154E12F66e8E347ce116F463D4E248B)                |
| USDG x402 payment → ZenithPay seller route (`/sell`) | X Layer | [`0xd991b521...`](https://www.oklink.com/xlayer/tx/0xd991b521ff1ce36161d0a35118fc9028946cfbc47773822e4eee5e294b0b7bad) |
| SpendPolicy agent registration                       | X Layer | [`0xf04cc8c1...`](https://www.oklink.com/xlayer/tx/0xf04cc8c1d7d1facf257170a98ad6935b7d0fe825d5bdfbfad443223c5dc99920) |
| SpendPolicy contract deployment                      | X Layer | [`0xf0be30b...`](https://www.oklink.com/xlayer/tx/0xf0be30b27021c475fcdfcb8657f8d392617ebc25454a329af9240df3ded22ae9)  |

---

## How It Works

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            AI Agent                                     │
│       Claude Code · Cursor · Codex · Gemini CLI · Any MCP client       │
│              Agent Wallet: USDG / OKB on X Layer (TEE-secured)          │
└──────────────┬───────────────────────┬──────────────────────┬───────────┘
               │                  MCP Server            REST API
               │                  Agent Skill
               └───────────────────────┴──────────────────────┘
                                        │
                             zenithpay_pay_service()
                                        │
┌───────────────────────────────────────▼─────────────────────────────────┐
│                          ZenithPay API                                  │
│                                                                         │
│   1. Policy Gate ──────────────────────────────────────────────────┐   │
│      Read SpendPolicy.sol → check perTxLimit + dailyBudget          │   │
│      Check merchant allowlist → verify against OKX security scan    │   │
│                                                                     ▼   │
│   2. Decision ─────────────────────────────────────────────────────┐   │
│      APPROVED  → execute immediately                                │   │
│      PENDING   → queue for human review (approvalThreshold hit)     │   │
│      BLOCKED   → reject with reason, log to ledger                  │   │
│                                                                     ▼   │
│   3. Execution ─────────────────────────────────────────────────────┐  │
│      Auto-swap OKB→USDG if needed (OKX DEX, 500+ liquidity sources) │  │
│      Settle via x402 (zero gas on X Layer)                          │  │
│      Emit PaymentExecuted / PaymentBlocked onchain                  │  │
└───────────────────────────┬────────────────────────────────────────┘──┘
                            │
          ┌─────────────────┴──────────────────┐
          │                                    │
┌─────────▼───────────────┐      ┌─────────────▼──────────────────────────┐
│   OKX OnchainOS         │      │   X Layer Mainnet (Chain ID 196)        │
│                         │      │                                         │
│  Agentic Wallet (TEE)   │      │  SpendPolicy.sol                        │
│  DEX Swap API           │      │  ├─ perTxLimit    (onchain enforced)    │
│  Payments API (x402)    │      │  ├─ dailyBudget   (onchain enforced)    │
│  Portfolio API          │      │  ├─ allowlist     (onchain enforced)    │
│  Market API             │      │  └─ approvalThreshold (off-chain gate)  │
│  Token Safety API       │      │                                         │
└─────────────────────────┘      └─────────────────────────────────────────┘
```

### x402 Payment Flow

```
Client (Buyer)                    ZenithPay Seller Route                    OKX Facilitator
      |                                     |                                     |
      |---- GET/POST /sell/agent-intel ---->|                                     |
      |<--- 402 + Payment-Required ---------|                                     |
      |        (USDG amount + payTo)        |                                     |
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
Agent wants to pay api.service.com for $0.10 USDG
        │
        ▼
[1] zenithpay_get_limits       → perTxLimit: $0.25, dailyBudget: $3.00, spent today: $0.40
        │
        ▼
[2] zenithpay_balance          → USDG: $0.06, OKB: 0.8 (≈$0.50 at market)
        │ Insufficient USDG → auto-swap triggered
        ▼
[3] OKX DEX Swap               → OKB → USDG, slippage-protected, zero gas
        │
        ▼
[4] zenithpay_verify_merchant  → OKX security scan passes, merchant allowlisted ✓
        │
        ▼
[5] SpendPolicy.sol check      → $0.10 < $0.25 perTxLimit ✓, daily budget not exceeded ✓
        │
        ▼
[6] x402 settle                → OKX Payments API, zero gas on X Layer
        │
        ▼
[7] PaymentExecuted event      → logged onchain + to ledger
        │
        ▼
Agent receives: { status: "approved", txHash: "0x..." }
```

### Optional Human Approval Queue

When a payment exceeds the `approvalThreshold`, the agent is not blocked — it waits:

```
Agent requests $0.20 payment → above $0.10 approvalThreshold
        │
        ▼
status: "pending" + approvalId returned to agent
        │
        ▼
Human reviews intent, amount, and merchant
        │
        ├── Approve → payment executes immediately via OKX x402
        └── Deny   → payment cancelled, reason logged, agent notified
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

- Conservative → $0.10 per tx / $1.00 daily
- Balanced → $0.50 per tx / $5.00 daily
- Open → $2.00 per tx / $20.00 daily

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

| Step | Action                                                                                   |
| ---- | ---------------------------------------------------------------------------------------- |
| 1    | Agent checks `~/.zenithpay/config.json` — wallet exists? Skip to step 4                  |
| 2    | Agent prompts for email → `POST /wallet/genesis` → OKX TEE wallet created, no key stored |
| 3    | Agent installs MCP server → tools persist across sessions                                |
| 4    | **You:** Open link from agent → connect wallet → set spend limits → sign onchain         |
| 5    | Agent verifies policy is active → ready to spend                                         |

**Agent tool call order at runtime:**

```
zenithpay_get_limits → zenithpay_balance → zenithpay_verify_merchant → zenithpay_pay_service → zenithpay_ledger
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
| `zenithpay_balance`         | USDG + OKB balance + remaining daily budget                     |
| `zenithpay_get_limits`      | Read current onchain spend policy                               |
| `zenithpay_verify_merchant` | OKX security scan + allowlist check before paying               |
| `zenithpay_pay_service`     | Policy-gated x402 payment with auto-swap                        |
| `zenithpay_set_limits`      | Deploy / update onchain spend policy (requires human signature) |
| `zenithpay_ledger`          | Full onchain + internal transaction audit trail                 |

---

## API Reference

All endpoints require `Authorization: Bearer $ZENITHPAY_API_KEY` except `/health`.

| Method | Route                    | Description                                                    |
| ------ | ------------------------ | -------------------------------------------------------------- |
| `GET`  | `/health`                | Health check — no auth required                                |
| `POST` | `/wallet/genesis`        | Create TEE-secured agent wallet via OKX                        |
| `GET`  | `/wallet/balance`        | USDG + OKB balance + remaining daily budget                    |
| `GET`  | `/wallet/agents`         | List all agents under authenticated account                    |
| `POST` | `/pay`                   | Execute policy-gated x402 payment (buyer entry point)          |
| `GET`  | `/sell/agent-intel`      | Seller-side x402 endpoint — returns 402 challenge or paid data |
| `GET`  | `/limits`                | Read current spend policy for agent(s)                         |
| `POST` | `/limits`                | Deploy / update spend policy — requires human EOA signature    |
| `GET`  | `/ledger`                | Full transaction audit trail                                   |
| `GET`  | `/approvals`             | Pending payments awaiting human review                         |
| `POST` | `/approvals/:id/approve` | Approve pending payment — executes immediately                 |
| `POST` | `/approvals/:id/deny`    | Deny pending payment — cancels and logs                        |

**`POST /pay` responses:** `approved` (txHash) · `pending` (approvalId) · `blocked` (reason)

Full schemas → [docs.usezenithpay.xyz](https://docs.usezenithpay.xyz)

---

## OKX OnchainOS Integration

| Capability                | OnchainOS API                                    |
| ------------------------- | ------------------------------------------------ |
| Agent wallet creation     | Agentic Wallet — TEE, email OTP, gas-free        |
| Balance queries           | Wallet Check Balance API                         |
| x402 payments             | Payments API — `/api/v6/x402/verify` + `/settle` |
| Auto-swap OKB → USDG      | DEX Swap API — 500+ liquidity sources            |
| Tx simulation + broadcast | Wallet Transaction API                           |
| Market + price data       | Market API                                       |
| Token safety checks       | Token API                                        |
| Merchant security scan    | Agentic Wallet — `security_dapp_scan`            |

---

## Tech Stack

| Layer            | Technology                                                                       |
| ---------------- | -------------------------------------------------------------------------------- |
| Frontend         | Next.js 16, Tailwind v4, shadcn/ui, Motion                                       |
| Backend API      | Bun, Hono                                                                        |
| Database         | PostgreSQL, Supabase, Drizzle ORM                                                |
| Wallet Connect   | wagmi, OKX Wallet (EIP-6963)                                                     |
| Smart Contracts  | Solidity, Foundry, OpenZeppelin                                                  |
| Blockchain       | X Layer mainnet (chain ID 196)                                                   |
| Payment Protocol | x402 — OKX Facilitator · Payments API                                            |
| Agent Wallet     | OKX Agentic Wallet (TEE)                                                         |
| Agent Protocol   | MCP (Model Context Protocol)                                                     |
| OKX OnchainOS    | Wallet API · Portfolio API · DEX Swap · Onchain Gateway · Market API · Token API |
| Web Deploy       | Vercel                                                                           |
| API Deploy       | Railway                                                                          |

---

## Setup

**Prerequisites:** [Bun](https://bun.sh) · [Foundry](https://getfoundry.sh) · [OKX API key](https://web3.okx.com/onchain-os/dev-portal) · [Supabase](https://supabase.com) project

### 1. Clone and install

```bash
git clone https://github.com/zenith-hq/zenithpay-xlayer.git
cd zenithpay-xlayer
bun install
```

### 2. Configure environment

```bash
cp api/.env.example api/.env
cp web/.env.example web/.env.local
```

`api/.env`:

```bash
XLAYER_RPC_URL=https://rpc.xlayer.tech
OKX_API_KEY=...                    # web3.okx.com/onchain-os/dev-portal
OKX_SECRET_KEY=...
OKX_PASSPHRASE=...
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
SPEND_POLICY_ADDRESS=0x...         # fill after step 3
ZENITHPAY_API_KEY_SECRET=...
```

`contracts/.env`:

```bash
DEPLOYER_PRIVATE_KEY=0x...
XLAYER_RPC_URL=https://rpc.xlayer.tech
```

`web/.env.local`:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001
SPEND_POLICY_ADDRESS=0x...
```

### 3. Deploy contracts to X Layer

```bash
cd contracts
forge build && forge test
forge script script/Deploy.s.sol --rpc-url $XLAYER_RPC_URL --broadcast --slow
```

Copy the deployed address → `SPEND_POLICY_ADDRESS` in `api/.env`, then:

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
| `api/`  | [Railway](https://railway.app) | Root: `api/` · CNAME `api` → Railway URL |
| `web/`  | [Vercel](https://vercel.com)   | Root: `web/` · auto-deploys on push      |
| `docs/` | [Vercel](https://vercel.com)   | Root: `docs/` · auto-deploys on push     |

---

## Project Structure

```
zenithpay-xlayer/
│
├── api/                                        # Bun + Hono — REST · MCP · Agent Skill
│   └── src/
│       ├── app.ts                              # Entry — /health · /mcp · /skill.md
│       │
│       ├── providers/onchainos/               # ★ All OKX OnchainOS calls
│       │   ├── agentic-wallet.ts              # ★ OKX Agentic Wallet (TEE) — create + login
│       │   ├── balance.ts                     # ★ OKX Wallet Check Balance API
│       │   ├── swap.ts                        # ★ OKX DEX Swap — OKB→USDG (500+ sources)
│       │   ├── payments.ts                    # ★ OKX Payments API — x402 verify + settle
│       │   ├── gateway.ts                     # ★ OKX Onchain Gateway — simulate + broadcast
│       │   ├── market.ts                      # ★ OKX Market API — prices + portfolio
│       │   └── token.ts                       # ★ OKX Token API — safety + dapp scan
│       │
│       ├── modules/
│       │   ├── payment/payment.service.ts     # Core flow — policy gate → swap → x402 settle
│       │   ├── wallet/wallet.service.ts       # Wallet creation via OKX Agentic Wallet TEE
│       │   ├── limits/limits.service.ts       # SpendPolicy.sol read/write via viem
│       │   ├── approvals/                     # Human review queue — approve · deny
│       │   ├── balance/                       # Balance reads
│       │   └── ledger/                        # Audit trail — every payment logged with intent
│       │
│       ├── routes/
│       │   ├── pay.ts                         # POST /pay — buyer entry point for policy-gated x402
│       │   ├── demo.ts                        # GET /sell/agent-intel — seller-side x402 resource route
│       │   ├── limits.ts                      # GET + POST /limits — policy read/write
│       │   ├── wallet.ts                      # POST /wallet/genesis · GET /wallet/balance · /agents
│       │   ├── ledger.ts                      # GET /ledger — full transaction audit trail
│       │   ├── approvals.ts                   # GET /approvals · POST /approvals/:id/approve|deny
│       │   └── agents.ts                      # POST /agents/link — owner-agent mapping
│       │
│       ├── mcp/
│       │   ├── server.ts                      # MCP server — StreamableHTTPTransport at /mcp
│       │   └── tools/                         # 6 tools: balance · pay · limits · verify · ledger
│       │
│       └── middleware/                        # auth · logger · rate-limit
│
├── contracts/
│   └── src/SpendPolicy.sol                    # ★ Onchain enforcement — PaymentExecuted/Blocked
│
├── skills/
│   └── spend-agent/SKILL.md                   # ★ Agent Skill — curl https://api.usezenithpay.xyz/skill.md
│
├── web/                                        # Next.js 16 — marketing + dashboard
│   ├── lib/
│   │   └── okx-wallet.ts                      # ★ OKX DApp Wallet Connect helpers
│   ├── components/
│   │   ├── providers/web3-provider.tsx         # ★ wagmi config with OKX injected provider
│   │   ├── signin.tsx                          # ★ OKX-only wallet connect + X Layer chain switch
│   │   └── user-dropdown.tsx                   # ★ OKX-only reconnect flow from app shell
│   └── app/
│       ├── onboarding/onboarding-flow.tsx      # ★ OKX-only onboarding + chain enforcement
│       ├── (marketing)/                        # Landing page
│       └── (dashboard)/                        # Wallet · Pay · Limits · Approvals · Ledger
│
└── docs/                                       # Fumadocs — docs.usezenithpay.xyz
```

---

## Roadmap

### Phase 1 — Foundation ✅ _(current, OKX OnchainOS Hackathon)_

- [x] `SpendPolicy.sol` — onchain enforcement, X Layer mainnet
- [x] OKX Agentic Wallet TEE — zero private key exposure
- [x] x402-native payment routing with auto-swap (OKB → USDG)
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

- [OKX OnchainOS](https://web3.okx.com/onchain-os) — agentic infrastructure that makes this possible
- [x402 Protocol](https://www.x402.org) — machine-native micropayments
- [X Layer](https://www.okx.com/xlayer) — the chain powering ZenithPay

---

## Contributing

PRs welcome. Open an issue first for significant changes.

---

## License

MIT
