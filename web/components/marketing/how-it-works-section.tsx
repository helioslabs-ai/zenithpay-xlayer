"use client"

import { motion } from "motion/react"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

const STEPS = [
	{
		number: "01",
		label: "Step 1",
		title: "Register your agent",
		description:
			"Register your agent and it gets a real wallet instantly — fund USDC, and it's ready to spend. No custodians, no monthly fees.",
	},
	{
		number: "02",
		label: "Step 2",
		title: "Set your spend policy",
		description:
			"Define per-transaction limits, daily budgets, and which services your agent is allowed to pay. Set it once — enforced on every payment.",
	},
	{
		number: "03",
		label: "Step 3",
		title: "Auto-swap when needed",
		description:
			"Holding any token but need USDC? ZenithPay swaps automatically via a DEX aggregator before the payment goes out — no manual steps.",
	},
	{
		number: "04",

		label: "Step 4",
		title: "Agent spends safely",
		description:
			"Every payment is checked against your policy before it executes. Approved payments go through. Anything outside your rules is blocked and logged.",
	},
]

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

function StepConnectors({
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
					x1: rects[1].right,
					y1: rects[1].cy,
					x2: rects[2].left,
					y2: rects[2].cy,
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
			className="absolute inset-0 z-10 pointer-events-none overflow-visible hidden lg:block"
			width="100%"
			height="100%"
		>
			<defs>
				<marker
					id="step-arrow"
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
				<g key={i}>
					<line
						x1={l.x1}
						y1={l.y1}
						x2={l.x2}
						y2={l.y2}
						stroke="var(--border)"
						strokeWidth={1}
						strokeDasharray="4 3"
						markerEnd="url(#step-arrow)"
					/>
					<circle
						cx={l.x1}
						cy={l.y1}
						r={3.5}
						fill="var(--background)"
						stroke="var(--border)"
						strokeWidth={1}
					/>
				</g>
			))}
		</svg>
	)
}

function StepCard({ step, index }: { step: (typeof STEPS)[number]; index: number }) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5, ease: "easeOut", delay: index * 0.1 }}
			className="relative h-[250px] w-full overflow-hidden bg-background cursor-pointer group flex flex-col"
		>
			<span className="shine absolute -top-1/2 -left-full h-[200%] w-3/4 skew-x-[-20deg] bg-linear-to-r from-transparent via-white/40 to-transparent pointer-events-none z-20" />

			{/* Step number */}
			<div className="absolute top-3 right-3 size-6 rounded-full border border-border group-hover:border-brand-accent bg-background flex items-center justify-center font-mono text-[9px] text-muted-foreground group-hover:text-brand-accent transition-colors duration-300 z-10">
				{step.number}
			</div>

			{/* Main content */}
			<div className="flex flex-col flex-1 p-5 pb-6 pr-10">
				<span className="text-[10px] uppercase tracking-[0.2em] text-brand-accent font-mono">
					{step.label}
				</span>
				<h3 className="text-[20px] font-bold tracking-tight text-foreground leading-tight mt-1.5">
					{step.title}
				</h3>
				<p className="text-muted-foreground text-sm leading-relaxed mt-6 max-w-[220px]">
					{step.description}
				</p>
			</div>

			{/* Corner brackets */}
			<span className="absolute h-2.5 w-2.5 border-foreground/30 group-hover:border-brand-accent border-b border-r bottom-0 right-0 transition-colors duration-300" />
			<span className="absolute h-2.5 w-2.5 border-foreground/30 group-hover:border-brand-accent border-b border-l bottom-0 left-0 transition-colors duration-300" />
			<span className="absolute h-2.5 w-2.5 border-foreground/30 group-hover:border-brand-accent border-t border-r top-0 right-0 transition-colors duration-300" />
			<span className="absolute h-2.5 w-2.5 border-foreground/30 group-hover:border-brand-accent border-t border-l top-0 left-0 transition-colors duration-300" />
		</motion.div>
	)
}

export function HowItWorksSection() {
	const gridRef = useRef<HTMLDivElement>(null)
	const ref0 = useRef<HTMLDivElement>(null)
	const ref1 = useRef<HTMLDivElement>(null)
	const ref2 = useRef<HTMLDivElement>(null)
	const ref3 = useRef<HTMLDivElement>(null)
	const nodeRefs = [ref0, ref1, ref2, ref3] as const

	return (
		<section id="how-it-works" className="mx-auto w-full max-w-7xl border-x border-t">
			<div className="px-5 py-16 sm:px-8 lg:px-12">
				<div className="mb-12">
					<span className="text-xs uppercase tracking-[0.2em] text-brand-accent font-mono">
						[02] How it works
					</span>
					<h2 className="mt-3 text-[28px] sm:text-[36px] font-bold tracking-tight">
						Set up in four steps
					</h2>
					<p className="mt-3 text-[16px] text-muted-foreground max-w-xl">
						From zero to a fully policy-gated agent in minutes.
					</p>
				</div>

				<div
					ref={gridRef}
					className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border relative"
				>
					{STEPS.map((step, i) => (
						<div key={step.number} ref={nodeRefs[i]}>
							<StepCard step={step} index={i} />
						</div>
					))}
					<StepConnectors containerRef={gridRef} refs={nodeRefs} />
				</div>
			</div>
		</section>
	)
}
