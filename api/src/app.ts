import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { rateLimiter } from "hono-rate-limiter";
import { mcpServer, registerTools } from "./mcp/server";
import { authMiddleware } from "./middleware/auth";
import { agentsRoute } from "./routes/agents";
import { approvalsRoute } from "./routes/approvals";
import { sell } from "./routes/demo";
import { ledgerRoute } from "./routes/ledger";
import { limits } from "./routes/limits";
import { pay } from "./routes/pay";
import { wallet } from "./routes/wallet";

registerTools();

const ENDPOINT_LIST = [
  "/health",
  "/agents/link",
  "/wallet/genesis",
  "/wallet/balance",
  "/wallet/agents",
  "/pay",
  "/limits",
  "/ledger",
  "/approvals",
  "/mcp",
  "/skill.md",
  "/references/api_docs.md",
  "/sell/agent-intel",
];

const app = new Hono();

// Global middleware — logger first, then CORS, then global rate limit
app.use("*", logger());
app.use("*", cors());
app.use(
  "*",
  rateLimiter({
    windowMs: 60 * 1000,
    limit: 100,
    standardHeaders: "draft-6",
    keyGenerator: (c) => c.req.header("x-forwarded-for") ?? "unknown",
  }),
);

// Public endpoints — no auth
app.get("/health", (c) =>
  c.json({
    status: "ok",
    service: "zenithpay-api",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  }),
);

app.get("/skill.md", async (c) => {
  const res = await fetch(
    "https://raw.githubusercontent.com/zenith-hq/zenithpay-buildx/main/skills/spend-agent/SKILL.md",
  );
  const content = await res.text();
  return c.text(content, 200, {
    "Content-Type": "text/markdown; charset=utf-8",
  });
});

app.get("/references/api_docs.md", async (c) => {
  const res = await fetch(
    "https://raw.githubusercontent.com/zenith-hq/zenithpay-buildx/main/skills/spend-agent/references/api_docs.md",
  );
  const content = await res.text();
  return c.text(content, 200, {
    "Content-Type": "text/markdown; charset=utf-8",
  });
});

// MCP endpoint — stateless transport, new instance per request
app.all("/mcp", async (c) => {
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  await mcpServer.connect(transport);
  const response = await transport.handleRequest(c.req.raw);
  return response;
});

// Stricter rate limit on payment endpoint — 20/min per IP
app.use(
  "/pay",
  rateLimiter({
    windowMs: 60 * 1000,
    limit: 20,
    standardHeaders: "draft-6",
    keyGenerator: (c) => c.req.header("x-forwarded-for") ?? "unknown",
  }),
);

// Protected endpoints — require API key
app.use("/wallet/*", authMiddleware);
app.use("/pay", authMiddleware);
app.use("/pay/*", authMiddleware);
app.use("/limits", authMiddleware);
app.use("/limits/*", authMiddleware);
app.use("/ledger", authMiddleware);
app.use("/ledger/*", authMiddleware);
app.use("/approvals", authMiddleware);
app.use("/approvals/*", authMiddleware);

// Mount routes
app.route("/agents", agentsRoute);
app.route("/wallet", wallet);
app.route("/pay", pay);
app.route("/limits", limits);
app.route("/ledger", ledgerRoute);
app.route("/approvals", approvalsRoute);
// Seller endpoint — x402 is the auth, no API key required
app.route("/sell", sell);

// Global error handler — structured JSON for all unhandled errors
app.onError((err, c) => {
  console.error(`Unhandled error: ${err.message}`);
  return c.json(
    {
      error: "internal_error",
      message:
        process.env.NODE_ENV === "production"
          ? "An unexpected error occurred."
          : err.message,
      status: 500,
    },
    500,
  );
});

// Not found handler — structured JSON for unknown routes
app.notFound((c) =>
  c.json(
    {
      error: "not_found",
      message: `Route ${c.req.method} ${c.req.path} not found.`,
      endpoints: ENDPOINT_LIST,
      status: 404,
    },
    404,
  ),
);

export { app };
