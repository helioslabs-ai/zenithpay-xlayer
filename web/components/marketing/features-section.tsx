"use client"

import { motion } from "motion/react"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

function ScrambleText({
	text,
	trigger,
	delay = 0,
	className,
}: {
	text: string
	trigger: boolean
	delay?: number
	className?: string
}) {
	const [display, setDisplay] = useState(text)
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	useEffect(() => {
		if (!trigger) return

		timeoutRef.current = setTimeout(() => {
			let frame = 0
			const totalFrames = text.length + 4

			intervalRef.current = setInterval(() => {
				setDisplay(
					text
						.split("")
						.map((char, i) => {
							if (char === " ") return " "
							if (i < frame) return text[i]
							return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
						})
						.join("")
				)
				frame++
				if (frame > totalFrames) {
					if (intervalRef.current) clearInterval(intervalRef.current)
					setDisplay(text)
				}
			}, 25)
		}, delay)

		return () => {
			if (timeoutRef.current) clearTimeout(timeoutRef.current)
			if (intervalRef.current) clearInterval(intervalRef.current)
			setDisplay(text)
		}
	}, [trigger, text, delay])

	return <span className={className}>{display}</span>
}

type Rect = {
	left: number
	top: number
	right: number
	bottom: number
	cx: number
	cy: number
}

function getRect(el: HTMLElement, container: HTMLElement): Rect {
	const er = el.getBoundingClientRect()
	const cr = container.getBoundingClientRect()
	const left = er.left - cr.left
	const top = er.top - cr.top
	const right = left + er.width
	const bottom = top + er.height
	return {
		left,
		top,
		right,
		bottom,
		cx: (left + right) / 2,
		cy: (top + bottom) / 2,
	}
}

function GridConnectors({
	containerRef,
	refs,
}: {
	containerRef: React.RefObject<HTMLDivElement | null>
	refs: readonly [
		React.RefObject<HTMLDivElement | null>,
		React.RefObject<HTMLDivElement | null>,
		React.RefObject<HTMLDivElement | null>,
		React.RefObject<HTMLDivElement | null>,
	]
}) {
	const [lines, setLines] = useState<{ x1: number; y1: number; x2: number; y2: number }[]>([])

	useEffect(() => {
		const container = containerRef.current
		if (!container) return

		const update = () => {
			const els = refs.map((r) => r.current)
			if (els.some((el) => !el)) return
			const rects = els.map((el) => getRect(el as HTMLElement, container))
			setLines([
				{
					x1: rects[0].right,
					y1: rects[0].cy,
					x2: rects[1].left,
					y2: rects[1].cy,
				},
				{
					x1: rects[2].right,
					y1: rects[2].cy,
					x2: rects[3].left,
					y2: rects[3].cy,
				},
			])
		}

		requestAnimationFrame(update)
		const ro = new ResizeObserver(update)
		ro.observe(container)
		refs.forEach((ref) => {
			if (ref.current) ro.observe(ref.current)
		})
		window.addEventListener("resize", update)
		return () => {
			ro.disconnect()
			window.removeEventListener("resize", update)
		}
	}, [containerRef, refs])

	if (lines.length === 0) return null

	return (
		<svg
			className="absolute inset-0 z-10 pointer-events-none overflow-visible hidden sm:block"
			width="100%"
			height="100%"
		>
			<title>Feature grid connectors</title>
			<defs>
				<marker
					id="feat-arrow"
					markerWidth="6"
					markerHeight="6"
					refX="5"
					refY="3"
					orient="auto"
				>
					<path d="M0,0 L0,6 L6,3 z" fill="var(--border)" />
				</marker>
			</defs>
			{lines.map((l, i) => (
				<g key={`${l.x1}-${l.y1}-${l.x2}-${l.y2}-${i}`}>
					<line
						x1={l.x1}
						y1={l.y1}
						x2={l.x2}
						y2={l.y2}
						stroke="var(--border)"
						strokeWidth={1}
						strokeDasharray="4 3"
						markerEnd="url(#feat-arrow)"
					/>
					<circle
						cx={l.x1}
						cy={l.y1}
						r={4}
						fill="var(--background)"
						stroke="var(--border)"
						strokeWidth={1}
					/>
				</g>
			))}
		</svg>
	)
}

