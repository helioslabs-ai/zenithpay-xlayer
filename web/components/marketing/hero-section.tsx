"use client"

import { ArrowRight, ArrowRightIcon, Copy, Check } from "lucide-react"
import { motion } from "motion/react"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { useConnection } from "wagmi"
import { ZenithDither } from "@/components/bg/zenith-dither"
import { LogoMark } from "@/components/logo-mark"
import { TechGrid } from "@/components/tech-grid"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AGENT_QUICK_INSTALL } from "@/lib/agent-quick-install"
import { cn } from "@/lib/utils"

const SKILL_INSTALL = AGENT_QUICK_INSTALL

function HeroBadge() {
	return (
		<Badge
			className="mx-auto border transition-all duration-300 delay-100 flex items-center gap-2 cursor-pointer group [&>svg]:size-0 relative overflow-hidden"
			variant="outline"
			asChild
		>
			<Link href="/dashboard">
				<span className="shine absolute inset-0 bg-linear-to-r from-transparent via-white/60 to-transparent -translate-x-full" />
				<LogoMark className="size-3 animate-[spin_3s_linear_infinite]" />
				<p className="font-light font-pixel-square">Introducing ZenithPay</p>
				<ArrowRight className="-ml-2 size-0 opacity-0 group-hover:opacity-100 group-hover:size-3 group-hover:-ml-1 transition-all duration-300 delay-100" />
			</Link>
		</Badge>
	)
}

function GetStartedButton() {
	const { isConnected } = useConnection()

	return (
		<Button
			asChild
			style={{ background: "var(--brand-accent)", color: "var(--background)" }}
			className="rounded-none cursor-pointer relative overflow-hidden focus-visible:ring-0 h-9 px-4 hover:opacity-90 transition-opacity group"
		>
			<Link href={isConnected ? "/dashboard" : "/signin"}>
				<span className="shine absolute -top-1/2 -left-full h-[200%] w-3/4 skew-x-[-20deg] bg-linear-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
				Get started
				<ArrowRightIcon className="size-4 w-0 opacity-0 group-hover:w-4 group-hover:opacity-100 transition-all duration-200" />
			</Link>
		</Button>
	)
}

function SeeHowItWorksButton() {
	return (
		<div className="relative w-fit group">
			<Button
				asChild
				variant="outline"
				className="rounded-none cursor-pointer relative overflow-hidden focus-visible:ring-0 h-9 px-4 border-dashed"
			>
				<Link href="/dashboard?demo=true">
					<span className="shine absolute -top-1/2 -left-full h-[200%] w-3/4 skew-x-[-20deg] bg-linear-to-r from-transparent via-white/50 to-transparent pointer-events-none" />
					View Demo
					<ArrowRightIcon className="size-4 w-0 opacity-0 group-hover:w-4 group-hover:opacity-100 transition-all duration-200" />
				</Link>
			</Button>
			<span className="absolute h-2 w-2 border-foreground border-b border-r bottom-0 right-0" />
			<span className="absolute h-2 w-2 border-foreground border-b border-l bottom-0 left-0" />
			<span className="absolute h-2 w-2 border-foreground border-t border-r top-0 right-0" />
			<span className="absolute h-2 w-2 border-foreground border-t border-l top-0 left-0" />
		</div>
	)
}

function QuickInstall() {
	const [copied, setCopied] = useState(false)

	function copy() {
		navigator.clipboard.writeText(SKILL_INSTALL).then(() => {
			setCopied(true)
			toast.success("Copied to clipboard", {
				description: "Paste into your agent to install ZenithPay",
				duration: 2500,
			})
			setTimeout(() => setCopied(false), 2500)
		})
	}

	return (
		<div className="w-full max-w-lg border border-border">
			<div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/20">
				<span className="text-[10px] uppercase tracking-[0.18em] font-mono text-muted-foreground/60">
					Quick Install
				</span>
				<button
					type="button"
					onClick={copy}
					className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
				>
					{copied ? (
						<>
							<Check className="size-3" style={{ color: "var(--brand-accent)" }} />
							<span style={{ color: "var(--brand-accent)" }}>Copied!</span>
						</>
					) : (
						<>
							<Copy className="size-3" />
							Copy
						</>
					)}
				</button>
			</div>
			<div className="px-4 py-3 bg-muted/10">
				<code className="text-[12px] font-mono text-foreground/70 break-all whitespace-pre-wrap select-all">
					{SKILL_INSTALL}
				</code>
			</div>
		</div>
	)
}

