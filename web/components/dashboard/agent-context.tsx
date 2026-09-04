"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAccount } from "wagmi";
import { getAgentsByOwner } from "@/lib/api";

function deriveDisplayName(label: string | null, address: string): string {
  if (!address) return "No agent";
  if (label) return label;
  return `Agent ${address.slice(0, 6)}...${address.slice(-4)}`;
}

interface AgentContextValue {
  agentAddress: string;
  hasAgent: boolean;
  agentLabel: string | null;
  agentDisplayName: string;
  loading: boolean;
  isDemo: boolean;
}

const AgentContext = createContext<AgentContextValue>({
  agentAddress: "",
  hasAgent: false,
  agentLabel: null,
  agentDisplayName: "No agent",
  loading: false,
  isDemo: false,
});

const DEMO_AGENT_ADDRESS = "0x726cf0c4fe559db9a32396161694c7b88c60c947";
const DEMO_AGENT_LABEL = "intel-agent";

export function AgentProvider({ children, isDemo }: { children: ReactNode; isDemo?: boolean }) {
  const { address, isConnected } = useAccount();
  const [agentAddress, setAgentAddress] = useState("");
  const [agentLabel, setAgentLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isDemo) return;
    if (!isConnected || !address) {
      setAgentAddress("");
      setAgentLabel(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getAgentsByOwner(address)
      .then((res) => {
        if (cancelled) return;
        const first = res.agents[0];
        if (first) {
          setAgentAddress(first.address);
          setAgentLabel(first.label);
          return;
        }
        setAgentAddress("");
        setAgentLabel(null);
      })
      .catch(() => {
        if (!cancelled) {
          setAgentAddress("");
          setAgentLabel(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [address, isConnected, isDemo]);

  const resolvedAddress = isDemo ? DEMO_AGENT_ADDRESS : agentAddress;
  const resolvedLabel = isDemo ? DEMO_AGENT_LABEL : agentLabel;
  const agentDisplayName = deriveDisplayName(resolvedLabel, resolvedAddress);
  const hasAgent = isDemo ? true : Boolean(agentAddress);

  return (
    <AgentContext.Provider
      value={{
        agentAddress: resolvedAddress,
        hasAgent,
        agentLabel: resolvedLabel,
        agentDisplayName,
        loading: isDemo ? false : loading,
        isDemo: isDemo ?? false,
      }}
    >
      {children}
    </AgentContext.Provider>
  );
}

export function useAgent(): AgentContextValue {
  return useContext(AgentContext);
}
