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

  // Deploy CovusVault vault
  console.log("Deploying CovusVault...");
  await deploy("CovusVault", {
    from: deployer,
    args: ["0xf22ef0085f6511f70b01a68f360dcc56261f768a"],
    log: true,
    autoMine: true,
  });
  const vault = await hre.ethers.getContract<Contract>("CovusVault", deployer);

  // Deploy StakingManager
  console.log("Deploying StakingManager...");
  await deploy("StakingManager", {
    from: deployer,
    args: [vault.target, "0xf22ef0085f6511f70b01a68f360dcc56261f768a"],
    log: true,
    autoMine: true,
  });
  const stakingManager = await hre.ethers.getContract<Contract>("StakingManager", deployer);

  // set up contract state
  if (hre.network.name == "localhost" || hre.network.name == "somniaTestnet") {
    console.log("Setting up initial configuration for localhost...");

    const deployerSigner = await hre.ethers.getSigner(deployer);

    // Fund the staking manager with some STT for testing
    await deployerSigner.sendTransaction({
      to: stakingManager.target,
      value: hre.ethers.parseEther("2"),
    });
    console.log("✅ Funded staking manager with 2 STT");
  }

  // Approve StakingManager to spend WSTT from vault
  await vault.approveWSTT(stakingManager.target, hre.ethers.parseEther("10000000"));
  console.log("✅ Approved StakingManager to spend vault WSTT");

  console.log("\n🎉 Covus Liquid Staking Protocol deployed successfully!");
  console.log("   CovusVault Vault:", vault.target);
  console.log("   StakingManager:", stakingManager.target);
};

export default deployContracts;
