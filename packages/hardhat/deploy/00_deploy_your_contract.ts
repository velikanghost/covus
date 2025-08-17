import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";

/**
 * Deploys the Covus Liquid Staking Protocol contracts
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployContracts: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  /*
    On localhost, the deployer account is the one that comes with Hardhat, which is already funded.

    When deploying to live networks (e.g `yarn deploy --network sepolia`), the deployer account
    should have sufficient balance to pay for the gas fees for contract creation.

    You can generate a random account with `yarn generate` or `yarn account:import` to import your
    existing PK which will fill DEPLOYER_PRIVATE_KEY_ENCRYPTED in the .env file (then used on hardhat.config.ts)
    You can run the `yarn account` command to check your balance in every network.
  */
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("🚀 Deploying Covus Liquid Staking Protocol...");

  // Deploy MockWETH first
  console.log("📦 Deploying MockWETH...");
  await deploy("MockWETH", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });
  const mockWETH = await hre.ethers.getContract<Contract>("MockWETH", deployer);

  // Deploy CovusVault vault
  console.log("🏦 Deploying CovusVault vault...");
  await deploy("CovusVault", {
    from: deployer,
    args: [mockWETH.target],
    log: true,
    autoMine: true,
  });
  const vault = await hre.ethers.getContract<Contract>("CovusVault", deployer);

  // Deploy StakingManager
  console.log("⚡ Deploying StakingManager...");
  await deploy("StakingManager", {
    from: deployer,
    args: [vault.target, mockWETH.target],
    log: true,
    autoMine: true,
  });
  const stakingManager = await hre.ethers.getContract<Contract>("StakingManager", deployer);

  // Deploy MockUSDC for additional trading pairs
  console.log("💵 Deploying MockUSDC...");
  await deploy("MockUSDC", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });
  const mockUSDC = await hre.ethers.getContract<Contract>("MockUSDC", deployer);

  // Deploy DEX with Bottles token
  console.log("🦄 Deploying DEX...");
  await deploy("DEX", {
    from: deployer,
    args: [vault.target],
    log: true,
    autoMine: true,
  });
  const dex = await hre.ethers.getContract<Contract>("DEX", deployer);

  // Only set up contract state on local network
  if (hre.network.name == "localhost" || hre.network.name == "somniaTestnet") {
    console.log("🔧 Setting up initial configuration for localhost...");

    // Get the deployer signer
    const deployerSigner = await hre.ethers.getSigner(deployer);

    // Fund the vault with initial ETH for testing
    const initialFunding = hre.ethers.parseEther("2");
    await vault.depositSTT(deployer, { value: initialFunding });
    console.log("✅ Funded vault with", hre.ethers.formatEther(initialFunding), "STT (minted shares)");

    // Fund the staking manager with some ETH for testing
    await deployerSigner.sendTransaction({
      to: stakingManager.target,
      value: hre.ethers.parseEther("2"),
    });
    console.log("✅ Funded staking manager with 2 STT");

    // Initialize DEX with liquidity
    console.log("💧 Initializing DEX liquidity...");
    const dexAddress = await dex.getAddress();
    console.log("Approving DEX (" + dexAddress + ") to take csSTT from main account...");
    await vault.approve(dexAddress, hre.ethers.parseEther("10000"));
    console.log("INIT exchange...");
    await dex.init(hre.ethers.parseEther("1"), {
      value: hre.ethers.parseEther("1"),
      gasLimit: 200000,
    });
  }

  console.log("\n🎉 Covus Liquid Staking Protocol deployed successfully!");
  console.log("   MockWETH:", mockWETH.target);
  console.log("   CovusVault Vault:", vault.target);
  console.log("   StakingManager:", stakingManager.target);
  console.log("   MockUSDC:", mockUSDC.target);
  console.log("   DEX:", dex.target);

  console.log("\n🔗 Next Steps:");
  console.log("   1. Start the frontend: yarn start");
  console.log("   2. Test deposits and withdrawals");
  console.log("   3. Simulate staking rewards via StakingManager");
  console.log("   4. Test DEX trading at /dex");
};

export default deployContracts;