function MicroHeroOne({ className }: { className?: string }) {
	const [hovered, setHovered] = useState(false)

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5, ease: "easeOut" }}
			className={cn(
				"relative h-[260px] w-full overflow-hidden bg-background cursor-pointer group",
				className
			)}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
		>
			<span className="shine absolute -top-1/2 -left-full h-[200%] w-3/4 skew-x-[-20deg] bg-linear-to-r from-transparent via-white/40 to-transparent pointer-events-none z-20" />

			<div className="absolute top-0 bottom-0 left-0 right-[140px] flex flex-col justify-between p-5">
				<div>
					<span className="text-[10px] uppercase tracking-[0.2em] text-brand-accent">
						Spend Engine
					</span>
					<h2 className="text-[20px] font-bold tracking-tight text-foreground leading-tight mt-1.5">
						Rules that enforce themselves.
					</h2>
					<p className="text-muted-foreground text-sm leading-relaxed mt-2 max-w-[200px]">
						Set per-transaction limits, daily budgets, and merchant allowlists. Deployed
						onchain — enforced on every payment.
					</p>
				</div>
			</div>

			<div className="absolute top-4 bottom-4 right-[140px] w-px border-l border-dashed border-border/60" />
			<div className="absolute top-1/2 right-[140px] -translate-y-1/2 -translate-x-1/2 z-10">
				<div className="size-2 rounded-full border border-border bg-background transition-transform duration-200 delay-100 group-hover:scale-110" />
			</div>

			<div className="uppercase text-xs font-mono absolute top-0 bottom-0 right-0 w-[140px] flex flex-col justify-center">
				{["PER TX LIMIT", "DAILY BUDGET", "MERCHANT ALLOWLIST", "ENFORCED"].map(
					(field, i) => (
						<div key={field}>
							<div className="uppercase text-xs font-mono px-4 py-[7px] text-foreground/50 group-hover:text-foreground/90">
								<ScrambleText
									text={field}
									trigger={hovered}
									delay={i * 30}
									className="text-[10px] font-mono"
								/>
							</div>
							{i < 3 && <div className="mx-4 h-px bg-border/40" />}
						</div>
					)
				)}
			</div>

			<span className="absolute h-2.5 w-2.5 border-foreground/30 group-hover:border-brand-accent border-b border-r bottom-0 right-0 transition-colors duration-300" />
			<span className="absolute h-2.5 w-2.5 border-foreground/30 group-hover:border-brand-accent border-b border-l bottom-0 left-0 transition-colors duration-300" />
			<span className="absolute h-2.5 w-2.5 border-foreground/30 group-hover:border-brand-accent border-t border-r top-0 right-0 transition-colors duration-300" />
			<span className="absolute h-2.5 w-2.5 border-foreground/30 group-hover:border-brand-accent border-t border-l top-0 left-0 transition-colors duration-300" />
		</motion.div>
	)
}

