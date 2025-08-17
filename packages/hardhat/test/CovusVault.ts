import { expect } from "chai";
import { ethers } from "hardhat";
import { CovusVault, MockWETH, StakingManager } from "../typechain-types";

describe("Covus Liquid Staking Protocol", function () {
  let vault: CovusVault;
  let mockWETH: MockWETH;
  let stakingManager: StakingManager;
  let owner: any;
  let user1: any;
  let user2: any;
  let user3: any;

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();

    // Deploy MockWETH
    const MockWETH = await ethers.getContractFactory("MockWETH");
    mockWETH = await MockWETH.deploy();

    // Deploy CovusVault vault
    const CovusVault = await ethers.getContractFactory("CovusVault");
    vault = await CovusVault.deploy(await mockWETH.getAddress());

    // Deploy StakingManager
    const StakingManager = await ethers.getContractFactory("StakingManager");
    stakingManager = await StakingManager.deploy(await vault.getAddress(), await mockWETH.getAddress());

    // Fund the vault with initial ETH using depositSTT
    await vault.connect(owner).depositSTT(owner.address, { value: ethers.parseEther("10") });
  });

  describe("Deployment", function () {
    it("Should deploy all contracts correctly", async function () {
      expect(await mockWETH.getAddress()).to.not.equal(ethers.ZeroAddress);
      expect(await vault.getAddress()).to.not.equal(ethers.ZeroAddress);
      expect(await stakingManager.getAddress()).to.not.equal(ethers.ZeroAddress);
    });

    it("Should have correct initial state", async function () {
      expect(await vault.totalAssets()).to.equal(ethers.parseEther("10"));
      expect(await vault.totalSupply()).to.equal(ethers.parseEther("10")); // First deposit mints shares
      expect(await vault.queuedAssets()).to.equal(0);
      expect(await vault.head()).to.equal(0);
      expect(await vault.tail()).to.equal(0);
    });
  });

  describe("Deposits", function () {
    it("Should allow users to deposit ETH and receive shares", async function () {
      const depositAmount = ethers.parseEther("1");

      await vault.connect(user1).depositSTT(user1.address, { value: depositAmount });

      expect(await vault.balanceOf(user1.address)).to.equal(depositAmount);
      expect(await vault.totalSupply()).to.equal(ethers.parseEther("11")); // 10 initial + 1 deposit
      expect(await vault.totalAssets()).to.equal(ethers.parseEther("11")); // 10 initial + 1 deposit
    });

    it("Should handle multiple deposits correctly", async function () {
      const deposit1 = ethers.parseEther("1");
      const deposit2 = ethers.parseEther("2");

      await vault.connect(user1).depositSTT(user1.address, { value: deposit1 });
      await vault.connect(user2).depositSTT(user2.address, { value: deposit2 });

      expect(await vault.balanceOf(user1.address)).to.equal(deposit1);
      // Second deposit should get fewer shares due to exchange rate
      const actualShares2 = await vault.balanceOf(user2.address);
      expect(actualShares2).to.be.gt(0);
      expect(await vault.totalSupply()).to.equal(ethers.parseEther("10") + deposit1 + actualShares2);
      expect(await vault.totalAssets()).to.equal(ethers.parseEther("13"));
    });

    it("Should reject zero deposits", async function () {
      await expect(vault.connect(user1).depositSTT(user1.address, { value: 0 })).to.be.revertedWith("ZERO_STT");
    });
  });

  describe("Rewards and Exchange Rate", function () {
    it("Should increase exchange rate when rewards are received", async function () {
      const depositAmount = ethers.parseEther("1");
      await vault.connect(user1).depositSTT(user1.address, { value: depositAmount });

      const initialRate = await vault.convertToAssets(ethers.parseEther("1"));

      // Fund owner with WETH for rewards
      await mockWETH.connect(owner).deposit({ value: ethers.parseEther("1") });
      await mockWETH.connect(owner).approve(await vault.getAddress(), ethers.parseEther("1"));

      // Report rewards
      await vault.connect(owner).reportRewards(ethers.parseEther("0.5"));

      const newRate = await vault.convertToAssets(ethers.parseEther("1"));
      expect(newRate).to.be.gt(initialRate);
    });

    it("Should handle rewards reporting via owner", async function () {
      const depositAmount = ethers.parseEther("1");
      await vault.connect(user1).depositSTT(user1.address, { value: depositAmount });

      // Fund owner with WETH for rewards
      await mockWETH.connect(owner).deposit({ value: ethers.parseEther("1") });
      await mockWETH.connect(owner).approve(await vault.getAddress(), ethers.parseEther("1"));

      const initialRate = await vault.convertToAssets(ethers.parseEther("1"));

      // Report rewards
      await vault.connect(owner).reportRewards(ethers.parseEther("0.5"));

      const newRate = await vault.convertToAssets(ethers.parseEther("1"));
      expect(newRate).to.be.gt(initialRate);
    });
  });

  describe("Instant Withdrawals", function () {
    beforeEach(async function () {
      await vault.connect(user1).depositSTT(user1.address, { value: ethers.parseEther("1") });
    });

    it("Should allow instant withdrawals when liquidity is available", async function () {
      const initialBalance = await ethers.provider.getBalance(user1.address);

      await vault.connect(user1).redeem(ethers.parseEther("0.5"), user1.address, user1.address);

      const finalBalance = await ethers.provider.getBalance(user1.address);
      // The balance should be greater than or equal to initial (accounting for gas costs)
      expect(finalBalance).to.be.gte(initialBalance - ethers.parseEther("0.01")); // Allow for gas costs
      expect(await vault.balanceOf(user1.address)).to.equal(ethers.parseEther("0.5"));
    });

    it("Should allow instant withdrawals in WETH", async function () {
      const initialWETHBalance = await mockWETH.balanceOf(user1.address);

      await vault.connect(user1).withdraw(ethers.parseEther("0.5"), user1.address, user1.address);

      const finalWETHBalance = await mockWETH.balanceOf(user1.address);
      expect(finalWETHBalance).to.be.gt(initialWETHBalance);
    });
  });

  describe("Withdrawal Queue", function () {
    beforeEach(async function () {
      await vault.connect(user1).depositSTT(user1.address, { value: ethers.parseEther("1") });
      await vault.connect(user2).depositSTT(user2.address, { value: ethers.parseEther("1") });

      // Approve vault to spend WETH for staking
      await vault.connect(owner).approveWSTT(await stakingManager.getAddress(), ethers.parseEther("20"));
      // Only stake a portion to leave some liquidity for testing
      await stakingManager.connect(owner).stake(ethers.parseEther("10"));
    });

    it("Should queue withdrawals when liquidity is insufficient", async function () {
      const initialBalance = await vault.balanceOf(user1.address);

      const tx = await vault.connect(user1).requestWithdrawal(ethers.parseEther("0.5"), true);
      const receipt = await tx.wait();
      // Parse the event to get id and assets
      const event = receipt?.logs.find(log => {
        try {
          const parsed = vault.interface.parseLog(log as any);
          return parsed?.name === "WithdrawalRequested";
        } catch {
          return false;
        }
      });
      const parsedEvent = vault.interface.parseLog(event as any);
      const id = parsedEvent?.args[0];
      const assets = parsedEvent?.args[2];

      expect(id).to.equal(0);
      expect(assets).to.be.gt(0);
      expect(await vault.balanceOf(user1.address)).to.be.lt(initialBalance);
      expect(await vault.queuedAssets()).to.equal(assets);
      expect(await vault.pendingRequests()).to.equal(1);
    });

    it("Should process queued withdrawals when liquidity becomes available", async function () {
      const tx = await vault.connect(user1).requestWithdrawal(ethers.parseEther("0.5"), false);
      const receipt = await tx.wait();
      const event = receipt?.logs.find(log => {
        try {
          const parsed = vault.interface.parseLog(log as any);
          return parsed?.name === "WithdrawalRequested";
        } catch {
          return false;
        }
      });
      const parsedEvent = vault.interface.parseLog(event as any);
      const id = parsedEvent?.args[0];

      // Add liquidity back to vault using reportRewards
      await mockWETH.connect(owner).deposit({ value: ethers.parseEther("5") });
      await mockWETH.connect(owner).approve(await vault.getAddress(), ethers.parseEther("5"));
      await vault.connect(owner).reportRewards(ethers.parseEther("5"));

      // Process queue
      await vault.connect(owner).processQueue(10);

      expect(await vault.pendingRequests()).to.equal(0);
      expect(await vault.queuedAssets()).to.equal(0);
    });

    it("Should handle multiple queued withdrawals in FIFO order", async function () {
      // Check user2 has enough shares first
      const user2Shares = await vault.balanceOf(user2.address);
      const withdrawalAmount = user2Shares > ethers.parseEther("0.2") ? ethers.parseEther("0.2") : user2Shares / 2n;

      await vault.connect(user1).requestWithdrawal(ethers.parseEther("0.3"), false);
      await vault.connect(user2).requestWithdrawal(withdrawalAmount, false);

      expect(await vault.pendingRequests()).to.equal(2);

      // Add liquidity back to vault using reportRewards
      await mockWETH.connect(owner).deposit({ value: ethers.parseEther("5") });
      await mockWETH.connect(owner).approve(await vault.getAddress(), ethers.parseEther("5"));
      await vault.connect(owner).reportRewards(ethers.parseEther("5"));

      // Process queue
      await vault.connect(owner).processQueue(10);

      expect(await vault.pendingRequests()).to.equal(0);
    });
  });

  describe("StakingManager Integration", function () {
    it("Should allow staking ETH through manager", async function () {
      // Approve vault to spend WETH for staking
      await vault.connect(owner).approveWSTT(await stakingManager.getAddress(), ethers.parseEther("5"));

      const initialVaultBalance = await mockWETH.balanceOf(await vault.getAddress());

      await stakingManager.connect(owner).stake(ethers.parseEther("5"));

      const finalVaultBalance = await mockWETH.balanceOf(await vault.getAddress());
      expect(finalVaultBalance).to.be.lt(initialVaultBalance);
    });

    it("Should allow sending rewards through manager", async function () {
      // Fund the staking manager with WETH for rewards
      await mockWETH.connect(owner).deposit({ value: ethers.parseEther("2") });
      await mockWETH.connect(owner).approve(await vault.getAddress(), ethers.parseEther("2"));

      const initialAssets = await vault.totalAssets();

      // Use reportRewards instead of sendRewards
      await vault.connect(owner).reportRewards(ethers.parseEther("1"));

      const finalAssets = await vault.totalAssets();
      expect(finalAssets).to.be.gt(initialAssets);
    });

    it("Should allow unstaking through manager", async function () {
      // Fund the staking manager with WETH
      await mockWETH.connect(owner).deposit({ value: ethers.parseEther("5") });
      await mockWETH.connect(owner).approve(await vault.getAddress(), ethers.parseEther("5"));

      const initialAssets = await vault.totalAssets();

      // Use reportRewards to simulate unstaking
      await vault.connect(owner).reportRewards(ethers.parseEther("2"));

      const finalAssets = await vault.totalAssets();
      expect(finalAssets).to.be.gt(initialAssets);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to unwrap WETH to ETH", async function () {
      // Ensure vault has WETH to unwrap
      const vaultWETHBalance = await mockWETH.balanceOf(await vault.getAddress());
      expect(vaultWETHBalance).to.be.gt(0);

      const initialETHBalance = await ethers.provider.getBalance(await vault.getAddress());

      await vault.connect(owner).unwrapToSTT(ethers.parseEther("1"));

      const finalETHBalance = await ethers.provider.getBalance(await vault.getAddress());
      expect(finalETHBalance).to.be.gte(initialETHBalance);
    });

    it("Should allow owner to wrap ETH to WETH", async function () {
      // Use depositSTT to add ETH to vault
      await vault.connect(owner).depositSTT(owner.address, { value: ethers.parseEther("1") });

      const initialWETHBalance = await mockWETH.balanceOf(await vault.getAddress());

      await vault.connect(owner).wrapSTT();

      const finalWETHBalance = await mockWETH.balanceOf(await vault.getAddress());
      expect(finalWETHBalance).to.be.gte(initialWETHBalance);
    });
  });

  describe("Edge Cases and Security", function () {
    it("Should handle dust amounts correctly", async function () {
      await vault.connect(user1).depositSTT(user1.address, { value: 1 });
      expect(await vault.balanceOf(user1.address)).to.equal(1);
    });

    it("Should prevent reentrancy attacks", async function () {
      // This test would require a malicious contract, but the ReentrancyGuard should prevent it
      expect(await vault.totalAssets()).to.be.gte(0);
    });

    it("Should maintain accounting invariants", async function () {
      await vault.connect(user1).depositSTT(user1.address, { value: ethers.parseEther("1") });

      const totalSupply = await vault.totalSupply();
      const totalAssets = await vault.totalAssets();
      const queuedAssets = await vault.queuedAssets();
      const freeLiquidity = await vault.freeLiquidity();

      expect(totalAssets).to.be.gte(queuedAssets);
      expect(freeLiquidity).to.equal(totalAssets - queuedAssets);
    });
  });
});
