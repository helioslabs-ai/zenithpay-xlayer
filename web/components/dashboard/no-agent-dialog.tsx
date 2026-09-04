"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AGENT_QUICK_INSTALL } from "@/lib/agent-quick-install";

export function NoAgentDialog({
  hasAgent,
  loading,
}: {
  hasAgent: boolean;
  loading: boolean;
}) {
  const { isConnected } = useAccount();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isConnected || loading || hasAgent) {
      setOpen(false);
      return;
    }
    setOpen(true);
  }, [isConnected, loading, hasAgent]);

  function copyInstallPrompt() {
    navigator.clipboard.writeText(AGENT_QUICK_INSTALL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="rounded-none border" showCloseButton>
        <DialogHeader>
          <DialogTitle className="text-sm uppercase tracking-wider">No agent linked yet</DialogTitle>
          <DialogDescription>
            This wallet has no linked agent or policy yet. Copy the quick-install prompt and run it in your AI agent to start onboarding.
          </DialogDescription>
        </DialogHeader>

        <div className="border border-border">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/20">
            <span className="text-[10px] uppercase tracking-[0.18em] font-mono text-muted-foreground/60">
              Quick Install
            </span>
            <button
              type="button"
              onClick={copyInstallPrompt}
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
              {AGENT_QUICK_INSTALL}
            </code>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