function MicroHeroTwo({ className }: { className?: string }) {
	const [hovered, setHovered] = useState(false)
	const agentRows = [
		{
			id: "research-01",
			name: "RESEARCH AGENT-01",
			balance: "$12.40",
			policy: "ACTIVE",
			spend: "$0.24/D",
		},
		{
			id: "trading-02",
			name: "TRADING AGENT-02",
			balance: "$8.75",
			policy: "ACTIVE",
			spend: "$1.20/D",
		},
		{
			id: "scraper-03",
			name: "SCRAPER AGENT-03",
			balance: "$2.10",
			policy: "PAUSED",
			spend: "$0.00/D",
		},
	]

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
			className={cn(
				"relative h-[260px] w-full overflow-hidden bg-background cursor-pointer group",
				className
			)}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
		>
			<span className="shine absolute -top-1/2 -left-full h-[200%] w-3/4 skew-x-[-20deg] bg-linear-to-r from-transparent via-white/40 to-transparent pointer-events-none z-20" />

			<div className="p-5 pb-0">
				<span className="text-[10px] uppercase tracking-[0.2em] text-brand-accent">
					Unified Dashboard
				</span>
				<h2 className="text-[20px] font-bold tracking-tight text-foreground leading-tight mt-1.5">
					One place to manage
					<br />
					every agent.
				</h2>
			</div>

			<div className="absolute top-[78px] left-4 right-4 border-t border-dashed border-border/60" />

			<div className="absolute top-[86px] bottom-0 left-0 right-0 px-5 flex flex-col">
				<div className="flex items-center mb-1.5">
					<span className="text-[9px] uppercase tracking-wider text-muted-foreground/40 flex-1">
						Agent
					</span>
					<span className="text-[9px] uppercase tracking-wider text-muted-foreground/40 w-[52px] text-right">
						Balance
					</span>
					<span className="text-[9px] uppercase tracking-wider text-muted-foreground/40 w-[46px] text-right">
						Policy
					</span>
					<span className="text-[9px] uppercase tracking-wider text-muted-foreground/40 w-[44px] text-right">
						Spend
					</span>
				</div>

				{agentRows.map((agent, i) => (
					<div
						key={agent.id}
						className="flex items-center py-[5px] font-mono opacity-60 group-hover:opacity-100 border-t border-border/20"
					>
						<ScrambleText
							text={agent.name}
							trigger={hovered}
							delay={i * 30}
							className="text-[10px] uppercase tracking-wider text-foreground flex-1"
						/>
						<ScrambleText
							text={agent.balance}
							trigger={hovered}
							delay={i * 30 + 15}
							className="text-[10px] font-mono text-foreground w-[52px] text-right"
						/>
						<ScrambleText
							text={agent.policy}
							trigger={hovered}
							delay={i * 30 + 30}
							className={cn("text-[10px] uppercase w-[46px] text-right", {
								"text-brand-accent/70": agent.policy === "ACTIVE",
								"text-muted-foreground/40": agent.policy === "PAUSED",
							})}
						/>
						<ScrambleText
							text={agent.spend}
							trigger={hovered}
							delay={i * 30 + 45}
							className="text-[10px] font-mono text-muted-foreground/50 w-[44px] text-right"
						/>
					</div>
				))}
			</div>

			<span className="absolute h-2.5 w-2.5 border-foreground/30 group-hover:border-brand-accent border-b border-r bottom-0 right-0 transition-colors duration-300" />
			<span className="absolute h-2.5 w-2.5 border-foreground/30 group-hover:border-brand-accent border-b border-l bottom-0 left-0 transition-colors duration-300" />
			<span className="absolute h-2.5 w-2.5 border-foreground/30 group-hover:border-brand-accent border-t border-r top-0 right-0 transition-colors duration-300" />
			<span className="absolute h-2.5 w-2.5 border-foreground/30 group-hover:border-brand-accent border-t border-l top-0 left-0 transition-colors duration-300" />
		</motion.div>
	)
}
function MicroHeroThree({ className }: { className?: string }) {
	const [hovered, setHovered] = useState(false)
	const swapRows = [
		{ id: "eth-usdc-dex", from: "ETH", to: "USDC", route: "DEX" },
		{ id: "usdc-usdc-direct", from: "USDC", to: "USDC", route: "DIRECT" },
		{ id: "usdt-usdc-dex", from: "USDT", to: "USDC", route: "DEX" },
		{ id: "any-usdc-auto", from: "ANY", to: "USDC", route: "AUTO-SWAP" },
	]

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
			className={cn(
				"relative h-[260px] w-full overflow-hidden bg-background cursor-pointer group",
				className
			)}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
		>
			<span className="shine absolute -top-1/2 -left-full h-[200%] w-3/4 skew-x-[-20deg] bg-linear-to-r from-transparent via-white/40 to-transparent pointer-events-none z-20" />

			<div className="p-5 pb-0">
				<span className="text-[10px] uppercase tracking-[0.2em] text-brand-accent">
					Auto-Swap
				</span>
				<h2 className="text-[20px] font-bold tracking-tight text-foreground leading-tight mt-1.5">
					Any Token in, USDC Out.
				</h2>
			</div>

			<div className="absolute top-[72px] left-4 right-4 border-t border-dashed border-border/60" />

			<div className="absolute top-[80px] bottom-[36px] left-0 right-0 px-5 flex flex-col">
				<div className="flex items-center mb-1">
					<span className="text-[10px] uppercase tracking-wider text-muted-foreground/50 w-[60px]">
						From
					</span>
					<span className="text-[10px] uppercase tracking-wider text-muted-foreground/50 w-[60px]">
						To
					</span>
					<span className="text-[10px] uppercase tracking-wider text-muted-foreground/50 text-right flex-1">
						Route
					</span>
				</div>

				{swapRows.map((row, i) => (
					<div
						key={row.id}
						className="flex items-center py-[4px] font-mono opacity-60 group-hover:opacity-100"
					>
						<ScrambleText
							text={row.from}
							trigger={hovered}
							delay={i * 30}
							className="text-[10px] uppercase tracking-wider text-foreground w-[60px]"
						/>
						<ScrambleText
							text={row.to}
							trigger={hovered}
							delay={i * 30 + 20}
							className="text-[10px] uppercase tracking-wider text-muted-foreground w-[60px]"
						/>
						<ScrambleText
							text={row.route}
							trigger={hovered}
							delay={i * 30 + 40}
							className="text-[10px] uppercase text-foreground/50 text-right flex-1 font-semibold"
						/>
					</div>
				))}
			</div>

			<div className="absolute bottom-0 left-0 right-0 h-[36px] flex items-center px-5" />

			<span className="absolute h-2.5 w-2.5 border-foreground/30 group-hover:border-brand-accent border-b border-r bottom-0 right-0 transition-colors duration-300" />
			<span className="absolute h-2.5 w-2.5 border-foreground/30 group-hover:border-brand-accent border-b border-l bottom-0 left-0 transition-colors duration-300" />
			<span className="absolute h-2.5 w-2.5 border-foreground/30 group-hover:border-brand-accent border-t border-r top-0 right-0 transition-colors duration-300" />
			<span className="absolute h-2.5 w-2.5 border-foreground/30 group-hover:border-brand-accent border-t border-l top-0 left-0 transition-colors duration-300" />
		</motion.div>
	)
}