type TerminalLineType = "comment" | "prompt" | "output" | "success" | "tool" | "gap" | "cursor"

interface TerminalLine {
	id: string
	type: TerminalLineType
	text?: string
}

const TERMINAL_LINES: TerminalLine[] = [
	{ id: "c1", type: "comment", text: "// Any agent · any runtime — works everywhere" },
	{ id: "p1", type: "prompt", text: "curl -s https://api.usezenithpay.xyz/skill.md" },
	{ id: "o1", type: "output", text: "  → ZenithPay loaded · 6 tools ready" },
	{ id: "g1", type: "gap" },
	{ id: "c2", type: "comment", text: "// Agent task: Research DeFi yields on Base" },
	{ id: "g2", type: "gap" },
	{ id: "t1", type: "tool", text: "→ zenithpay_get_limits" },
	{ id: "o2", type: "output", text: "  $0.25/tx · $3.00/day · $2.75 remaining" },
	{ id: "g3", type: "gap" },
	{ id: "t2", type: "tool", text: "→ zenithpay_verify_merchant" },
	{ id: "o3", type: "output", text: "  stableenrich.dev · safe ✓" },
	{ id: "g4", type: "gap" },
	{ id: "t3", type: "tool", text: "→ zenithpay_pay_service" },
	{ id: "o4", type: "output", text: '  $0.05 · "DeFi research on Base"' },
	{ id: "s1", type: "success", text: "✓ Approved · txHash 0x3f2a1b8c…" },
	{ id: "s2", type: "success", text: "✓ Logged on Base · block 9841207" },
	{ id: "cu", type: "cursor" },
]

