"use client";

import { ArrowRightIcon, ClipboardCopy, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const SKILL_CURL = "curl -s https://zp-api-q4hd.onrender.com/skill.md";

export function EntryPoints() {
  const [copied, setCopied] = useState(false);

  function copySkillCommand() {
    navigator.clipboard.writeText(SKILL_CURL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="mx-auto w-full max-w-7xl border-x border-t">
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 px-5 py-6 sm:px-8">
        <div className="relative group">
          <Button
            variant="outline"
            className="rounded-none cursor-pointer relative overflow-hidden border-dashed h-9 px-4"
            onClick={copySkillCommand}
          >
            <span className="shine absolute -top-1/2 -left-full h-[200%] w-3/4 skew-x-[-20deg] bg-linear-to-r from-transparent via-white/50 to-transparent pointer-events-none" />
            <ClipboardCopy className="size-3.5" />
            {copied ? "Copied!" : "Read the skill"}
            <ArrowRightIcon className="size-4 w-0 opacity-0 group-hover:w-4 group-hover:opacity-100 transition-all duration-200" />
          </Button>
          <span className="absolute h-2 w-2 border-foreground border-b border-r bottom-0 right-0" />
          <span className="absolute h-2 w-2 border-foreground border-b border-l bottom-0 left-0" />
          <span className="absolute h-2 w-2 border-foreground border-t border-r top-0 right-0" />
          <span className="absolute h-2 w-2 border-foreground border-t border-l top-0 left-0" />
        </div>

        <Button
          asChild
          style={{
            background: "var(--brand-accent)",
            color: "var(--background)",
          }}
          className="rounded-none cursor-pointer relative overflow-hidden focus-visible:ring-0 h-9 px-4 hover:opacity-90 transition-opacity group"
        >
          <Link href="/onboarding">
            <span className="shine absolute -top-1/2 -left-full h-[200%] w-3/4 skew-x-[-20deg] bg-linear-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
            <LayoutDashboard className="size-3.5" />
            Open dashboard
            <ArrowRightIcon className="size-4 w-0 opacity-0 group-hover:w-4 group-hover:opacity-100 transition-all duration-200" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
