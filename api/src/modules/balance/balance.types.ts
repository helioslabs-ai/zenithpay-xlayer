export interface AgentBalance {
  address: string;
  label: string | null;
  balances: {
    USDC: string;
    ETH: string;
  };
  remainingDailyBudget: string;
}
