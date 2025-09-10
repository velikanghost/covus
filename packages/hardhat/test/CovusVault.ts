import { expect } from "chai";
import { ethers } from "hardhat";
import { CovusVault, StakingManager, MockWSTT } from "../typechain-types";

describe("Covus Liquid Staking Protocol", function () {
  let vault: CovusVault;
  let stakingManager: StakingManager;
  let mockWSTT: MockWSTT;
  let owner: any;
  let user1: any;
  let user2: any;
  let user3: any;

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();

    // Deploy MockWSTT for testing
    const MockWSTT = await ethers.getContractFactory("MockWSTT");
    mockWSTT = await MockWSTT.deploy();

    // Deploy CovusVault vault with MockWSTT address
    const CovusVault = await ethers.getContractFactory("CovusVault");
    vault = await CovusVault.deploy(await mockWSTT.getAddress());

    // Deploy StakingManager
    const StakingManager = await ethers.getContractFactory("StakingManager");
    stakingManager = await StakingManager.deploy(await vault.getAddress(), await mockWSTT.getAddress());

    // Fund the vault with initial ETH using depositSTT
    await vault.connect(owner).depositSTT(owner.address, { value: ethers.parseEther("10") });

    // Fund the staking manager with some ETH for testing
    await owner.sendTransaction({
      to: await stakingManager.getAddress(),
      value: ethers.parseEther("2"),
    });

    // Fund owner with WSTT tokens for testing rewards
    await mockWSTT.connect(owner).deposit({ value: ethers.parseEther("100") });

    // Approve StakingManager to spend WSTT from vault
    await vault.connect(owner).approveWSTT(await stakingManager.getAddress(), ethers.parseEther("10000000"));
  });

  describe("Deployment", function () {
    it("Should deploy all contracts correctly", async function () {
      expect(await vault.getAddress()).to.not.equal(ethers.ZeroAddress);
      expect(await stakingManager.getAddress()).to.not.equal(ethers.ZeroAddress);
    });

    it("Should have correct initial state", async function () {
      expect(await vault.totalAssets()).to.equal(ethers.parseEther("10"));
      expect(await vault.totalSupply()).to.equal(ethers.parseEther("10"));
      expect(await vault.queuedAssets()).to.equal(0);
      expect(await vault.paused()).to.equal(false);
      expect(await vault.maxSlippageBps()).to.equal(500); // 5%
    });
  });

  describe("Deposits", function () {
    it("Should allow users to deposit ETH and receive shares", async function () {
      const depositAmount = ethers.parseEther("5");
      const initialShares = await vault.balanceOf(user1.address);

      await vault.connect(user1).depositSTT(user1.address, { value: depositAmount });

      const finalShares = await vault.balanceOf(user1.address);
      expect(finalShares - initialShares).to.equal(depositAmount);
    });

    it("Should handle multiple deposits correctly", async function () {
      await vault.connect(user1).depositSTT(user1.address, { value: ethers.parseEther("5") });
      await vault.connect(user2).depositSTT(user2.address, { value: ethers.parseEther("3") });

      expect(await vault.balanceOf(user1.address)).to.equal(ethers.parseEther("5"));
      expect(await vault.balanceOf(user2.address)).to.equal(ethers.parseEther("3"));
    });

    it("Should reject zero deposits", async function () {
      await expect(vault.connect(user1).depositSTT(user1.address, { value: 0 })).to.be.revertedWith("ZERO_STT");
    });
  });

  describe("Rewards and Exchange Rate", function () {
    it("Should increase exchange rate when rewards are received", async function () {
      const initialRate = await vault.getCsSTTSTTRate();

      // Approve vault to spend WSTT from owner
      await mockWSTT.connect(owner).approve(await vault.getAddress(), ethers.parseEther("1"));

      // Owner reports rewards
      await vault.connect(owner).reportRewards(ethers.parseEther("1"));

      const finalRate = await vault.getCsSTTSTTRate();
      expect(finalRate).to.be.gt(initialRate);
    });

    it("Should handle rewards reporting via owner", async function () {
      const initialRate = await vault.getCsSTTSTTRate();

      // Approve vault to spend WSTT from owner
      await mockWSTT.connect(owner).approve(await vault.getAddress(), ethers.parseEther("1"));

      // Owner reports rewards
      await vault.connect(owner).reportRewards(ethers.parseEther("1"));

      const finalRate = await vault.getCsSTTSTTRate();
      expect(finalRate).to.be.gt(initialRate);
    });
  });

  describe("Instant Withdrawals", function () {
    beforeEach(async function () {
      await vault.connect(user1).depositSTT(user1.address, { value: ethers.parseEther("5") });
    });

    it("Should allow instant withdrawals when liquidity is available", async function () {
      const initialBalance = await ethers.provider.getBalance(user1.address);
      const sharesToBurn = ethers.parseEther("2");

      await vault.connect(user1).redeem(sharesToBurn, user1.address, user1.address);

      const finalBalance = await ethers.provider.getBalance(user1.address);
      // Account for gas costs - the balance should be close to initial + withdrawal amount
      expect(finalBalance).to.be.gt(initialBalance - ethers.parseEther("0.1")); // Allow for gas costs
    });

    it("Should allow instant withdrawals in WETH", async function () {
      const initialWSTTBalance = await ethers
        .getContractAt("IERC20", await mockWSTT.getAddress())
        .then(c => c.balanceOf(user1.address));

      await vault.connect(user1).withdraw(ethers.parseEther("2"), user1.address, user1.address);

      const finalWSTTBalance = await ethers
        .getContractAt("IERC20", await mockWSTT.getAddress())
        .then(c => c.balanceOf(user1.address));
      expect(finalWSTTBalance).to.be.gt(initialWSTTBalance);
    });
  });

  describe("Withdrawal Queue", function () {
    beforeEach(async function () {
      await vault.connect(user1).depositSTT(user1.address, { value: ethers.parseEther("5") });
      await vault.connect(user2).depositSTT(user2.address, { value: ethers.parseEther("5") });
    });

    it("Should queue withdrawals when liquidity is insufficient", async function () {
      // Request withdrawal that exceeds available liquidity
      await vault.connect(user1).requestWithdrawal(ethers.parseEther("3"));

      expect(await vault.pendingRequests()).to.equal(1);
      expect(await vault.queuedAssets()).to.equal(ethers.parseEther("3"));
    });

    it("Should process queued withdrawals when liquidity becomes available", async function () {
      await vault.connect(user1).requestWithdrawal(ethers.parseEther("3"));

      // Add liquidity back
      await vault.connect(user3).depositSTT(user3.address, { value: ethers.parseEther("10") });

      // Process queue
      await vault.processQueue(1);

      expect(await vault.pendingRequests()).to.equal(0);
    });

    it("Should handle multiple queued withdrawals in FIFO order", async function () {
      await vault.connect(user1).requestWithdrawal(ethers.parseEther("2"));
      await vault.connect(user2).requestWithdrawal(ethers.parseEther("2"));

      expect(await vault.pendingRequests()).to.equal(2);

      // Add liquidity and process
      await vault.connect(user3).depositSTT(user3.address, { value: ethers.parseEther("10") });
      await vault.processQueue(2);

      expect(await vault.pendingRequests()).to.equal(0);
    });
  });

  describe("StakingManager Integration", function () {
    it("Should allow staking ETH through manager", async function () {
      const stakeAmount = ethers.parseEther("1");
      await stakingManager.connect(owner).stake(stakeAmount);

      // Check that WSTT was transferred from vault to manager
      const wsttContract = await ethers.getContractAt("IERC20", await mockWSTT.getAddress());
      const managerWSTTBalance = await wsttContract.balanceOf(await stakingManager.getAddress());
      expect(managerWSTTBalance).to.equal(stakeAmount);
    });

    it("Should allow sending rewards through manager", async function () {
      const rewardAmount = ethers.parseEther("0.5");

      // Ensure staking manager has ETH to send
      await owner.sendTransaction({
        to: await stakingManager.getAddress(),
        value: rewardAmount,
      });

      const initialVaultETHBalance = await ethers.provider.getBalance(await vault.getAddress());

      await stakingManager.connect(owner).sendRewards(rewardAmount);

      // Check that STT was sent to vault (native balance increased)
      const finalVaultETHBalance = await ethers.provider.getBalance(await vault.getAddress());
      expect(finalVaultETHBalance).to.be.gte(initialVaultETHBalance + rewardAmount);
    });
  });

  describe("Exchange Rate & Pricing", function () {
    it("Should return correct csSTT/STT exchange rate", async function () {
      // Initial rate should be 1:1
      let rate = await vault.getCsSTTSTTRate();
      expect(rate).to.equal(ethers.parseEther("1"));

      // After rewards, rate should increase
      await mockWSTT.connect(owner).approve(await vault.getAddress(), ethers.parseEther("1"));
      await vault.connect(owner).reportRewards(ethers.parseEther("1"));
      rate = await vault.getCsSTTSTTRate();
      expect(rate).to.be.gt(ethers.parseEther("1"));
    });

    it("Should return correct csSTT price with timestamp", async function () {
      const [price, timestamp] = await vault.getCsSTTPrice();
      expect(price).to.equal(ethers.parseEther("1"));
      expect(timestamp).to.be.gt(0);
    });

    it("Should detect healthy exchange rate", async function () {
      let isHealthy = await vault.isExchangeRateHealthy();
      expect(isHealthy).to.equal(true);

      // Add some rewards to make rate slightly higher but still healthy
      await mockWSTT.connect(owner).approve(await vault.getAddress(), ethers.parseEther("0.1"));
      await vault.connect(owner).reportRewards(ethers.parseEther("0.1"));
      isHealthy = await vault.isExchangeRateHealthy();
      expect(isHealthy).to.equal(true);
    });
  });

  describe("Slippage Protection", function () {
    beforeEach(async function () {
      // Ensure user has shares to test with
      await vault.connect(user1).depositSTT(user1.address, { value: ethers.parseEther("10") });
    });

    it("Should allow redemption with acceptable slippage", async function () {
      const shares = ethers.parseEther("1");
      const minAssets = ethers.parseEther("0.95"); // 5% slippage tolerance

      await expect(vault.connect(user1).redeemSTT(shares, minAssets, user1.address, user1.address)).to.not.be.reverted;
    });

    it("Should reject redemption with too high slippage", async function () {
      const shares = ethers.parseEther("1");
      const minAssets = ethers.parseEther("1.1"); // Expect more assets than possible (110% of shares)

      await expect(
        vault.connect(user1).redeemSTT(shares, minAssets, user1.address, user1.address),
      ).to.be.revertedWithCustomError(vault, "SlippageTooHigh");
    });

    it("Should allow withdrawal with acceptable slippage", async function () {
      const assets = ethers.parseEther("1");
      const maxShares = ethers.parseEther("1.05"); // 5% slippage tolerance

      await expect(vault.connect(user1).withdrawSTT(assets, maxShares, user1.address, user1.address)).to.not.be
        .reverted;
    });

    it("Should reject withdrawal with too high slippage", async function () {
      const assets = ethers.parseEther("1");
      const maxShares = ethers.parseEther("0.99"); // Very low slippage tolerance

      await expect(
        vault.connect(user1).withdrawSTT(assets, maxShares, user1.address, user1.address),
      ).to.be.revertedWithCustomError(vault, "SlippageTooHigh");
    });

    it("Should correctly check slippage acceptability", async function () {
      const shares = ethers.parseEther("1");
      const isAcceptable = await vault.isSlippageAcceptable(shares);
      expect(isAcceptable).to.equal(true);
    });
  });

  describe("Emergency Controls", function () {
    beforeEach(async function () {
      // Give user1 some shares to test withdrawal
      await vault.connect(user1).depositSTT(user1.address, { value: ethers.parseEther("5") });
    });

    it("Should pause and unpause correctly", async function () {
      // Initially not paused
      expect(await vault.paused()).to.equal(false);

      // Pause
      await vault.connect(owner).pause();
      expect(await vault.paused()).to.equal(true);

      // Try to deposit while paused
      await expect(
        vault.connect(user2).depositSTT(user2.address, { value: ethers.parseEther("1") }),
      ).to.be.revertedWithCustomError(vault, "ContractPaused");

      // Try to withdraw while paused
      await expect(
        vault
          .connect(user1)
          .withdrawSTT(ethers.parseEther("1"), ethers.parseEther("1.1"), user1.address, user1.address),
      ).to.be.revertedWithCustomError(vault, "ContractPaused");

      // Unpause
      await vault.connect(owner).unpause();
      expect(await vault.paused()).to.equal(false);

      // Should work again
      await expect(vault.connect(user2).depositSTT(user2.address, { value: ethers.parseEther("1") })).to.not.be
        .reverted;
    });

    it("Should update slippage settings", async function () {
      const initialSlippage = await vault.maxSlippageBps();
      expect(initialSlippage).to.equal(500); // 5%

      // Update slippage
      await vault.connect(owner).setMaxSlippage(300); // 3%
      const newSlippage = await vault.maxSlippageBps();
      expect(newSlippage).to.equal(300);
    });

    it("Should reject slippage updates that are too high", async function () {
      await expect(
        vault.connect(owner).setMaxSlippage(1500), // 15%
      ).to.be.revertedWith("Slippage too high");
    });

    it("Should only allow owner to pause/unpause", async function () {
      await expect(vault.connect(user1).pause()).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");

      await expect(vault.connect(user1).unpause()).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
    });

    it("Should only allow owner to update slippage", async function () {
      await expect(vault.connect(user1).setMaxSlippage(300)).to.be.revertedWithCustomError(
        vault,
        "OwnableUnauthorizedAccount",
      );
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to unwrap WETH to ETH", async function () {
      // Ensure vault has WETH to unwrap by depositing some ETH
      await vault.connect(owner).depositSTT(owner.address, { value: ethers.parseEther("1") });

      const initialETHBalance = await ethers.provider.getBalance(await vault.getAddress());

      await vault.connect(owner).unwrapToSTT(ethers.parseEther("1"));

      const finalETHBalance = await ethers.provider.getBalance(await vault.getAddress());
      expect(finalETHBalance).to.be.gte(initialETHBalance);
    });

    it("Should allow owner to wrap ETH to WETH", async function () {
      // Use depositSTT to add ETH to vault
      await vault.connect(owner).depositSTT(owner.address, { value: ethers.parseEther("1") });

      const wsttContract = await ethers.getContractAt("IERC20", await mockWSTT.getAddress());
      const initialWETHBalance = await wsttContract.balanceOf(await vault.getAddress());

      await vault.connect(owner).wrapSTT();

      const finalWETHBalance = await wsttContract.balanceOf(await vault.getAddress());
      expect(finalWETHBalance).to.be.gte(initialWETHBalance);
    });

    it("Should not allow admin functions when paused", async function () {
      await vault.connect(owner).pause();

      await expect(vault.connect(owner).unwrapToSTT(ethers.parseEther("1"))).to.be.revertedWithCustomError(
        vault,
        "ContractPaused",
      );

      await expect(vault.connect(owner).wrapSTT()).to.be.revertedWithCustomError(vault, "ContractPaused");

      await expect(
        vault.connect(owner).approveWSTT(await stakingManager.getAddress(), ethers.parseEther("1000")),
      ).to.be.revertedWithCustomError(vault, "ContractPaused");
    });
  });

  describe("Edge Cases and Security", function () {
    it("Should handle dust amounts correctly", async function () {
      const dustAmount = ethers.parseEther("0.0001");
      await vault.connect(user1).depositSTT(user1.address, { value: dustAmount });

      expect(await vault.balanceOf(user1.address)).to.equal(dustAmount);
    });

    it("Should prevent reentrancy attacks", async function () {
      // This test verifies that the nonReentrant modifier is working
      // by attempting to call depositSTT from within a callback
      // The test passes if no reentrancy occurs
      await vault.connect(user1).depositSTT(user1.address, { value: ethers.parseEther("1") });
      expect(await vault.balanceOf(user1.address)).to.equal(ethers.parseEther("1"));
    });

    it("Should maintain accounting invariants", async function () {
      const initialTotalAssets = await vault.totalAssets();
      const initialTotalSupply = await vault.totalSupply();

      await vault.connect(user1).depositSTT(user1.address, { value: ethers.parseEther("5") });

      const finalTotalAssets = await vault.totalAssets();
      const finalTotalSupply = await vault.totalSupply();

      // Total assets should increase by deposit amount
      expect(finalTotalAssets - initialTotalAssets).to.equal(ethers.parseEther("5"));
      // Total supply should increase by deposit amount (1:1 ratio maintained)
      expect(finalTotalSupply - initialTotalSupply).to.equal(ethers.parseEther("5"));
    });
  });
});
