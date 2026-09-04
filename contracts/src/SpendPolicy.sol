// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title  SpendPolicy
 * @author ZenithPay
 * @notice On-chain spend enforcement for AI agents on Base.
 *
 * Architecture
 * ─────────────
 * - Any human can register an agent they own and set its policy.
 * - The agent calls executePayment() directly — no API intermediary.
 * - The contract is the ONLY enforcement layer. If it reverts, money does not move.
 * - ZenithPay deployer (protocolOwner) controls only global emergency pause.
 *   It has zero power over individual agent policies.
 *
 * Agent Lifecycle
 * ───────────────
 *   NotRegistered → Active → Deactivated ⇄ Active
 *                         → Revoked (permanent, no recovery)
 *
 * Security properties
 * ────────────────────
 * - CEI pattern on executePayment (checks → effects → interactions)
 * - ReentrancyGuard on executePayment
 * - Pausable global kill switch (protocolOwner only)
 * - Per-agent deactivation and permanent revocation (humanOwner only)
 * - Sovereign ownership: humanOwner controls their agent, not ZenithPay
 * - Allowlist is optional per agent (toggle on/off)
 * - O(1) allowlist lookup via nested mapping
 * - Rolling 24h spend window (not calendar day — prevents double-spend at midnight)
 * - Two-step protocol ownership transfer
 * - Non-custodial: this contract never holds funds. It only moves USDC from agent → merchant via safeTransferFrom.
 */
