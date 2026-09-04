"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { AuthGate } from "@/components/auth-gate";
import { AgentProvider } from "@/components/dashboard/agent-context";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { NoAgentDialog } from "@/components/dashboard/no-agent-dialog";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useAgent } from "@/components/dashboard/agent-context";

function DemoBanner() {
  return (
    <div className="w-full border-b border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-center font-mono text-xs text-amber-700 dark:text-amber-400">
      Demo Mode — viewing intel-agent (read-only) ·{" "}
      <a
        href="/signin"
        className="underline underline-offset-2 hover:opacity-80"
      >
        Connect your wallet →
      </a>
    </div>
  );
}

function DashboardShell({
  children,
  isDemo,
}: {
  children: ReactNode;
  isDemo: boolean;
}) {
  const { hasAgent, loading } = useAgent();

  return (
    <>
      <NoAgentDialog hasAgent={hasAgent} loading={loading} />
      <AppSidebar />
      <SidebarInset>
        {isDemo && <DemoBanner />}
        <main className="flex flex-col flex-1 p-6 min-w-0">{children}</main>
      </SidebarInset>
    </>
  );
}

function DashboardLayoutInner({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const isDemoFromUrl = searchParams.get("demo") === "true";

  // Persist demo mode across sidebar navigations (which drop the query param).
  // Guard sessionStorage — it's undefined during SSR.
  const [isDemo, setIsDemo] = useState(
    isDemoFromUrl ||
      (typeof window !== "undefined" &&
        sessionStorage.getItem("zenith_demo") === "true"),
  );

  useEffect(() => {
    if (isDemoFromUrl && typeof window !== "undefined") {
      sessionStorage.setItem("zenith_demo", "true");
      setIsDemo(true);
    }
  }, [isDemoFromUrl]);

  return (
    <AuthGate isDemo={isDemo}>
      <div
        style={{ "--radius": "0rem" } as React.CSSProperties}
        className="flex min-h-screen w-full"
      >
        <SidebarProvider
          style={{ "--sidebar-width": "14rem" } as React.CSSProperties}
        >
          <AgentProvider isDemo={isDemo}>
            <DashboardShell isDemo={isDemo}>{children}</DashboardShell>
          </AgentProvider>
        </SidebarProvider>
      </div>
    </AuthGate>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="size-8 animate-pulse rounded-none bg-muted" />
        </div>
      }
    >
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </Suspense>
  );
}