function AgentDemo() {
	return (
		<motion.div
			initial={{ opacity: 0, y: 24 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
			className="w-full overflow-hidden border border-border sm:max-w-[480px]"
		>
			{/* Window chrome — no title, just dots */}
			<div className="flex items-center px-3 h-8 border-b border-border">
				<div className="flex items-center gap-1.5">
					<span className="size-2 rounded-full bg-foreground/20" />
					<span className="size-2 rounded-full bg-foreground/20" />
					<span className="size-2 rounded-full bg-foreground/20" />
				</div>
			</div>

			{/* Body — light bg by default, dark in dark mode */}
			<div className="bg-zinc-50 dark:bg-[#0d0d0d] px-4 pt-3 pb-5 font-mono min-h-[300px]">
				{TERMINAL_LINES.map((line, i) => {
					if (line.type === "gap") {
						return <div key={line.id} className="h-2" />
					}

					if (line.type === "cursor") {
						return (
							<motion.div
								key={line.id}
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ delay: 0.1 + i * 0.08, duration: 0.15 }}
								className="flex items-center gap-1 mt-1"
							>
								<span className="text-black/40 dark:text-white/50 text-[11px]">
									agent ~
								</span>
								<span className="text-black/30 dark:text-white/30 text-[11px]">
									{" "}
									$
								</span>
								<span className="inline-block w-[7px] h-[13px] bg-black/40 dark:bg-white/50 ml-0.5 animate-pulse" />
							</motion.div>
						)
					}

					return (
						<motion.div
							key={line.id}
							initial={{ opacity: 0, x: -4 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{
								delay: 0.1 + i * 0.08,
								duration: 0.22,
								ease: "easeOut",
							}}
							className={cn("leading-[1.7]", {
								"flex items-start gap-1.5 mt-1": line.type === "prompt",
								"mt-0.5": line.type !== "prompt",
							})}
						>
							{line.type === "comment" && (
								<span className="text-black/25 dark:text-white/20 text-[11px]">
									{line.text}
								</span>
							)}
							{line.type === "prompt" && (
								<>
									<span className="text-black/35 dark:text-white/40 text-[11px] shrink-0 leading-[1.7]">
										$
									</span>
									<span className="text-black/75 dark:text-white/80 text-[11px] break-all">
										{line.text}
									</span>
								</>
							)}
							{line.type === "output" && (
								<span className="text-black/45 dark:text-white/35 text-[11px] pl-2">
									{line.text}
								</span>
							)}
							{line.type === "tool" && (
								<span
									className="text-[11px] pl-2 font-semibold"
									style={{ color: "var(--brand-accent)" }}
								>
									{line.text}
								</span>
							)}
							{line.type === "success" && (
								<span className="text-[11px] pl-2">
									<span style={{ color: "var(--brand-accent)" }}>
										{line.text?.startsWith("✓") ? "✓" : ""}
									</span>
									<span className="text-black/50 dark:text-white/50">
										{line.text?.startsWith("✓")
											? line.text.slice(1)
											: line.text}
									</span>
								</span>
							)}
						</motion.div>
					)
				})}
			</div>
		</motion.div>
	)
}

export function HeroSection() {
	return (
		<section className="relative overflow-hidden mx-auto flex w-full lg:h-(--hero-height) max-w-7xl min-w-0 flex-col border-x md:min-h-0 lg:flex-row">
			<ZenithDither opacity={0.26} />
			{/* Left: headline + CTAs + quick install + TechGrid */}
			<div className="flex min-w-0 flex-1 flex-col">
				<div className="flex flex-1 flex-col items-start justify-center px-5 pt-16 pb-8 sm:px-8 sm:pt-20 sm:pb-10 lg:px-10 xl:px-12">
					<div className="flex items-center gap-2 mb-5">
						<HeroBadge />
					</div>

					<motion.h1
						initial={{ opacity: 0, y: 16 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
						className="font-sans font-bold text-[36px] sm:text-[48px] leading-[1.05] tracking-tight"
					>
						Your Agent Spends.
						<br />
						<span className="text-[36px] sm:text-[48px] leading-[1.05] tracking-tight text-muted-foreground/80">
							You Own the Rules.
						</span>
					</motion.h1>

					<motion.p
						initial={{ opacity: 0, y: 12 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
						className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground sm:text-[18px]"
					>
						The spend governance layer for AI agents. Give any agent a wallet, a budget,
						and an audit trail — safe, controlled, and enforced onchain.
					</motion.p>

					<motion.div
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.4, ease: "easeOut", delay: 0.35 }}
						className="mt-7 flex flex-wrap items-center gap-3 sm:gap-4"
					>
						<GetStartedButton />
						<SeeHowItWorksButton />
					</motion.div>

					<motion.div
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.4, ease: "easeOut", delay: 0.5 }}
						className="mt-10"
					>
						<QuickInstall />
					</motion.div>

					{/* Mobile demo — below quick install, hidden on desktop */}
					<motion.div
						initial={{ opacity: 0, y: 16 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, ease: "easeOut", delay: 0.6 }}
						className="lg:hidden w-full mt-10"
					>
						<AgentDemo />
					</motion.div>
				</div>

				<div className="relative h-[160px] shrink-0 border-t border-border">
					<TechGrid />
				</div>
			</div>

			{/* Right: agent demo — desktop only */}
			<div className="hidden border-border lg:flex lg:w-[440px] lg:flex-none lg:flex-col lg:items-center lg:justify-center lg:border-l lg:px-6 lg:py-8 xl:w-auto xl:flex-1 xl:px-8">
				<AgentDemo />
			</div>
		</section>
	)
}