contract SpendPolicy is ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────────────────
    // Types
    // ─────────────────────────────────────────────────────────

    enum AgentStatus {
        NotRegistered,
        Active,
        Deactivated, // temporary — humanOwner can reactivate
        Revoked      // permanent — humanOwner cannot reactivate, must register new agent
    }

    struct Policy {
        uint256 perTxLimit;              // max USDC (6 dec) per single payment
        uint256 dailyLimit;              // max USDC per rolling 24h window
        uint256 dailySpent;              // accumulated spend in current window
        uint256 windowStart;             // timestamp when current 24h window opened
        AgentStatus status;
        bool merchantAllowlistEnabled;   // if false: agent pays any merchant within limits
        address humanOwner;              // the human who registered this agent
    }

    // ─────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────

    /// @notice ZenithPay deployer — only controls global pause, not agent policies
    address public protocolOwner;
    /// @notice Pending new protocol owner (two-step transfer)
    address public pendingProtocolOwner;

    /// @notice USDC token on Base
    IERC20 public immutable usdc;

    /// @notice agent address → policy
    mapping(address => Policy) private _policies;

    /// @notice agent → merchant → allowed (O(1) lookup)
    mapping(address => mapping(address => bool)) private _merchantAllowed;

    /// @notice USDC uses 6 decimal places — all amount parameters are in USDC units (1e6 = 1 USDC)
    uint8 public constant USDC_DECIMALS = 6;

    // ─────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────

    event AgentRegistered(
        address indexed agent,
        address indexed humanOwner,
        uint256 perTxLimit,
        uint256 dailyLimit
    );
    event AgentDeactivated(address indexed agent, address indexed humanOwner);
    event AgentReactivated(address indexed agent, address indexed humanOwner);
    event AgentRevoked(address indexed agent, address indexed humanOwner);

    event PolicyUpdated(
        address indexed agent,
        uint256 perTxLimit,
        uint256 dailyLimit
    );
    event AllowlistToggled(address indexed agent, bool enabled);
    event MerchantAllowlisted(address indexed agent, address indexed merchant);
    event MerchantRemoved(address indexed agent, address indexed merchant);

    event PaymentExecuted(
        address indexed agent,
        address indexed merchant,
        uint256 amount,
        bytes32 indexed intentHash,
        uint256 dailySpentAfter,
        uint256 timestamp
    );
    event PaymentBlocked(
        address indexed agent,
        address indexed merchant,
        uint256 amount,
        bytes32 intentHash,
        string reason
    );

    event ProtocolOwnershipTransferStarted(
        address indexed currentOwner,
        address indexed pendingOwner
    );
    event ProtocolOwnershipTransferred(
        address indexed oldOwner,
        address indexed newOwner
    );

    // ─────────────────────────────────────────────────────────
    // Errors
    // ─────────────────────────────────────────────────────────

    error NotProtocolOwner();
    error NotHumanOwner();
    error NotPendingOwner();
    error AgentNotRegistered();
    error AgentNotActive();
    error AgentAlreadyRegistered();
    error AgentAlreadyRevoked();
    error ExceedsPerTxLimit(uint256 amount, uint256 limit);
    error ExceedsDailyLimit(uint256 amount, uint256 remaining);
    error MerchantNotAllowed(address merchant);
    error ZeroAddress();
    error ZeroAmount();
    error InvalidLimits();

    // ─────────────────────────────────────────────────────────
    // Modifiers
    // ─────────────────────────────────────────────────────────

    modifier onlyProtocolOwner() {
        if (msg.sender != protocolOwner) revert NotProtocolOwner();
        _;
    }

    modifier onlyHumanOwner(address agent) {
        if (msg.sender != _policies[agent].humanOwner) revert NotHumanOwner();
        _;
    }

    modifier agentMustExist(address agent) {
        if (_policies[agent].status == AgentStatus.NotRegistered)
            revert AgentNotRegistered();
        _;
    }

    modifier agentNotRevoked(address agent) {
        if (_policies[agent].status == AgentStatus.Revoked)
            revert AgentAlreadyRevoked();
        _;
    }

    // ─────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────

    /// @param _usdc  USDC token address on Base (eip155:8453)
    ///               USDC contract: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 (6 decimals)
    constructor(address _usdc) {
        if (_usdc == address(0)) revert ZeroAddress();
        protocolOwner = msg.sender;
        usdc = IERC20(_usdc);
    }

    // ─────────────────────────────────────────────────────────
    // Human Owner — Agent Registration
    // ─────────────────────────────────────────────────────────

    /**
     * @notice Register an agent under your ownership with a spending policy.
     *         Anyone can call this — you become the humanOwner of the agent.
     *         Agent must not already be registered or revoked.
     *
     * @param agent                    The agent EOA address (ZenithPay backend wallet)
     * @param perTxLimit               Max USDC per single payment (6 decimals)
     * @param dailyLimit               Max USDC per rolling 24h window (6 decimals)
     * @param merchantAllowlistEnabled Whether to restrict payments to allowlisted merchants
     */
    function registerAgent(
    address agent,
    uint256 perTxLimit,
    uint256 dailyLimit,
    bool merchantAllowlistEnabled
) external {
    if (agent == address(0)) revert ZeroAddress();
    if (_policies[agent].humanOwner != address(0)) revert AgentAlreadyRegistered(); // ADD THIS
    if (_policies[agent].status == AgentStatus.Revoked) revert AgentAlreadyRevoked();
    if (perTxLimit == 0 || dailyLimit == 0) revert InvalidLimits();
    if (perTxLimit > dailyLimit) revert InvalidLimits();

        _policies[agent] = Policy({
            perTxLimit: perTxLimit,
            dailyLimit: dailyLimit,
            dailySpent: 0,
            windowStart: block.timestamp,
            status: AgentStatus.Active,
            merchantAllowlistEnabled: merchantAllowlistEnabled,
            humanOwner: msg.sender
        });

        emit AgentRegistered(agent, msg.sender, perTxLimit, dailyLimit);
    }

    // ─────────────────────────────────────────────────────────
    // Human Owner — Agent Lifecycle
    // ─────────────────────────────────────────────────────────

    /**
     * @notice Temporarily deactivate an agent.
     *         Use when agent is misbehaving but key is not compromised.
     *         Can be reactivated.
     */
    function deactivateAgent(address agent)
        external
        onlyHumanOwner(agent)
        agentMustExist(agent)
        agentNotRevoked(agent)
    {
        _policies[agent].status = AgentStatus.Deactivated;
        emit AgentDeactivated(agent, msg.sender);
    }

    /**
     * @notice Reactivate a deactivated agent.
     *         Cannot reactivate a revoked agent.
     */
    function reactivateAgent(address agent)
        external
        onlyHumanOwner(agent)
        agentMustExist(agent)
        agentNotRevoked(agent)
    {
        _policies[agent].status = AgentStatus.Active;
        emit AgentReactivated(agent, msg.sender);
    }

    /**
     * @notice Permanently revoke an agent. IRREVERSIBLE.
     *         Use when agent key is compromised.
     *         Register a new agent address afterwards.
     */
    function revokeAgent(address agent)
        external
        onlyHumanOwner(agent)
        agentMustExist(agent)
    {
        _policies[agent].status = AgentStatus.Revoked;
        emit AgentRevoked(agent, msg.sender);
    }

    // ─────────────────────────────────────────────────────────
    // Human Owner — Policy Management
    // ─────────────────────────────────────────────────────────

    /**
     * @notice Update spend limits for an existing active or deactivated agent.
     */
    function updatePolicy(
        address agent,
        uint256 perTxLimit,
        uint256 dailyLimit
    )
        external
        onlyHumanOwner(agent)
        agentMustExist(agent)
        agentNotRevoked(agent)
    {
        if (perTxLimit == 0 || dailyLimit == 0) revert InvalidLimits();
        if (perTxLimit > dailyLimit) revert InvalidLimits();

        Policy storage p = _policies[agent];
        p.perTxLimit = perTxLimit;
        p.dailyLimit = dailyLimit;

        emit PolicyUpdated(agent, perTxLimit, dailyLimit);
    }

    /**
     * @notice Enable or disable the merchant allowlist for an agent.
     *         When disabled, agent can pay any merchant within spend limits.
     */
    function toggleMerchantAllowlist(address agent, bool enabled)
        external
        onlyHumanOwner(agent)
        agentMustExist(agent)
        agentNotRevoked(agent)
    {
        _policies[agent].merchantAllowlistEnabled = enabled;
        emit AllowlistToggled(agent, enabled);
    }

    /**
     * @notice Add a merchant to an agent's allowlist.
     */
    function allowMerchant(address agent, address merchant)
        external
        onlyHumanOwner(agent)
        agentMustExist(agent)
        agentNotRevoked(agent)
    {
        if (merchant == address(0)) revert ZeroAddress();
        _merchantAllowed[agent][merchant] = true;
        emit MerchantAllowlisted(agent, merchant);
    }

    /**
     * @notice Remove a merchant from an agent's allowlist.
     */
    function removeMerchant(address agent, address merchant)
        external
        onlyHumanOwner(agent)
        agentMustExist(agent)
    {
        _merchantAllowed[agent][merchant] = false;
        emit MerchantRemoved(agent, merchant);
    }

    // ─────────────────────────────────────────────────────────
    // Agent — Payment Execution
    // ─────────────────────────────────────────────────────────

    /**
     * @notice Execute a policy-gated payment. Called by the agent directly.
     *         This is the core enforcement function — if it reverts, no money moves.
     *
     * @param merchant    Address receiving USDC (x402 service wallet on Base)
     * @param amount      USDC amount (6 decimals)
     * @param intentHash  keccak256(abi.encodePacked(intent string)) — logged for audit trail
     *
     * Prerequisites:
     *   - Agent must call usdc.approve(address(this), amount) before this call
     *   - Agent must be Active
     *   - Amount must pass per-tx and daily limits
     *   - Merchant must be allowed (if allowlist enabled)
     *
     * Flow (CEI):
     *   CHECKS  — status, allowlist, per-tx limit, daily limit
     *   EFFECTS — update dailySpent (and reset window if needed)
     *   INTERACT — safeTransferFrom (pulls USDC from agent to merchant)
     */
    function executePayment(
        address merchant,
        uint256 amount,
        bytes32 intentHash
    ) external nonReentrant whenNotPaused {
        if (merchant == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        address agent = msg.sender;
        Policy storage p = _policies[agent];

        // ── CHECKS ──────────────────────────────────────────

        // Agent must be active
        if (p.status != AgentStatus.Active) {
            emit PaymentBlocked(agent, merchant, amount, intentHash, "agent_not_active");
            revert AgentNotActive();
        }

        // Merchant allowlist check (O(1))
        if (p.merchantAllowlistEnabled && !_merchantAllowed[agent][merchant]) {
            emit PaymentBlocked(agent, merchant, amount, intentHash, "merchant_not_allowed");
            revert MerchantNotAllowed(merchant);
        }

        // Per-tx limit check
        if (amount > p.perTxLimit) {
            emit PaymentBlocked(agent, merchant, amount, intentHash, "exceeds_per_tx_limit");
            revert ExceedsPerTxLimit(amount, p.perTxLimit);
        }

        // Rolling 24h window reset
        if (block.timestamp >= p.windowStart + 24 hours) {
            p.dailySpent = 0;
            p.windowStart = block.timestamp;
        }

        // Daily limit check
        uint256 remaining = p.dailyLimit - p.dailySpent;
        if (amount > remaining) {
            emit PaymentBlocked(agent, merchant, amount, intentHash, "exceeds_daily_limit");
            revert ExceedsDailyLimit(amount, remaining);
        }

        // Allowance pre-flight check — gives API a clean revert reason before safeTransferFrom
        if (usdc.allowance(agent, address(this)) < amount) {
            emit PaymentBlocked(agent, merchant, amount, intentHash, "insufficient_allowance");
            revert("insufficient_allowance");
        }

        // ── EFFECTS ─────────────────────────────────────────

        p.dailySpent += amount;

        // ── INTERACTIONS ─────────────────────────────────────

        // Agent must have approved this contract for at least `amount`
        usdc.safeTransferFrom(agent, merchant, amount);

        emit PaymentExecuted(
            agent,
            merchant,
            amount,
            intentHash,
            p.dailySpent,
            block.timestamp
        );
    }

    // ─────────────────────────────────────────────────────────
    // Protocol Owner — Emergency Controls
    // ─────────────────────────────────────────────────────────

    /**
     * @notice Pause all payments globally. Emergency use only.
     *         Does NOT affect policy management — humans can still update/revoke agents.
     */
    function pause() external onlyProtocolOwner {
        _pause();
    }

    /**
     * @notice Unpause global payments.
     */
    function unpause() external onlyProtocolOwner {
        _unpause();
    }

    // ─────────────────────────────────────────────────────────
    // Protocol Owner — Two-Step Ownership Transfer
    // ─────────────────────────────────────────────────────────

    /**
     * @notice Propose a new protocol owner. New owner must accept.
     *         Prevents ownership loss from typo.
     */
    function transferProtocolOwnership(address newOwner) external onlyProtocolOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        pendingProtocolOwner = newOwner;
        emit ProtocolOwnershipTransferStarted(protocolOwner, newOwner);
    }

    /**
     * @notice Accept protocol ownership. Must be called by pending owner.
     */
    function acceptProtocolOwnership() external {
        if (msg.sender != pendingProtocolOwner) revert NotPendingOwner();
        emit ProtocolOwnershipTransferred(protocolOwner, msg.sender);
        protocolOwner = msg.sender;
        pendingProtocolOwner = address(0);
    }

    // ─────────────────────────────────────────────────────────
    // Views
    // ─────────────────────────────────────────────────────────

    /**
     * @notice Get the full policy for an agent.
     */
    function getPolicy(address agent) external view returns (Policy memory) {
        return _policies[agent];
    }

    /**
     * @notice Get the current status of an agent.
     */
    function agentStatus(address agent) external view returns (AgentStatus) {
        return _policies[agent].status;
    }

    /**
     * @notice Get the human owner of an agent.
     */
    function humanOwnerOf(address agent) external view returns (address) {
        return _policies[agent].humanOwner;
    }

    /**
     * @notice Check if a specific merchant is allowed for an agent.
     *         Returns true if allowlist is disabled (agent can pay anyone).
     */
    function isMerchantAllowed(address agent, address merchant)
        external
        view
        returns (bool)
    {
        Policy storage p = _policies[agent];
        if (!p.merchantAllowlistEnabled) return true;
        return _merchantAllowed[agent][merchant];
    }

    /**
     * @notice Get remaining daily budget for an agent.
     *         Accounts for rolling window reset.
     */
    function getRemainingDailyBudget(address agent)
        external
        view
        returns (uint256)
    {
        Policy storage p = _policies[agent];
        if (p.status == AgentStatus.NotRegistered) return 0;
        if (block.timestamp >= p.windowStart + 24 hours) return p.dailyLimit;
        return p.dailyLimit - p.dailySpent;
    }

    /**
     * @notice Check if a payment would pass policy without executing it.
     *         Useful for API pre-flight checks.
     * @return allowed  Whether the payment would be allowed
     * @return reason   Reason string if blocked (empty if allowed)
     */
    function checkPayment(
        address agent,
        address merchant,
        uint256 amount
    ) external view returns (bool allowed, string memory reason) {
        Policy storage p = _policies[agent];

        if (p.status != AgentStatus.Active)
            return (false, "agent_not_active");

        if (p.merchantAllowlistEnabled && !_merchantAllowed[agent][merchant])
            return (false, "merchant_not_allowed");

        if (amount > p.perTxLimit)
            return (false, "exceeds_per_tx_limit");

        uint256 effectiveSpent = (block.timestamp >= p.windowStart + 24 hours)
            ? 0
            : p.dailySpent;

        if (effectiveSpent + amount > p.dailyLimit)
            return (false, "exceeds_daily_limit");

        return (true, "");
    }
}
