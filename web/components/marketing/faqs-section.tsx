"use client";

import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const FAQS = [
  {
    question: "Who controls the spend policy?",
    answer:
      "You do. Set per-transaction limits, daily budgets, and an allowlist of approved services. Once set, the policy is enforced on every payment — no one can override it, including ZenithPay.",
  },
  {
    question: "What happens when an agent hits its limit?",
    answer:
      "The payment is blocked before it executes. The call never reaches the service. Every blocked attempt is logged on-chain so you have a full audit trail of what was tried and why it was rejected.",
  },
  {
    question: "Does my agent need to hold USDC?",
    answer:
      "Yes — x402 payments settle in USDC on Base. If your agent holds another token, ZenithPay can auto-swap via a DEX aggregator before the payment goes out. No manual top-ups needed.",
  },
  {
    question: "What networks are supported?",
    answer:
      "Base mainnet. Agent wallets, spend policies, and all payment settlement run on Base. The x402 protocol routes payments to any compatible service endpoint.",
  },
  {
    question: "Can I update the policy after setting it?",
    answer:
      "Yes. You can update limits, budgets, and allowlists at any time. Changes take effect immediately on the next payment attempt.",
  },
  {
    question: "How does x402 fit in?",
    answer:
      "x402 is the HTTP payment protocol your agent uses to pay for API calls. ZenithPay's policy layer sits between the agent and the x402 payment — checking limits before funds ever move.",
  },
];

function FAQItem({
  question,
  answer,
  open,
  onToggle,
}: {
  question: string;
  answer: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-border">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 py-5 px-1 text-left cursor-pointer"
      >
        <span
          className={cn(
            "text-sm font-medium transition-colors duration-200",
            open ? "text-foreground" : "text-foreground/70",
          )}
        >
          {question}
        </span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="shrink-0 text-muted-foreground"
        >
          <ChevronDown size={14} />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="answer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <p className="px-1 pb-5 text-sm text-muted-foreground leading-relaxed">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FAQsSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faqs" className="mx-auto w-full max-w-7xl border-x border-t">
      <div className="px-5 py-16 sm:px-8 lg:px-12">
        <div className="flex flex-col lg:flex-row lg:gap-16 xl:gap-24">
          {/* Left: heading */}
          <div className="mb-10 lg:mb-0 lg:w-[340px] xl:w-[400px] lg:shrink-0 lg:pt-1">
            <span className="text-xs uppercase tracking-[0.2em] text-brand-accent font-mono">
              [04] FAQs
            </span>
            <h2 className="mt-3 text-[32px] sm:text-[36px] font-bold tracking-tight leading-[1.05]">
              Frequently asked questions.
            </h2>
          </div>

          {/* Right: accordion with corner brackets */}
          <div className="relative flex-1 min-w-0">
            <span className="absolute h-2.5 w-2.5 border-brand-accent border-t border-l top-0 left-0 z-10" />
            <span className="absolute h-2.5 w-2.5 border-brand-accent border-t border-r top-0 right-0 z-10" />
            <span className="absolute h-2.5 w-2.5 border-brand-accent border-b border-l bottom-0 left-0 z-10" />
            <span className="absolute h-2.5 w-2.5 border-brand-accent border-b border-r bottom-0 right-0 z-10" />

            <div className="border-t border-border">
              {FAQS.map(({ question, answer }, i) => (
                <FAQItem
                  key={question}
                  question={question}
                  answer={answer}
                  open={openIndex === i}
                  onToggle={() => setOpenIndex(openIndex === i ? null : i)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
