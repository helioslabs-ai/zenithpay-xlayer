"use client"

import { AnimatePresence, motion } from "motion/react"
import { useState } from "react"
import { cn } from "@/lib/utils"

const TABS = ["SKILL.md", "MCP", "REST API"] as const
type Tab = (typeof TABS)[number]

function Cm({ children }: { children: React.ReactNode }) {
	return <span className="text-black/25 dark:text-white/25">{children}</span>
}
function Kw({ children }: { children: React.ReactNode }) {
	return <span className="text-black/50 dark:text-white/50">{children}</span>
}
function Str({ children }: { children: React.ReactNode }) {
	return <span className="text-black/65 dark:text-white/65">{children}</span>
}
function Val({ children }: { children: React.ReactNode }) {
	return <span className="text-black/85 dark:text-white/85">{children}</span>
}
function Dim({ children }: { children: React.ReactNode }) {
	return <span className="text-black/40 dark:text-white/40">{children}</span>
}
function Acc({ children }: { children: React.ReactNode }) {
	return <span style={{ color: "var(--brand-accent)", opacity: 0.85 }}>{children}</span>
}

const CODE: Record<Tab, React.ReactNode> = {
	"SKILL.md": (
		<div className="font-mono text-[11px] leading-[1.85]">
			<div>
				<Cm>{"// Paste into your agent window — agent reads and follows instructions"}</Cm>
			</div>
			<div className="mt-1 flex items-start gap-1.5">
				<Dim>$</Dim>
				<Val>curl -s https://api.usezenithpay.xyz/skill.md</Val>
			</div>
			<div className="mt-2">
				<Acc> → ZenithPay skill loaded · 6 tools ready</Acc>
			</div>
			<div className="mt-4 border-t border-black/8 dark:border-white/8 pt-3">
				<Cm>{"// Agent follows onboarding automatically:"}</Cm>
				<div className="mt-1">
					<Dim>1.</Dim>
					<Cm>{" POST /wallet/genesis  "}</Cm>
					<Dim>→ TEE wallet + API key</Dim>
				</div>
				<div>
					<Dim>2.</Dim>
					<Cm>{" Open onboarding link  "}</Cm>
					<Dim>→ set spend policy onchain</Dim>
				</div>
				<div>
					<Dim>3.</Dim>
					<Cm>{" GET /limits           "}</Cm>
					<Dim>→ verify policy is active</Dim>
				</div>
				<div>
					<Dim>4.</Dim>
					<Cm>{" POST /pay             "}</Cm>
					<Dim>→ policy-gated x402 payment</Dim>
				</div>
			</div>
			<div className="mt-4 border-t border-black/8 dark:border-white/8 pt-3">
				<Cm>{"// Works with any agent — not just terminals:"}</Cm>
				<div className="mt-1 flex flex-wrap gap-x-3">
					<Val>Claude Code</Val>
					<Dim>·</Dim>
					<Val>Cursor</Val>
					<Dim>·</Dim>
					<Val>Gemini CLI</Val>
					<Dim>·</Dim>
					<Val>Codex</Val>
					<Dim>·</Dim>
					<Val>Telegram bots</Val>
					<Dim>·</Dim>
					<Val>n8n</Val>
				</div>
			</div>
		</div>
	),

	MCP: (
		<div className="font-mono text-[11px] leading-[1.85]">
			<div>
				<Cm>{"// .claude/settings.json — add ZenithPay MCP server"}</Cm>
			</div>
			<div className="mt-1">
				<Val>{"{"}</Val>
			</div>
			<div className="pl-4">
				<Str>"mcpServers"</Str>
				<Dim>: {"{"}</Dim>
			</div>
			<div className="pl-8">
				<Str>"zenithpay"</Str>
				<Dim>: {"{"}</Dim>
			</div>
			<div className="pl-12">
				<Str>"url"</Str>
				<Dim>: </Dim>
				<Str>"https://api.usezenithpay.xyz/mcp"</Str>
				<Dim>,</Dim>
			</div>
			<div className="pl-12">
				<Str>"headers"</Str>
				<Dim>: {"{"}</Dim>
			</div>
			<div className="pl-16">
				<Str>"Authorization"</Str>
				<Dim>: </Dim>
				<Str>"Bearer zpk_..."</Str>
			</div>
			<div className="pl-12">
				<Dim>{"}"}</Dim>
			</div>
			<div className="pl-8">
				<Dim>{"}"}</Dim>
			</div>
			<div className="pl-4">
				<Dim>{"}"}</Dim>
			</div>
			<div>
				<Val>{"}"}</Val>
			</div>
			<div className="mt-4 border-t border-black/8 dark:border-white/8 pt-3">
				<Cm>{"// 6 tools exposed to your agent:"}</Cm>
				<div className="mt-1">
				<Acc>zenithpay_balance</Acc>
				<Cm>{"        · USDC + ETH + remaining budget"}</Cm>
				</div>
				<div>
					<Acc>zenithpay_pay_service</Acc>
					<Cm>{"    · policy-gated x402 payment"}</Cm>
				</div>
				<div>
					<Acc>zenithpay_get_limits</Acc>
					<Cm>{"    · read onchain spend policy"}</Cm>
				</div>
				<div>
					<Acc>zenithpay_set_limits</Acc>
					<Cm>{"    · set per-tx cap + daily budget"}</Cm>
				</div>
				<div>
				<Acc>zenithpay_verify_merchant</Acc>
				<Cm>{"· security scan + allowlist"}</Cm>
				</div>
				<div>
					<Acc>zenithpay_ledger</Acc>
					<Cm>{"         · full audit trail"}</Cm>
				</div>
			</div>
		</div>
	),

	"REST API": (
		<div className="font-mono text-[11px] leading-[1.85]">
			<div>
				<Cm>{"// POST /pay — policy check runs before any funds move"}</Cm>
			</div>
			<div className="mt-1">
				<Kw>const </Kw>
				<Val>res </Val>
				<Kw>= </Kw>
				<Kw>await </Kw>
				<Val>fetch</Val>
				<Dim>(</Dim>
			</div>
			<div className="pl-4">
				<Str>"https://api.usezenithpay.xyz/pay"</Str>
				<Dim>,</Dim>
			</div>
			<div className="pl-4">
				<Dim>{"{"}</Dim>
			</div>
			<div className="pl-8">
				<Dim>method: </Dim>
				<Str>"POST"</Str>
				<Dim>,</Dim>
			</div>
			<div className="pl-8">
				<Dim>{"headers: { "}</Dim>
				<Str>"Authorization"</Str>
				<Dim>{": "}</Dim>
				<Str>"Bearer zpk_..."</Str>
				<Dim>{" },"}</Dim>
			</div>
			<div className="pl-8">
				<Dim>body: </Dim>
				<Val>JSON.stringify</Val>
				<Dim>{"({"}</Dim>
			</div>
			<div className="pl-12">
				<Dim>agentAddress: </Dim>
				<Str>"0x726Cf0C4...C947"</Str>
				<Dim>,</Dim>
			</div>
			<div className="pl-12">
				<Dim>serviceUrl: </Dim>
				<Str>"https://stableenrich.dev/search"</Str>
				<Dim>,</Dim>
			</div>
			<div className="pl-12">
				<Dim>maxAmount: </Dim>
				<Str>"0.05"</Str>
				<Dim>,</Dim>
			</div>
			<div className="pl-12">
			<Dim>intent: </Dim>
			<Str>"Research DeFi trends on Base"</Str>
				<Dim>,</Dim>
			</div>
			<div className="pl-8">
				<Dim>{"}),"}</Dim>
			</div>
			<div className="pl-4">
				<Dim>{"}"}</Dim>
			</div>
			<div>
				<Dim>{")"}</Dim>
				<Val>;</Val>
			</div>
			<div className="mt-4 border-t border-black/8 dark:border-white/8 pt-3">
				<div>
					<Cm>{"// 200 "}</Cm>
					<Acc>approved</Acc>
					<Dim>{"  · txHash on Base"}</Dim>
				</div>
				<div>
					<Cm>{"// 202 "}</Cm>
					<Acc>pending</Acc>
					<Dim>{"   · queued for human approval"}</Dim>
				</div>
				<div>
					<Cm>{"// 403 "}</Cm>
					<Acc>blocked</Acc>
					<Dim>{"   · daily budget exceeded"}</Dim>
				</div>
				<div>
					<Cm>{"// 402 "}</Cm>
					<Dim>{"            · x402 payment upstream"}</Dim>
				</div>
			</div>
		</div>
	),
}

const TAB_DESCRIPTIONS: Record<Tab, string> = {
	"SKILL.md":
		"One curl command in your terminal. The agent reads SKILL.md, follows the onboarding steps automatically — creates a TEE wallet, guides policy activation onchain, then pays with full enforcement.",
	MCP: "Register ZenithPay as an MCP server. Your agent gets 6 tools — balance check, policy-gated x402 payment, spend limit read/write, merchant verification, and full audit trail.",
	"REST API":
		"Call ZenithPay directly over HTTP. Every payment request hits the onchain SpendPolicy contract before any funds move. Responses include txHash on Base.",
}

export function IntegrationsSection() {
	const [activeTab, setActiveTab] = useState<Tab>("SKILL.md")

	return (
		<section id="integrations" className="mx-auto w-full max-w-7xl border-x border-t">
			<div className="px-5 py-16 sm:px-8 lg:px-12">
				<div className="mb-12">
					<span className="text-xs uppercase tracking-[0.2em] text-brand-accent font-mono">
						[03] Integrations
					</span>
					<h2 className="mt-3 text-[28px] sm:text-[36px] font-bold tracking-tight leading-[1.05]">
						Secure your agent in minutes.
					</h2>
				</div>

				<div className="flex flex-col lg:flex-row lg:gap-12 xl:gap-16 overflow-hidden">
					{/* Left: description + tabs + works with */}
					<div className="mb-10 lg:mb-0 lg:w-[300px] xl:w-[340px] lg:shrink-0">
						<AnimatePresence mode="wait">
							<motion.p
								key={activeTab}
								initial={{ opacity: 0, y: 4 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -4 }}
								transition={{ duration: 0.2 }}
								className="text-sm text-muted-foreground leading-relaxed"
							>
								{TAB_DESCRIPTIONS[activeTab]}
							</motion.p>
						</AnimatePresence>

						{/* Tab buttons */}
						<div className="mt-8 flex flex-col gap-px bg-border border border-border">
							{TABS.map((tab) => (
								<button
									key={tab}
									type="button"
									onClick={() => setActiveTab(tab)}
									className={cn(
										"flex items-center justify-between px-4 py-3.5 text-left bg-background transition-colors duration-150 cursor-pointer group",
										activeTab === tab
											? "text-brand-accent"
											: "text-muted-foreground hover:text-foreground"
									)}
								>
									<span className="font-mono text-xs tracking-[0.15em]">
										{tab === "SKILL.md" ? (
											<>
												<span className="uppercase">SKILL</span>.md
											</>
										) : tab === "REST API" ? (
											<>REST API</>
										) : (
											<span className="uppercase">{tab}</span>
										)}
									</span>
									<span
										className={cn(
											"size-1.5 rounded-full transition-all duration-200",
											activeTab === tab
												? "bg-brand-accent"
												: "bg-border group-hover:bg-muted-foreground"
										)}
									/>
								</button>
							))}
						</div>

						{/* Works with */}
						<div className="mt-6">
							<span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 font-mono">
								Works with
							</span>
							<div className="mt-2.5 flex flex-wrap gap-1.5">
								{[
									{ name: "Claude Code", logo: "/agents/claudecode-color.png" },
									{ name: "OpenClaw", logo: "/agents/openclaw-color.png" },
									{ name: "Codex", logo: "/agents/codex-color.png" },
									{ name: "Claude Desktop", logo: "/agents/claude-color.png" },
									{ name: "Cursor", logo: "/agents/cursor.png" },
									{ name: "Gemini CLI", logo: "/agents/gemini-color.svg" },
								].map(({ name, logo }) => (
									<span
										key={name}
										className="flex items-center gap-1.5 font-mono text-[10px] px-2 py-1 border border-border text-muted-foreground/70 bg-background"
									>
										{logo && (
											// eslint-disable-next-line @next/next/no-img-element
											<img
												src={logo}
												alt={name}
												width={12}
												height={12}
												className="size-3 object-contain opacity-70"
												onError={(e) => {
													e.currentTarget.style.display = "none"
												}}
											/>
										)}
										{name}
									</span>
								))}
							</div>
						</div>
					</div>

					{/* Right: code panel */}
					<div className="relative flex-1 min-w-0 overflow-hidden">
						<div className="border border-border overflow-hidden">
							<div className="relative flex items-center px-3 h-8 border-b border-border bg-zinc-100 dark:bg-zinc-900">
								<div className="flex items-center gap-1.5">
									<span className="size-2 rounded-full bg-foreground/15" />
									<span className="size-2 rounded-full bg-foreground/15" />
									<span className="size-2 rounded-full bg-foreground/15" />
								</div>
								<span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-muted-foreground/40 pointer-events-none tracking-wide">
									{activeTab === "SKILL.md"
										? "api.usezenithpay.xyz/skill.md"
										: activeTab === "MCP"
											? ".claude/settings.json"
											: "zenithpay-pay.ts"}
								</span>
							</div>

							<div className="bg-zinc-50 dark:bg-[#0d0d0d] px-5 py-5 min-h-[320px]">
								<AnimatePresence mode="wait">
									<motion.div
										key={activeTab}
										initial={{ opacity: 0, y: 6 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0, y: -6 }}
										transition={{ duration: 0.2, ease: "easeOut" }}
									>
										{CODE[activeTab]}
									</motion.div>
								</AnimatePresence>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}
