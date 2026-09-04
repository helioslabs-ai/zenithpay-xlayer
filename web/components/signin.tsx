"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LogoMark } from "@/components/logo-mark";
import ModeToggle from "./theme-toggle/mode-toggle";
import { Button } from "./ui/button";

export default function SignIn() {
  const { ready, authenticated, login } = usePrivy();
  const router = useRouter();

  useEffect(() => {
    if (ready && authenticated) {
      router.push("/dashboard");
    }
  }, [ready, authenticated, router]);

  return (
    <div className="h-full w-full">
      <div className="flex h-full">
        <div className="relative flex flex-col items-center justify-center w-full p-8">
          <ModeToggle className="absolute top-2 right-2 dark:hover:bg-transparent w-auto h-auto" />
          <div className="w-full max-w-sm space-y-8">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <LogoMark className="size-5" />
                <span className="text-xs font-mono tracking-widest text-muted-foreground">
                  ZenithPay
                </span>
              </div>
              <h2 className="text-2xl font-semibold tracking-tight">
                Sign in to ZenithPay
              </h2>
              <p className="text-sm text-muted-foreground">
                Manage your agents and control how they spend.
              </p>
            </div>

            <div className="space-y-4">
              <div className="relative w-full group">
                <Button
                  variant="outline"
                  className="w-full cursor-pointer h-10 text-md rounded-none relative overflow-hidden border-dashed"
                  onClick={login}
                  disabled={!ready}
                >
                  <span className="shine absolute -top-1/2 -left-full h-[200%] w-3/4 skew-x-[-20deg] bg-linear-to-r from-transparent via-white/50 to-transparent pointer-events-none" />
                  Sign In
                </Button>
                <span className="absolute h-2 w-2 border-foreground border-b border-r bottom-0 right-0" />
                <span className="absolute h-2 w-2 border-foreground border-b border-l bottom-0 left-0" />
                <span className="absolute h-2 w-2 border-foreground border-t border-r top-0 right-0" />
                <span className="absolute h-2 w-2 border-foreground border-t border-l top-0 left-0" />
              </div>
              <p className="text-xs text-muted-foreground">
                Sign in with email via Privy. A wallet is created automatically.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
