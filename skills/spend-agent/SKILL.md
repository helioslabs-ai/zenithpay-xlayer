---
name: spend-agent
description: >
  Use this skill when an agent needs to make payments, check wallet balance,
  verify merchants, set or read spending limits, query transaction history,
  review pending approvals, or interact with any x402-compatible service on
  Base. Also trigger on: setup ZenithPay, create agent wallet, onboard,
  first time setup, I don't have a wallet, zenithpay setup, activate agent.
  Trigger on: pay for service, execute payment, check balance, check funds,
  verify merchant, set limits, update policy, spending policy, view ledger,
  audit trail, approve payment, deny payment, x402 payment, USDC payment,
  agent wallet, spend policy, daily budget, per-transaction limit, merchant
  allowlist, approval threshold, ZenithPay, zenithpay_pay_service,
  zenithpay_balance, zenithpay_get_limits, zenithpay_set_limits,
  zenithpay_verify_merchant, zenithpay_ledger. Security middleware for AI
  agents that spend money — policy-enforced x402 payments on Base via
  ZenithPay. Do NOT use for non-payment tasks.
user-invocable: true
metadata:
  author: zenithpay
  version: "2.0.0"
  homepage: "https://usezenithpay.xyz"
---

# ZenithPay — Spend Agent Skill

> **You are an AI agent. Read this skill file fully before doing anything else.**

Security middleware for AI agents that spend money. Policy-enforced x402 payments on Base. Wallet managed by Privy — private key never on your machine.

**Base URL:** `https://api.usezenithpay.xyz`

---

## Onboarding

Run this check at the start of every session.

### Step 1 — Check for existing config

```bash
cat ~/.zenithpay/config.json 2>/dev/null
```

