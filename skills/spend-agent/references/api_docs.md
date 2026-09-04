# ZenithPay API Reference

**Base URL:** `https://api.usezenithpay.xyz`

**Auth:** `Authorization: Bearer $ZENITHPAY_API_KEY` (your `zpk_...` key from `~/.zenithpay/config.json`)

| Endpoint                      | Auth required                                      |
| ----------------------------- | -------------------------------------------------- |
| `POST /wallet/genesis`        | None — public (no key exists yet)                  |
| `POST /agents/link`           | None — public                                      |
| `POST /limits`                | None — authorized via `humanSignature` in body     |
| `GET /limits`                 | None — public read                                 |
| `GET /wallet/balance`         | None — public read                                 |
| `GET /wallet/agents`          | None — public read (pass `X-Owner-Address` header) |
| `GET /ledger`                 | None — public read                                 |
| `GET /approvals`              | None — public read                                 |
| `POST /pay`                   | Bearer `zpk_...` required                          |
| `GET/POST /sell/agent-intel`  | x402 (`X-Payment` header)                          |
| `POST /approvals/:id/approve` | None — authorized via `humanSignature` in body     |
| `POST /approvals/:id/deny`    | None — authorized via `humanSignature` in body     |

---

## Endpoints

### GET /health

Health check. No auth required.

```json
{ "status": "ok", "service": "zenithpay-api", "version": "1.0.0", "timestamp": "..." }
```

---

### GET /skill.md

Serves this skill file. No auth required. Agents curl this to get ZenithPay tools.

```bash
curl -s https://api.usezenithpay.xyz/skill.md
```

---

### MCP server

Available at `https://api.usezenithpay.xyz/mcp` via StreamableHTTP transport. Exposes all 6 agent tools. Not consumable from a browser — requires an MCP-compatible client.

MCP config:

```json
{
	"mcpServers": {
		"zenithpay": {
			"type": "http",
			"url": "https://api.usezenithpay.xyz/mcp",
			"headers": {
				"Authorization": "Bearer zpk_...",
				"X-Agent-Address": "0x..."
			}
		}
	}
}
```

---

### POST /wallet/genesis

Create a Privy-managed agent wallet. Private key is managed server-side by Privy. Public — no auth required.

**Request**

```json
{ "email": "agent@domain.com", "label": "research-agent-01" }
```

**Response**

```json
{
	"agentAddress": "0x...",
	"apiKey": "zpk_...",
	"label": "research-agent-01",
	"createdAt": "2026-01-01T00:00:00Z",
	"message": "Wallet created. Activate at https://usezenithpay.xyz/onboarding?agent=0x..."
}
```

Idempotent — calling again with the same account returns the existing agent and API key.

---

### POST /agents/link

Link an unlinked agent to a human EOA. Public — no auth required.

Can only succeed when `owner_eoa` is the zero address (prevents hijacking). Once linked, the owner is immutable — only revocable via SpendPolicy.sol.

**Request**

```json
{ "agentAddress": "0x...", "ownerAddress": "0x..." }
```

**Response**

```json
{ "agentAddress": "0x...", "ownerAddress": "0x..." }
```

**Errors**

- `409` — agent already linked to an owner
- `404` — agent not found

---

### GET /wallet/balance

Get USDC + ETH balance and remaining daily budget. Public read — no auth required.

**Query params:** `address` (optional — filters to specific agent)

**Response**

```json
{
	"agents": [
		{
			"agentAddress": "0x...",
			"usdcBalance": "12.50",
			"ethBalance": "0.01",
			"remainingDailyBudget": "1.75"
		}
	]
}
```

---

### GET /wallet/agents

List all agents owned by an EOA. Public read — pass `X-Owner-Address` header.

