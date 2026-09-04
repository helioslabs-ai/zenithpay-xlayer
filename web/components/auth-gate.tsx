"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { ReactNode } from "react";

interface AuthGateProps {
  children: ReactNode;
  isDemo?: boolean;
}

export function AuthGate({ children, isDemo }: AuthGateProps) {
  const { ready, authenticated } = usePrivy();
  const router = useRouter();

  useEffect(() => {
    if (isDemo) return;
    if (ready && !authenticated) {
      router.push("/signin");
    }
  }, [ready, authenticated, router, isDemo]);

  if (isDemo) {
    return <>{children}</>;
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-8 animate-pulse rounded-none bg-muted" />
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  return <>{children}</>;
}