If the file exists and contains both `agentAddress` and `apiKey` — skip to **[Install MCP](#install-mcp)**.

If missing — continue to Step 2.

### Step 2 — Create agent wallet

Ask the user for their email and a name for this agent:

```
To create your ZenithPay agent wallet, I need two things:

1. Your email address — used to identify your account
2. A name for this agent — e.g. "research-agent", "shopping-bot", "my-assistant"

No private key will be stored on your machine. The wallet is managed by Privy.
```

Once the user provides both, call:

```bash
curl -s -X POST https://api.usezenithpay.xyz/wallet/genesis \
  -H "Content-Type: application/json" \
  -d '{"email": "<user-email>", "label": "<agent-name>"}'
```

On success you receive `{ agentAddress, apiKey, label, createdAt, message }`.

### Step 3 — Store config locally

```bash
mkdir -p ~/.zenithpay
cat > ~/.zenithpay/config.json << EOF
{
  "agentAddress": "<agentAddress from response>",
  "apiKey": "<apiKey from response>",
  "label": "<label from response>",
  "createdAt": "<createdAt from response>"
}
EOF
```

Tell the user:

```
Agent wallet created: <agentAddress>
API key saved to ~/.zenithpay/config.json — keep this file safe, treat it like a password.

No private key is stored — your wallet is managed by Privy infrastructure.
```

### Step 4 — Install MCP (persistent tools) {#install-mcp}

Read credentials from config:

```bash
AGENT_ADDRESS=$(cat ~/.zenithpay/config.json | grep agentAddress | cut -d'"' -f4)
ZENITHPAY_API_KEY=$(cat ~/.zenithpay/config.json | grep apiKey | cut -d'"' -f4)
```

Register ZenithPay as an MCP server so tools persist across all future sessions.

**Claude Code — run this now:**

```bash
claude mcp add --transport http --scope user \
  --header "Authorization: Bearer $ZENITHPAY_API_KEY" \
  --header "X-Agent-Address: $AGENT_ADDRESS" \
  zenithpay https://api.usezenithpay.xyz/mcp
```

**Cursor / Windsurf / Claude Desktop — add to your MCP config file:**

```json
{
  "mcpServers": {
    "zenithpay": {
      "type": "http",
      "url": "https://api.usezenithpay.xyz/mcp",
      "headers": {
        "Authorization": "Bearer <apiKey>",
        "X-Agent-Address": "<agentAddress>"
      }
    }
  }
}
```

Config file locations:
- Claude Desktop: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Cursor: `.cursor/mcp.json` in your project, or `~/.cursor/mcp.json` globally
- Windsurf: `~/.codeium/windsurf/mcp_config.json`

**Gemini CLI — add to `~/.gemini/settings.json`:**

```json
{
  "mcpServers": {
    "zenithpay": {
      "httpUrl": "https://api.usezenithpay.xyz/mcp",
      "headers": {
        "Authorization": "Bearer <apiKey>",
        "X-Agent-Address": "<agentAddress>"
      }
    }
  }
}
```

**OpenAI Agents SDK / Codex:**

```python
from agents.mcp import MCPServerHTTP

zenithpay = MCPServerHTTP(
    url="https://api.usezenithpay.xyz/mcp",
    headers={
        "Authorization": "Bearer <apiKey>",
        "X-Agent-Address": "<agentAddress>"
    }
)
```

After adding the config, tell the user:

```
ZenithPay MCP server registered.

The 6 payment tools will appear natively after you restart your agent session.
Before restarting, complete Step 5 below to activate your spend policy.
```

### Step 5 — Activate policy (human must do this)

The agent wallet exists but cannot spend yet. A human must set the spend policy onchain.

Tell the user:

```
This agent cannot spend yet.

A human must activate it by setting a spend policy.
Open this link in your browser:

-> https://usezenithpay.xyz/onboarding?agent=<agentAddress>

Steps:
1. Connect your wallet (via Privy)
2. Set spend limits (or choose a preset)
3. Sign the transaction onchain
4. Return here when done

This ensures you remain in control of how the agent uses funds.
The policy is enforced by a smart contract on Base — ZenithPay cannot override it.
```

Wait for the user to confirm they have completed the dashboard step.

### Step 6 — Verify policy is active

```bash
ZENITHPAY_API_KEY=$(cat ~/.zenithpay/config.json | grep apiKey | cut -d'"' -f4)
AGENT_ADDRESS=$(cat ~/.zenithpay/config.json | grep agentAddress | cut -d'"' -f4)

curl -s "https://api.usezenithpay.xyz/limits?address=$AGENT_ADDRESS" \
  -H "Authorization: Bearer $ZENITHPAY_API_KEY"
```

If `perTxLimit` and `dailyBudget` are non-zero — policy is active. Tell the user:

```
Policy detected. Agent is ready to spend.

Limits:
- Per transaction: $<perTxLimit>
- Daily budget: $<dailyBudget>
- Remaining today: $<remainingDailyBudget>
```

If policy is still zero — ask the user to complete the dashboard step and try again.

### Setup complete

```
ZenithPay setup complete.

Summary:
- Agent wallet: <agentAddress>
- Config: ~/.zenithpay/config.json
- MCP server: registered (restart agent to activate tools)
- Policy: active on Base

Restart your agent session. The zenithpay_* tools will appear natively.
```

---

## Runtime — after restart

Once MCP tools are available, run this at the start of every session that involves spending:

```
1. zenithpay_get_limits()       -> understand your policy before any spend
2. zenithpay_balance()          -> confirm funds are available
3. zenithpay_verify_merchant()  -> safety check the merchant before paying
4. zenithpay_pay_service()      -> execute the payment
5. zenithpay_ledger()           -> review audit trail at end of session
```

---

## Tools

### zenithpay_get_limits

Call this first at the start of every session. Reads the agent's current onchain spend policy.

```
GET /limits?address=${AGENT_ADDRESS}
Authorization: Bearer ${ZENITHPAY_API_KEY}
```

Returns: `perTxLimit`, `dailyBudget`, `remainingDailyBudget`, `allowlist`, `approvalThreshold`, `policyContract`

If `remainingDailyBudget` is less than your intended spend, do not proceed. Tell the user the budget is exhausted.

---

### zenithpay_balance

Check wallet funds before spending. Call after `zenithpay_get_limits`.

```
GET /wallet/balance?address=${AGENT_ADDRESS}
Authorization: Bearer ${ZENITHPAY_API_KEY}
```

Returns: `USDC` balance, `ETH` balance, `remainingDailyBudget`

If USDC balance is insufficient to cover the payment, do not proceed. Tell the user to fund the agent wallet with USDC on Base.

---

### zenithpay_verify_merchant

Run this before paying any merchant you have not paid before. Checks the agent's allowlist.

```
POST /verify-merchant
Authorization: Bearer ${ZENITHPAY_API_KEY}
{ "merchantUrl": "https://service.xyz/api" }
```

Returns: `safe` (boolean), `allowlisted` (boolean), `riskLevel`, `scanResult`, `warning` (if any)

If `safe: false` — do not proceed. Report the warning to the user and stop.
If `allowlisted: false` and the agent policy has an allowlist set — the payment will be blocked onchain regardless. Tell the user to add the merchant via the dashboard before retrying.

---

### zenithpay_pay_service

Execute a policy-gated x402 payment. The onchain SpendPolicy contract is checked before any money moves.

```
POST /pay
Authorization: Bearer ${ZENITHPAY_API_KEY}
{
  "agentAddress": "${AGENT_ADDRESS}",
  "serviceUrl": "https://api.usezenithpay.xyz/sell/agent-intel",
  "maxAmount": "0.01",
  "intent": "Fetch live Base DeFi intelligence"
}
```

The `intent` field is required. It must be a human-readable description of why the agent is spending. It is logged onchain permanently.

**Responses:**

`status: "approved"` — payment settled onchain. `txHash` is included. Report the txHash to the user.

`status: "pending"` — payment exceeded the `approvalThreshold`. It is queued for human review at `GET /approvals`. Tell the user a payment is waiting for their approval. Do not retry.

`status: "blocked"` — policy violation. The `reason` field explains why. Report the reason and do not retry the same payment.

Block reasons:
- `per_tx_limit_exceeded` — amount is above the per-transaction cap. Reduce `maxAmount`.
- `daily_budget_exceeded` — agent has spent its daily budget. Wait for reset or ask human to raise the limit.
- `merchant_not_allowlisted` — this merchant is not on the agent's allowlist. Ask human to add it.
- `insufficient_balance` — not enough USDC to cover the payment.
- `payment_failed` — x402 settlement failed after policy cleared. Try again.

---

### zenithpay_set_limits

Update the agent's spend policy onchain. This requires a human EOA signature — the agent cannot change its own limits.

```
POST /limits
Authorization: Bearer ${ZENITHPAY_API_KEY}
{
  "agentAddress": "${AGENT_ADDRESS}",
  "perTxLimit": "0.25",
  "dailyBudget": "3.00",
  "allowlist": ["exa.ai", "firecrawl.dev"],
  "approvalThreshold": "0.10",
  "humanSignature": "0x..."
}
```

Returns: `status: "deployed"`, `policyContract`, `txHash`

---

### zenithpay_ledger

Query the agent's full transaction audit trail. Call at the end of every session.

```
GET /ledger?address=${AGENT_ADDRESS}&limit=20&status=approved
Authorization: Bearer ${ZENITHPAY_API_KEY}
```

Optional query params: `limit` (default 20, max 200), `offset`, `status` (`approved`, `blocked`, `pending`, `denied`)

Returns: array of transactions with `merchant`, `amount`, `intent`, `status`, `txHash`, `timestamp`

---

## Approval queue

If a payment returns `status: "pending"`, it is waiting in the human's approval queue. The agent cannot approve its own payments — this is by design.

```
GET /approvals
Authorization: Bearer ${ZENITHPAY_API_KEY}
```

To approve: `POST /approvals/:id/approve`
To deny: `POST /approvals/:id/deny`

---

## Rules

- Never call `zenithpay_pay_service` without first calling `zenithpay_get_limits` and `zenithpay_balance`
- Never call `zenithpay_pay_service` on a new merchant without first calling `zenithpay_verify_merchant`
- Always include a meaningful `intent` string — vague intents like "buy stuff" are not acceptable
- Never retry a blocked payment — report the reason and stop
- Never retry a pending payment — it is waiting for human review
- Never attempt to set limits without an explicit human request and signature

---

## API Reference

Full endpoint documentation with all request schemas and response shapes:
`https://api.usezenithpay.xyz/references/api_docs.md`
