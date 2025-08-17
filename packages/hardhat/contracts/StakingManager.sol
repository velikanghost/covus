// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IWETH } from "./interfaces/IWETH.sol";
import { CovusVault } from "./CovusVault.sol";

/**
 * @title StakingManager
 * @notice Mock validator operator that takes ETH from the vault, simulates staking,
 *         and sends rewards or principal back later.
 */
contract StakingManager {
    CovusVault public immutable vault;
    IWETH public immutable WETH;

    event Staked(address indexed from, uint256 amount);
    event Unstaked(address indexed to, uint256 amount);
    event RewardsSent(address indexed to, uint256 amount);

    constructor(address _vault, address _weth) {
        vault = CovusVault(payable(_vault));
        WETH = IWETH(_weth);
    }

    /**
     * @notice Pull WETH from vault and simulate staking it in validators.
     *         In production this would trigger ETH2 deposits via depositContract.
     */
    function stake(uint256 amount) external {
        // Pull from vault
        require(IERC20(address(WETH)).transferFrom(address(vault), address(this), amount), "pull failed");

        emit Staked(msg.sender, amount);
        // In a real setup, this ETH would now be locked in Beacon Chain validators.
    }

    /**
     * @notice Simulate validator rewards being sent back to vault.
     * @dev Here we just mint ETH from nowhere in local tests (unsafe in prod!)
     */
    function sendRewards(uint256 amount) external {
        // For testing, we need to have ETH to send
        require(address(this).balance >= amount, "insufficient ETH balance");
        // Send ETH directly to vault's receive() to trigger wrap & accounting
        (bool ok, ) = payable(address(vault)).call{ value: amount }("");
        require(ok, "send failed");
        emit RewardsSent(address(vault), amount);
    }

    /**
     * @notice Simulate unstaking: send ETH back to vault to replenish liquidity.
     * @dev In real life, validator exits would credit ETH here after withdrawal delay.
     */
    function unstake(uint256 amount) external {
        // For testing, we need to have ETH to send
        require(address(this).balance >= amount, "insufficient ETH balance");
        // Pay vault in ETH
        (bool ok, ) = payable(address(vault)).call{ value: amount }("");
        require(ok, "unstake send failed");
        emit Unstaked(address(vault), amount);
    }

    // Accept ETH
    receive() external payable {}
}
