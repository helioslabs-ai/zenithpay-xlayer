"use client";

import { usePrivy } from "@privy-io/react-auth";
import { LayoutDashboard, LogOut } from "lucide-react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { useAgent } from "@/components/dashboard/agent-context";
import ModeToggle from "@/components/theme-toggle/mode-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function UserDropdown() {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { address } = useAccount();
  const { agentDisplayName } = useAgent();

  if (!ready) {
    return <div className="size-8 rounded-none bg-muted animate-pulse" />;
  }

  if (!authenticated) {
    return (
      <Button variant="ghost" className="rounded-none" onClick={login}>
        Sign in
      </Button>
    );
  }

  const displayAddress = address ? truncateAddress(address) : null;
  const email = user?.email?.address;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="w-full px-3 h-9 rounded-none border border-border bg-muted flex items-center gap-2 focus:outline-none hover:bg-muted/80 transition-colors"
        >
          {/* Collapsed: show only 0x identifier */}
          <span className="hidden group-data-[collapsible=icon]:block text-[10px] font-mono text-muted-foreground truncate">
            0x
          </span>
          {/* Expanded: full name + address */}
          <div className="flex flex-col items-start min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <span className="text-xs font-medium truncate w-full text-left">
              {agentDisplayName}
            </span>
            {email && (
              <span className="text-[10px] font-mono text-muted-foreground">
                {email}
              </span>
            )}
            {!email && displayAddress && (
              <span className="text-[10px] font-mono text-muted-foreground">
                {displayAddress}
              </span>
            )}
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="rounded-none border-border w-48"
      >
        <DropdownMenuLabel className="font-normal">
          <div className="space-y-0.5">
            <p className="text-xs font-medium">{agentDisplayName}</p>
            {email && (
              <p className="text-[10px] text-muted-foreground">{email}</p>
            )}
            {displayAddress && (
              <p className="text-[10px] text-muted-foreground font-mono">
                {displayAddress}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="rounded-none">
          <Link href="/dashboard">
            <LayoutDashboard className="mr-2 size-4" />
            Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="rounded-none p-0">
          <ModeToggle
            showLabel
            className="px-2 h-8 text-sm font-normal hover:bg-accent"
            variant="ghost"
            size="sm"
          />
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="rounded-none" onClick={logout}>
          <LogOut className="mr-2 size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
