// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * Minimal ERC-4626 liquid staking-style vault.
 * - Underlying asset: WSTT (wraps/unlocks STT for user convenience)
 * - Shares token: ERC20 (this contract is the shares token via OZ ERC4626/ ERC20 inheritance)
 * - Instant redemptions via standard ERC-4626 functions when there is sufficient on-hand liquidity
 * - Queued withdrawals when there isn't enough liquidity
 */

import { IERC20, ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { IERC20Metadata } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import { ERC4626 } from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { IWETH } from "./interfaces/IWETH.sol";

contract CovusVault is ERC4626, Ownable, ReentrancyGuard {
    /// @notice Amount of underlying assets that are reserved to satisfy queued withdrawals.
    uint256 public queuedAssets;

    /// @notice FIFO withdrawal queue
    struct Withdrawal {
        address owner; // receiver of assets when processed
        uint256 assets; // amount of underlying (WSTT) owed
        bool toSTT; // unwrap to native STT on payout
    }

    mapping(uint256 => Withdrawal) public withdrawals; // id => request
    uint256 public head; // next request id to process
    uint256 public tail; // next id to assign

    /// @notice Emergency pause flag
    bool public paused;

    /// @notice Maximum slippage allowed for redemptions (in basis points, e.g., 500 = 5%)
    uint256 public maxSlippageBps = 500; // 5% default

    event WithdrawalRequested(
        uint256 indexed id,
        address indexed owner,
        uint256 assets,
        uint256 sharesBurned,
        bool toSTT
    );
    event WithdrawalProcessed(uint256 indexed id, address indexed owner, uint256 assets, bool toSTT);
    event RewardsReported(uint256 amount);
    event Paused(address indexed by);
    event Unpaused(address indexed by);
    event SlippageUpdated(uint256 newSlippage);

    error InsufficientLiquidity();
    error SlippageTooHigh();
    error ContractPaused();

    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }

    constructor(
        IWETH _weth
    ) ERC20("CovusSTT Shares", "csSTT") ERC4626(IERC20Metadata(address(_weth))) Ownable(msg.sender) {}

    /*//////////////////////////////////////////////////////////////
                                DEPOSITS
    //////////////////////////////////////////////////////////////*/

    /// @notice Convenience: deposit native STT; it is wrapped into WSTT and deposited.
    function depositSTT(address receiver) external payable whenNotPaused returns (uint256 shares) {
        require(msg.value > 0, "ZERO_STT");

        uint256 assetsBefore = totalAssets();

        IWETH(address(asset())).deposit{ value: msg.value }();

        if (totalSupply() == 0) {
            shares = msg.value;
        } else {
            shares = (msg.value * totalSupply()) / assetsBefore;
        }

        _mint(receiver, shares);
    }

    /// @notice Owner can report rewards by transferring WSTT in and emitting an event.
    function reportRewards(uint256 amount) external onlyOwner whenNotPaused {
        if (amount > 0) {
            IERC20(address(asset())).transferFrom(msg.sender, address(this), amount);
            emit RewardsReported(amount);
        }
    }

    /*//////////////////////////////////////////////////////////////
                            ERC-4626 OVERRIDES
    //////////////////////////////////////////////////////////////*/

    /// @dev Exclude assets reserved for the withdrawal queue from the vault's accounting.
    function totalAssets() public view override returns (uint256) {
        uint256 bal = IERC20(address(asset())).balanceOf(address(this));
        if (bal < queuedAssets) return 0;
        return bal - queuedAssets;
    }

    /// @notice Withdraw with slippage protection, returns STT
    /// @param assets Amount of STT to withdraw
    /// @param maxShares Maximum shares to burn
    /// @param receiver Address to receive STT
    /// @param owner_ Owner of shares
    function withdrawSTT(
        uint256 assets,
        uint256 maxShares,
        address receiver,
        address owner_
    ) public whenNotPaused nonReentrant returns (uint256 shares) {
        shares = previewWithdraw(assets);

        // Check slippage
        if (shares > maxShares) revert SlippageTooHigh();

        uint256 free = IERC20(address(asset())).balanceOf(address(this)) - queuedAssets;
        if (assets > free) revert InsufficientLiquidity();

        // First get WSTT via standard withdraw
        shares = super.withdraw(assets, address(this), owner_);

        // Then unwrap WSTT to STT and send to receiver
        IWETH(address(asset())).withdraw(assets);
        (bool ok, ) = receiver.call{ value: assets }("");
        require(ok, "STT_SEND_FAIL");
    }

    /// @notice Redeem shares with slippage protection, returns STT
    /// @param shares Amount of shares to redeem
    /// @param minAssets Minimum STT to receive
    /// @param receiver Address to receive STT
    /// @param owner_ Owner of shares
    function redeemSTT(
        uint256 shares,
        uint256 minAssets,
        address receiver,
        address owner_
    ) public whenNotPaused nonReentrant returns (uint256 assets) {
        assets = previewRedeem(shares);

        // Check slippage
        if (assets < minAssets) revert SlippageTooHigh();

        uint256 free = IERC20(address(asset())).balanceOf(address(this)) - queuedAssets;
        if (assets > free) revert InsufficientLiquidity();

        // First get WSTT via standard redeem
        assets = super.redeem(shares, address(this), owner_);

        // Then unwrap WSTT to STT and send to receiver
        IWETH(address(asset())).withdraw(assets);
        (bool ok, ) = receiver.call{ value: assets }("");
        require(ok, "STT_SEND_FAIL");
    }

    /*//////////////////////////////////////////////////////////////
                          WITHDRAWAL QUEUE (FIFO)
    //////////////////////////////////////////////////////////////*/

    /// @notice Request a queued withdrawal when instant liquidity is insufficient (or by choice).
    /// Burns shares immediately and reserves assets from accounting via `queuedAssets`.
    /// The request will be paid out later in FIFO order by `processQueue`.
    function requestWithdrawal(
        uint256 shares
    ) external whenNotPaused nonReentrant returns (uint256 id, uint256 assets) {
        require(shares > 0, "ZERO_SHARES");
        assets = previewRedeem(shares);
        require(assets > 0, "ZERO_ASSETS");

        _burn(msg.sender, shares);

        queuedAssets += assets;

        id = tail++;
        withdrawals[id] = Withdrawal({ owner: msg.sender, assets: assets, toSTT: true });
        emit WithdrawalRequested(id, msg.sender, assets, shares, true);
    }

    /// @notice Process up to `maxRequests` from the FIFO queue, paying out if there is liquidity.
    function processQueue(uint256 maxRequests) public whenNotPaused nonReentrant {
        uint256 processed;
        IWETH _weth = IWETH(address(asset()));
        while (processed < maxRequests && head < tail) {
            Withdrawal storage w = withdrawals[head];
            if (w.owner == address(0)) {
                head++;
                continue;
            }

            uint256 free = IERC20(address(_weth)).balanceOf(address(this));
            if (free < w.assets) break;

            queuedAssets -= w.assets;

            _weth.withdraw(w.assets);
            (bool ok, ) = w.owner.call{ value: w.assets }("");
            require(ok, "STT_SEND_FAIL");

            emit WithdrawalProcessed(head, w.owner, w.assets, w.toSTT);
            delete withdrawals[head];
            head++;
            processed++;
        }
    }

    /// @notice View helper: number of pending requests in the queue.
    function pendingRequests() external view returns (uint256) {
        return tail - head;
    }

    /// @notice View helper: free (immediately withdrawable) liquidity in underlying units (WSTT).
    function freeLiquidity() public view returns (uint256) {
        return IERC20(address(asset())).balanceOf(address(this)) - queuedAssets;
    }

    /*//////////////////////////////////////////////////////////////
                        EXCHANGE RATE & PRICING
    //////////////////////////////////////////////////////////////*/

    /// @notice Get current csSTT/STT exchange rate
    /// @return rate Exchange rate (1e18 = 1:1 ratio)
    function getCsSTTSTTRate() external view returns (uint256 rate) {
        if (totalSupply() == 0) {
            return 1e18;
        }

        return (totalAssets() * 1e18) / totalSupply();
    }

    /// @notice Get csSTT price for external integrations
    /// @return price csSTT price in STT (should be ~1:1)
    /// @return timestamp Current block timestamp
    function getCsSTTPrice() external view returns (uint256 price, uint256 timestamp) {
        if (totalSupply() == 0) {
            return (1e18, block.timestamp);
        }

        price = (totalAssets() * 1e18) / totalSupply();
        timestamp = block.timestamp;

        return (price, timestamp);
    }

    /// @notice Check if exchange rate is healthy (within 5% of 1:1)
    /// @return True if rate is healthy
    function isExchangeRateHealthy() external view returns (bool) {
        uint256 rate = this.getCsSTTSTTRate();
        uint256 expectedRate = 1e18;

        uint256 deviation = rate > expectedRate ? rate - expectedRate : expectedRate - rate;
        uint256 deviationPercent = (deviation * 10000) / expectedRate;

        return deviationPercent <= 500;
    }

    /*//////////////////////////////////////////////////////////////
                        SLIPPAGE PROTECTION
    //////////////////////////////////////////////////////////////*/

    /// @notice Check if redemption would exceed slippage limits
    /// @param shares Amount of shares to redeem
    /// @return True if slippage is acceptable
    function isSlippageAcceptable(uint256 shares) external view returns (bool) {
        uint256 expectedAssets = shares;
        uint256 actualAssets = previewRedeem(shares);

        if (actualAssets >= expectedAssets) return true;

        uint256 slippage = ((expectedAssets - actualAssets) * 10000) / expectedAssets;
        return slippage <= maxSlippageBps;
    }

    /*//////////////////////////////////////////////////////////////
                        EMERGENCY CONTROLS
    //////////////////////////////////////////////////////////////*/

    /// @notice Pause all operations (owner only)
    function pause() external onlyOwner {
        paused = true;
        emit Paused(msg.sender);
    }

    /// @notice Unpause operations (owner only)
    function unpause() external onlyOwner {
        paused = false;
        emit Unpaused(msg.sender);
    }

    /// @notice Update maximum slippage (owner only)
    /// @param newSlippage New slippage in basis points
    function setMaxSlippage(uint256 newSlippage) external onlyOwner {
        require(newSlippage <= 1000, "Slippage too high");
        maxSlippageBps = newSlippage;
        emit SlippageUpdated(newSlippage);
    }

    /*//////////////////////////////////////////////////////////////
                        OWNER / ADMIN UTILITIES (DEMO)
    //////////////////////////////////////////////////////////////*/

    /// @notice Owner can unwrap some WSTT to STT to build an STT buffer for queued payouts to STT.
    function unwrapToSTT(uint256 amount) external onlyOwner whenNotPaused {
        IWETH(address(asset())).withdraw(amount);
    }

    /// @notice Owner can wrap any stray STT back to WSTT.
    function wrapSTT() external onlyOwner whenNotPaused {
        uint256 bal = address(this).balance;
        if (bal > 0) IWETH(address(asset())).deposit{ value: bal }();
    }

    /// @notice Owner can approve WSTT spending for staking operations.
    function approveWSTT(address spender, uint256 amount) external onlyOwner whenNotPaused {
        IERC20(address(asset())).approve(spender, amount);
    }

    receive() external payable {}
}
