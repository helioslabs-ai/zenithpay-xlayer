"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { ZenithDither } from "@/components/bg/zenith-dither";

const WORDS = [
  "SPEND",
  "POLICY",
  "ENFORCED",
  "ON-CHAIN",
  "BASE",
  "CONTROL",
  "PAYMENT",
  "AGENTS",
];

const STATS = [
  { label: "per-tx cap", value: "$5.00" },
  { label: "daily budget", value: "$50.00" },
  { label: "chain", value: "Base · 8453" },
];

export function SignInVisual() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % WORDS.length);
    }, 2200);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative h-full w-full flex items-center justify-center overflow-hidden">
      <ZenithDither opacity={0.14} />
      {/* Scan line sweep */}
      <motion.div
        className="absolute inset-x-0 h-[1px] bg-foreground/5 pointer-events-none"
        animate={{ top: ["0%", "100%"] }}
        transition={{ duration: 6, ease: "linear", repeat: Infinity }}
      />

      {/* Corner brackets */}
      <span className="absolute size-5 border-foreground/20 border-b border-r bottom-5 right-5" />
      <span className="absolute size-5 border-foreground/20 border-b border-l bottom-5 left-5" />
      <span className="absolute size-5 border-foreground/20 border-t border-r top-5 right-5" />
      <span className="absolute size-5 border-foreground/20 border-t border-l top-5 left-5" />

      {/* Content */}
      <div className="flex flex-col items-center gap-8 z-10 select-none">
        {/* Cycling word */}
        <div className="flex flex-col items-center gap-2">
          <span className="font-mono text-[9px] uppercase tracking-[0.35em] text-muted-foreground/40">
            agent economy
          </span>

          <div className="relative h-14 w-56 flex items-center justify-center overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.span
                key={index}
                initial={{ y: 16, opacity: 0, filter: "blur(4px)" }}
                animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                exit={{ y: -16, opacity: 0, filter: "blur(4px)" }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="font-pixel-square text-[32px] text-foreground/70 tracking-[0.15em] absolute"
              >
                {WORDS[index]}
              </motion.span>
            </AnimatePresence>
          </div>

          <span className="font-mono text-[9px] uppercase tracking-[0.35em] text-muted-foreground/40">
            infrastructure
          </span>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 w-44">
          <div className="h-px flex-1 bg-border" />
          <div className="size-1 bg-foreground/20" />
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Policy stats */}
        <div className="flex flex-col gap-2 w-44">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.08, duration: 0.4 }}
              className="flex items-center justify-between"
            >
              <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/40">
                {s.label}
              </span>
              <span className="font-mono text-[10px] text-foreground/50">
                {s.value}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Status dot */}
        <div className="flex items-center gap-2">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-accent/50 duration-1000" />
            <span className="relative inline-flex size-1.5 rounded-full bg-brand-accent" />
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground/40">
            policy engine
          </span>
        </div>
      </div>
    </div>
  );
}
