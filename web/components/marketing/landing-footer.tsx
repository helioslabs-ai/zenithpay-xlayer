"use client"

import Link from "next/link"
import ModeToggle from "@/components/theme-toggle/mode-toggle"

function XIcon({ className }: { className?: string }) {
	return (
		<svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
			<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
		</svg>
	)
}

export function LandingFooter() {
	return (
		<div className="mx-auto flex w-full max-w-7xl min-w-0 flex-col border-x border-t">
			<footer className="relative px-4 py-4 sm:h-(--footer-height) sm:py-0 font-mono">
				<div className="flex flex-col gap-3 sm:flex-row sm:h-full sm:items-center sm:justify-between">
					<div className="flex flex-col justify-center gap-1">
						<Link href="/" className="group w-fit">
							<span className="text-sm font-semibold tracking-tight text-foreground group-hover:text-brand-accent transition-colors">
								ZenithPay
							</span>
						</Link>
						<p className="text-[10px] text-muted-foreground/70 tracking-wide">
							© {new Date().getFullYear()} · Spend management for the agent economy.
						</p>
					</div>

					<div className="flex items-center gap-6 sm:absolute sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2">
						<a
							href="https://docs.usezenithpay.xyz"
							target="_blank"
							rel="noopener noreferrer"
							className="text-xs font-medium uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
						>
							Docs
						</a>
						<Link
							href="/#"
							className="text-xs font-medium uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
						>
							Blog
						</Link>
					</div>

					<div className="flex items-center gap-2">
						<a
							href="https://x.com/ZenithPayHQ"
							target="_blank"
							rel="noopener noreferrer"
							className="text-muted-foreground hover:text-foreground transition-colors"
							aria-label="X / Twitter"
						>
							<XIcon className="size-3.5" />
						</a>
						<ModeToggle />
					</div>
				</div>
				<div className="z-10 absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 size-2.5 rounded-full border border-border bg-background" />
				<div className="z-10 absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 size-2.5 rounded-full border border-border bg-background" />
				<div className="border-t absolute top-0 left-1/2 -translate-x-1/2 w-screen" />
			</footer>
		</div>
	)
}
