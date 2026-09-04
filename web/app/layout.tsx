import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { GeistPixelSquare } from "geist/font/pixel"
import { Toaster } from "sonner"
import { Web3Provider } from "@/components/providers/web3-provider"
import { ThemeProvider } from "@/components/theme-toggle/theme-provider"

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
})

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
})

export const metadata: Metadata = {
	title: "ZenithPay — The Spend Governance Layer for AI Agents",
	description:
		"ZenithPay gives AI agents a spend governance layer — onchain policy enforcement, x402 payments, and a full audit trail. Built on Base.",
	icons: [
		{
			media: "(prefers-color-scheme: light)",
			url: "/favicon-black.svg",
			href: "/favicon-black.svg",
		},
		{
			media: "(prefers-color-scheme: dark)",
			url: "/favicon-white.svg",
			href: "/favicon-white.svg",
		},
	],
	openGraph: {
		title: "ZenithPay — The Spend Governance Layer for AI Agents",
		description:
			"ZenithPay gives AI agents a spend governance layer — onchain policy enforcement, x402 payments, and a full audit trail. Built on Base.",
		siteName: "ZenithPay",
		images: [
			{
				url: "/og.png",
				width: 1200,
				height: 630,
				alt: "ZenithPay",
			},
		],
		locale: "en_US",
		type: "website",
	},
	twitter: {
		card: "summary_large_image",
		title: "ZenithPay — The Spend Governance Layer for AI Agents",
		description:
			"ZenithPay gives AI agents a spend governance layer — onchain policy enforcement, x402 payments, and a full audit trail. Built on Base.",
		images: ["/og.png"],
	},
}

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body
				className={`${geistSans.variable} ${geistMono.variable} ${GeistPixelSquare.variable} antialiased`}
			>
				<ThemeProvider
					attribute="class"
					defaultTheme="dark"
					enableSystem={false}
					disableTransitionOnChange
				>
					<Web3Provider>
						<Toaster />
						{children}
					</Web3Provider>
				</ThemeProvider>
			</body>
		</html>
	)
}
