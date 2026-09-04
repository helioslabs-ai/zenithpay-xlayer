import type { LucideIcon } from "lucide-react"
import { ArrowUpRight, Expand, Layers, Square, Wallet, WalletCards, Zap } from "lucide-react"
import Link from "next/link"

const stack: { name: string; desc: string; href: string; icon: LucideIcon }[] = [
	{
		name: "Base",
		desc: "Chain",
		href: "https://base.org",
		icon: Expand,
	},
	{
		name: "Privy",
		desc: "Agent wallets",
		href: "https://privy.io",
		icon: WalletCards,
	},
	{
		name: "SpendPolicy",
		desc: "Onchain rules",
		href: "https://basescan.org",
		icon: Layers,
	},
	{
		name: "USDC",
		desc: "Settlement",
		href: "https://www.circle.com/usdc",
		icon: Wallet,
	},
	{
		name: "x402",
		desc: "Payments",
		href: "https://x402.org",
		icon: Zap,
	},
]

const COLS = 5

export function TechGrid() {
	return (
		<div className="absolute inset-0 grid grid-cols-5">
			{Array.from({ length: COLS - 1 }, (_, i) => (
				<div
					key={`v-${(i + 1) / COLS}`}
					className="absolute top-0 bottom-0 border-l border-border pointer-events-none"
					style={{ left: `${((i + 1) / COLS) * 100}%` }}
				/>
			))}

			{Array.from({ length: COLS - 1 }, (_, i) => (
				<Square
					key={`sq-top-${i}`}
					className="pointer-events-none absolute z-10 size-3 -translate-x-1/2 -translate-y-1/2 fill-background stroke-border"
					style={{ left: `${((i + 1) / COLS) * 100}%`, top: "0%" }}
				/>
			))}

			{stack.map((tech, i) => (
				<Link
					key={tech.name}
					href={tech.href}
					target="_blank"
					rel="noopener noreferrer"
					className="group relative flex flex-col items-center justify-center gap-3 overflow-hidden"
					style={{
						animation: `tech-fade-in 0.5s cubic-bezier(0.25,0.46,0.45,0.94) ${i * 70}ms both`,
					}}
				>
					<ArrowUpRight className="absolute top-2.5 right-2.5 size-3 text-muted-foreground opacity-0 translate-y-1 -translate-x-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 group-hover:translate-x-0" />

					<tech.icon
						strokeWidth={1.5}
						className="size-[18px] text-muted-foreground transition-all duration-300 group-hover:text-foreground group-hover:scale-110"
					/>

					<div className="flex flex-col items-center gap-1">
						<span className="text-[10px] tracking-widest uppercase text-muted-foreground transition-colors duration-300 group-hover:text-foreground font-pixel-square">
							{tech.name}
						</span>
						<span className="text-[10px] text-muted-foreground/50 transition-all duration-300 group-hover:text-muted-foreground">
							{tech.desc}
						</span>
					</div>
				</Link>
			))}
		</div>
	)
}
