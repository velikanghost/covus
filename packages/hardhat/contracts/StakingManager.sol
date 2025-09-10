// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IWETH } from "./interfaces/IWETH.sol";
import { CovusVault } from "./CovusVault.sol";

/**
 * @title StakingManager
 * @notice Mock validator operator that takes STT from the vault, simulates staking,
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
     * @notice Pull WSTT from vault and simulate staking it in validators.
     */
    function stake(uint256 amount) external {
        require(IERC20(address(WETH)).transferFrom(address(vault), address(this), amount), "pull failed");

        emit Staked(msg.sender, amount);
        // In a real setup, this STT would now be locked in validators.
    }

    /**
     * @notice Simulate validator rewards being sent back to vault.
     * @dev Here we just mint STT from nowhere in local tests
     */
    function sendRewards(uint256 amount) external {
        // For testing, we need to have STT to send
        require(address(this).balance >= amount, "insufficient STT balance");
        (bool ok, ) = payable(address(vault)).call{ value: amount }("");
        require(ok, "send failed");
        emit RewardsSent(address(vault), amount);
    }

    // Accept STT
    receive() external payable {}
}