function MicroHeroFour({ className }: { className?: string }) {
	const [hovered, setHovered] = useState(false)
	const txRows = [
		{
			id: "exa-now-allowed",
			status: "allowed",
			amount: "$0.007",
			service: "exa.ai",
			time: "now",
		},
		{
			id: "unknown-1m-blocked",
			status: "blocked",
			amount: "$25.00",
			service: "unknown",
			time: "1m",
		},
		{
			id: "firecrawl-2m-allowed",
			status: "allowed",
			amount: "$0.010",
			service: "firecrawl",
			time: "2m",
		},
		{
			id: "exa-5m-allowed",
			status: "allowed",
			amount: "$0.007",
			service: "exa.ai",
			time: "5m",
		},
	]

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5, ease: "easeOut", delay: 0.3 }}
			className={cn(
				"relative h-[260px] w-full overflow-hidden bg-background cursor-pointer group",
				className
			)}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
		>
			<span className="shine absolute -top-1/2 -left-full h-[200%] w-3/4 skew-x-[-20deg] bg-linear-to-r from-transparent via-white/40 to-transparent pointer-events-none z-20" />

			<div className="p-5 pb-2">
				<span className="text-[10px] uppercase tracking-[0.2em] text-brand-accent">
					Audit Trail
				</span>
				<h2 className="text-[20px] font-bold tracking-tight text-foreground leading-tight mt-1.5">
					Every spend, on record.
				</h2>
			</div>

			<div className="absolute top-[80px] left-0 right-0 border-t border-dashed border-border/60" />

			<div className="absolute top-[88px] bottom-0 left-0 right-0 px-5 flex flex-col justify-center gap-0">
				{txRows.map((tx, i) => (
					<div
						key={tx.id}
						className="flex items-center gap-2 py-[4px] font-mono opacity-60 group-hover:opacity-100"
					>
						<span
							className={cn("size-1.5 rounded-full shrink-0", {
								"bg-destructive": tx.status === "blocked",
								"bg-brand-accent/70": tx.status === "allowed",
							})}
						/>
						<ScrambleText
							text={tx.amount}
							trigger={hovered}
							delay={i * 30}
							className={cn("text-[10px] w-10 shrink-0", {
								"text-destructive": tx.status === "blocked",
								"text-foreground/80": tx.status === "allowed",
							})}
						/>
						<ScrambleText
							text={tx.service}
							trigger={hovered}
							delay={i * 30 + 20}
							className="text-[10px] uppercase tracking-wider text-muted-foreground flex-1"
						/>
						<ScrambleText
							text={tx.status === "blocked" ? "BLOCKED" : tx.time}
							trigger={hovered}
							delay={i * 30 + 40}
							className={cn("text-[10px] uppercase shrink-0", {
								"text-destructive/80 font-semibold": tx.status === "blocked",
								"text-muted-foreground/40": tx.status === "allowed",
							})}
						/>
					</div>
				))}
			</div>

			<span className="absolute h-2.5 w-2.5 border-foreground/30 group-hover:border-brand-accent border-b border-r bottom-0 right-0 transition-colors duration-300" />
			<span className="absolute h-2.5 w-2.5 border-foreground/30 group-hover:border-brand-accent border-b border-l bottom-0 left-0 transition-colors duration-300" />
			<span className="absolute h-2.5 w-2.5 border-foreground/30 group-hover:border-brand-accent border-t border-r top-0 right-0 transition-colors duration-300" />
			<span className="absolute h-2.5 w-2.5 border-foreground/30 group-hover:border-brand-accent border-t border-l top-0 left-0 transition-colors duration-300" />
		</motion.div>
	)
}