**Headers:** `X-Owner-Address: 0x...` (the owner's EOA)

**Response**

```json
{
	"agents": [
		{ "address": "0x...", "label": "research-agent-01" },
		{ "address": "0x...", "label": "billing-agent-02" }
	]
}
```

---

### POST /pay

Execute a policy-gated x402 payment. SpendPolicy.sol is checked onchain before any money moves.

**Auth:** `Authorization: Bearer zpk_...`

**Request**

```json
{
	"agentAddress": "0x...",
	"serviceUrl": "https://service.xyz/api",
	"maxAmount": "0.25",
	"intent": "Research DeFi trends on Base"
}
```

**Response — approved**

```json
{
	"status": "approved",
	"txHash": "0x...",
	"amount": "0.10",
	"currency": "USDC",
	"merchant": "service.xyz",
	"remainingDailyBudget": "1.65",
	"settledAt": "2026-01-01T00:00:00Z"
}
```

**Response — pending (above approvalThreshold)**

```json
{
	"status": "pending",
	"approvalId": "apr_01abc",
	"amount": "0.50",
	"merchant": "service.xyz",
	"intent": "Research DeFi trends",
	"message": "Payment exceeds approval threshold. Awaiting human review at GET /approvals."
}
```

**Response — blocked**

```json
{
	"status": "blocked",
	"reason": "daily_budget_exceeded",
	"amount": "0.10",
	"merchant": "service.xyz",
	"onchainEvent": "PaymentBlocked"
}
```

**Block reasons**

| Reason                     | Description                                |
| -------------------------- | ------------------------------------------ |
| `per_tx_limit_exceeded`    | Amount exceeds per-transaction cap         |
| `daily_budget_exceeded`    | Agent has hit daily spend limit            |
| `merchant_not_allowlisted` | Merchant not in agent's allowlist          |
| `insufficient_balance`     | Insufficient USDC to cover payment         |
| `payment_failed`           | x402 verify or settle failed               |

---

### GET|POST /sell/agent-intel

x402-protected seller route for end-to-end buyer/seller settlement on Base.

- Missing `X-Payment` returns `402 Payment Required` with `Payment-Required` header.
- Valid `X-Payment` triggers verify + settle via x402, then returns paid resource.

**URL**

```text
https://api.usezenithpay.xyz/sell/agent-intel
```

**Notes**

- No Bearer auth required.
- Demo amount: `0.01 USDC`.

---

### GET /limits

Get current onchain spend policy. Public read — no auth required.

**Query params:** `address` (optional)

**Response**

```json
{
	"agents": [
		{
			"address": "0x...",
			"perTxLimit": "0.25",
			"dailyBudget": "3.00",
			"allowlist": ["exa.ai", "firecrawl.dev"],
			"approvalThreshold": "0.10",
			"policyContract": "0x..."
		}
	]
}
```

---

### POST /limits

Deploy or update the agent's spend policy. Public — authorized via `humanSignature` (no Bearer token needed from browser). Also handles ownership linking atomically if the agent is not yet linked.

**How authorization works:** The server reconstructs the signed message from `agentAddress + perTxLimit + dailyBudget + timestamp`, recovers the signer via ECDSA, and verifies it matches the agent's `owner_eoa`. If `owner_eoa` is the zero address (unlinked), the signer is auto-linked as owner.

**Request**

```json
{
	"agentAddress": "0x...",
	"perTxLimit": "0.25",
	"dailyBudget": "3.00",
	"allowlist": ["exa.ai", "firecrawl.dev"],
	"approvalThreshold": "0.10",
	"humanSignature": "0x...",
	"timestamp": 1711234567890
}
```

`timestamp` is required when calling from a browser (used to verify the signature). Omit when calling via MCP tool directly.

The `humanSignature` must be an EIP-191 personal_sign of:

```json
{ "agentAddress": "0x...", "perTxLimit": "0.25", "dailyBudget": "3.00", "timestamp": 1711234567890 }
```

**Response**

```json
{
	"status": "deployed",
	"policyContract": "0x...",
	"txHash": null,
	"agentAddress": "0x...",
	"apiKey": "zpk_...",
	"perTxLimit": "0.25",
	"dailyBudget": "3.00",
	"allowlist": ["exa.ai", "firecrawl.dev"]
}
```

`apiKey` is returned so the browser can store it in localStorage after onboarding.

**Errors**

- `403` — signer is not the agent's owner
- `404` — agent not found

---

### GET /ledger

Full transaction audit trail. Public read — no auth required.

**Query params:** `agent` (optional), `limit` (default 50, max 200), `offset`, `status` (`approved`, `blocked`, `pending`, `denied`)

**Response**

```json
{
	"transactions": [
		{
			"id": "txn_01abc",
			"agentAddress": "0x...",
			"merchant": "exa.ai",
			"amount": "0.10",
			"currency": "USDC",
			"intent": "Research DeFi trends",
			"status": "approved",
			"txHash": "0x...",
			"createdAt": "2026-01-01T00:00:00Z"
		}
	],
	"total": 1,
	"limit": 50,
	"offset": 0
}
```

---

### GET /approvals

List pending payments awaiting human review. Public read — no auth required.

**Query params:** `agent` (optional)

**Response**

```json
{
	"approvals": [
		{
			"id": "apr_01abc",
			"agentAddress": "0x...",
			"merchant": "service.xyz",
			"serviceUrl": "https://service.xyz/api",
			"amount": "0.50",
			"intent": "Research DeFi trends",
			"status": "pending",
			"requestedAt": "2026-01-01T00:01:00Z",
			"resolvedAt": null
		}
	]
}
```

---

### POST /approvals/:id/approve

Approve a pending payment. Executes immediately — runs full pay flow (balance check -> x402 settle -> ledger).

Authorized via `humanSignature` — same EIP-191 pattern as `POST /limits`. No Bearer token needed.

**Request**

```json
{
	"humanSignature": "0x...",
	"timestamp": 1711234567890
}
```

The `humanSignature` must be an EIP-191 personal_sign of:

```json
{ "action": "approve", "approvalId": "apr_01abc", "timestamp": 1711234567890 }
```

**Response**

```json
{
	"status": "approved",
	"txHash": "0x...",
	"amount": "0.50",
	"merchant": "service.xyz"
}
```

**Errors**

- `400` — missing humanSignature or timestamp
- `403` — signer is not the agent's owner
- `404` — approval not found
- `409` — approval already resolved

---

### POST /approvals/:id/deny

Deny a pending payment. Cancels and logs to ledger as `denied`.

Authorized via `humanSignature` — same EIP-191 pattern as `POST /limits`. No Bearer token needed.

**Request**

```json
{
	"humanSignature": "0x...",
	"timestamp": 1711234567890
}
```

The `humanSignature` must be an EIP-191 personal_sign of:

```json
{ "action": "deny", "approvalId": "apr_01abc", "timestamp": 1711234567890 }
```

**Response**

```json
{ "status": "denied" }
```

**Errors**

- `400` — missing humanSignature or timestamp
- `403` — signer is not the agent's owner
- `404` — approval not found
- `409` — approval already resolved

---

## Error responses

All errors follow this shape:

```json
{ "error": "unauthorized", "message": "Invalid or missing API key.", "status": 401 }
```

| Status | Error            | Meaning                                        |
| ------ | ---------------- | ---------------------------------------------- |
| 400    | `bad_request`    | Missing or invalid request fields              |
| 401    | `unauthorized`   | Missing or invalid API key                     |
| 403    | `forbidden`      | Signer is not the agent's owner (POST /limits) |
| 404    | `not_found`      | Agent or resource not found                    |
| 409    | `conflict`       | Agent already linked to an owner               |
| 429    | `rate_limited`   | Too many requests — back off and retry         |
| 500    | `internal_error` | Server error                                   |

---

## Deployed contracts

| Contract    | Network                         | Address |
| ----------- | ------------------------------- | ------- |
| SpendPolicy | Base mainnet (chain ID 8453)    | TBD     |

USDC on Base: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