export function FeaturesSection() {
	const gridRef = useRef<HTMLDivElement>(null)
	const ref0 = useRef<HTMLDivElement>(null)
	const ref1 = useRef<HTMLDivElement>(null)
	const ref2 = useRef<HTMLDivElement>(null)
	const ref3 = useRef<HTMLDivElement>(null)
	const nodeRefs = [ref0, ref1, ref2, ref3] as const

	return (
		<section id="features" className="mx-auto w-full max-w-7xl border-x border-t">
			<div className="px-5 py-16 sm:px-8 lg:px-12">
				<div className="mb-12">
					<span className="text-xs uppercase tracking-[0.2em] text-brand-accent font-mono">
						[01] Features
					</span>
					<h2 className="mt-3 text-[28px] sm:text-[36px] font-bold tracking-tight">
						Built for agents that spend.
					</h2>
					<p className="mt-3 text-[16px] text-muted-foreground max-w-xl">
					Hard limits, x402 payments, automatic token swaps, and a full audit
					trail — everything an agent needs to pay safely and autonomously.
					</p>
				</div>

				<div
					ref={gridRef}
					className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border border border-border relative"
				>
					<div ref={ref0}>
						<MicroHeroOne className="max-w-none" />
					</div>
					<div ref={ref1}>
						<MicroHeroFour className="max-w-none" />
					</div>
					<div ref={ref2}>
						<MicroHeroThree className="max-w-none" />
					</div>
					<div ref={ref3}>
						<MicroHeroTwo className="max-w-none" />
					</div>
					<GridConnectors containerRef={gridRef} refs={nodeRefs} />
				</div>
			</div>
		</section>
	)
}
