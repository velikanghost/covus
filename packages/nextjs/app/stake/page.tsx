"use client";

import { useState } from "react";
import type { NextPage } from "next";
import { formatEther, parseEther } from "viem";
import { useAccount, useBalance } from "wagmi";
import { BoltIcon, ChevronRightIcon, WalletIcon } from "@heroicons/react/24/outline";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

const StakePage: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [activeTab, setActiveTab] = useState<"stake" | "unstake">("stake");

  // Read contract data
  const { data: totalAssets } = useScaffoldReadContract({
    contractName: "CovusVault",
    functionName: "totalAssets",
  });

  const { data: totalSupply } = useScaffoldReadContract({
    contractName: "CovusVault",
    functionName: "totalSupply",
  });

  const { data: userShares } = useScaffoldReadContract({
    contractName: "CovusVault",
    functionName: "balanceOf",
    args: [connectedAddress],
  });

  const { data: userAssets } = useScaffoldReadContract({
    contractName: "CovusVault",
    functionName: "convertToAssets",
    args: [userShares || 0n],
  });

  const { data: queuedAssets } = useScaffoldReadContract({
    contractName: "CovusVault",
    functionName: "queuedAssets",
  });

  const { data: freeLiquidity } = useScaffoldReadContract({
    contractName: "CovusVault",
    functionName: "freeLiquidity",
  });

  // User balances
  const { data: userETHBalance } = useBalance({
    address: connectedAddress,
  });

  // Write contract functions
  const { writeContractAsync: depositETH } = useScaffoldWriteContract("CovusVault");
  const { writeContractAsync: redeem } = useScaffoldWriteContract("CovusVault");
  const { writeContractAsync: requestWithdrawal } = useScaffoldWriteContract("CovusVault");

  // Calculate actual total assets (including queued assets) for display
  const actualTotalAssets = totalAssets && queuedAssets ? totalAssets + queuedAssets : totalAssets;

  // Calculate reverse exchange rate (how many csSTT 1 STT gets you)
  const reverseExchangeRate =
    totalSupply && actualTotalAssets && actualTotalAssets > 0n ? Number(totalSupply) / Number(actualTotalAssets) : 1;

  // Calculate APY (mock calculation for demo)
  const mockAPY = 4.2;
  const pendingRewards = userAssets ? Number(formatEther(userAssets)) * 0.01 : 0; // 1% of staked amount as pending rewards

  // Determine withdrawal type based on liquidity
  const getWithdrawalType = () => {
    if (!withdrawAmount || !freeLiquidity) return "withdrawal";
    const withdrawAmountWei = parseEther(withdrawAmount);
    return freeLiquidity >= withdrawAmountWei ? "instant" : "queued";
  };

  const handleDeposit = async () => {
    if (!depositAmount || !connectedAddress) return;

    setIsDepositing(true);
    try {
      await depositETH({
        functionName: "depositSTT",
        args: [connectedAddress],
        value: parseEther(depositAmount),
      });
      setDepositAmount("");
    } catch (error) {
      console.error("Deposit failed:", error);
    } finally {
      setIsDepositing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || !connectedAddress) return;

    setIsWithdrawing(true);
    try {
      // Convert STT amount to shares for withdrawal
      const sharesToBurn =
        totalSupply && actualTotalAssets && actualTotalAssets > 0n
          ? (parseEther(withdrawAmount) * totalSupply) / actualTotalAssets
          : parseEther(withdrawAmount);

      const withdrawAmountWei = parseEther(withdrawAmount);

      // Add 5% slippage tolerance
      const minAssets = ((withdrawAmountWei * 95n) / 100n).toString();

      if (freeLiquidity && freeLiquidity >= withdrawAmountWei) {
        // Use instant redemption with slippage protection
        await redeem({
          functionName: "redeemSTT",
          args: [sharesToBurn, BigInt(minAssets), connectedAddress, connectedAddress],
        });
      } else {
        // Use queue system when there's insufficient liquidity
        await requestWithdrawal({
          functionName: "requestWithdrawal",
          args: [sharesToBurn], // true = always return STT
        });
      }
      setWithdrawAmount("");
    } catch (error) {
      console.error("Withdrawal failed:", error);
    } finally {
      setIsWithdrawing(false);
    }
  };

  const formatNumber = (value: bigint | undefined) => {
    if (!value) return "0";
    return Number(formatEther(value)).toLocaleString();
  };

  const setMaxAmount = () => {
    if (activeTab === "stake") {
      setDepositAmount(formatEther(userETHBalance?.value || 0n));
    } else {
      // For withdrawal, show the STT value of user's shares
      setWithdrawAmount(formatEther(userAssets || 0n));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <div className="container mx-auto px-6 py-8">
        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Stake & Unstake</h1>
          <p className="text-lg text-gray-300">Stake STT and receive liquid csSTT tokens while earning rewards</p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Stake STT Section */}
          <div className="lg:col-span-2">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10">
              <h2 className="text-2xl font-bold text-white mb-2">Stake STT</h2>
              <p className="text-gray-300 mb-6">
                Stake your STT to receive liquid csSTT tokens and start earning rewards
              </p>

              {/* Tabs */}
              <div className="flex space-x-1 mb-6 bg-white/10 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab("stake")}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    activeTab === "stake" ? "bg-white text-gray-900 shadow-sm" : "text-gray-300 hover:text-white"
                  }`}
                >
                  Stake
                </button>
                <button
                  onClick={() => setActiveTab("unstake")}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    activeTab === "unstake" ? "bg-white text-gray-900 shadow-sm" : "text-gray-300 hover:text-white"
                  }`}
                >
                  Unstake
                </button>
              </div>

              {/* Input Section */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Amount to {activeTab === "stake" ? "Stake" : "Unstake"}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={activeTab === "stake" ? depositAmount : withdrawAmount}
                      onChange={e =>
                        activeTab === "stake" ? setDepositAmount(e.target.value) : setWithdrawAmount(e.target.value)
                      }
                      placeholder="0.0"
                      className="w-full px-4 py-3 pr-20 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                      <span className="text-gray-400">STT</span>
                      <button
                        onClick={setMaxAmount}
                        className="px-2 py-1 text-xs bg-white/20 text-gray-300 rounded hover:bg-white/30 transition-colors"
                      >
                        Max
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    Balance:{" "}
                    {activeTab === "stake"
                      ? formatNumber(userETHBalance?.value) + " STT"
                      : formatNumber(userShares) + " csSTT"}
                  </p>
                </div>

                <button
                  onClick={activeTab === "stake" ? handleDeposit : handleWithdraw}
                  disabled={
                    !connectedAddress ||
                    (activeTab === "stake" ? !depositAmount : !withdrawAmount) ||
                    (activeTab === "stake" ? isDepositing : isWithdrawing)
                  }
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 disabled:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  {!connectedAddress ? (
                    <>
                      <WalletIcon className="h-5 w-5" />
                      <span>Connect Wallet to {activeTab === "stake" ? "Stake" : "Unstake"}</span>
                    </>
                  ) : (
                    <>
                      <span>
                        {activeTab === "stake"
                          ? isDepositing
                            ? "Staking..."
                            : "Stake STT"
                          : isWithdrawing
                            ? "Unstaking..."
                            : activeTab === "unstake" && withdrawAmount
                              ? getWithdrawalType() === "instant"
                                ? "Instant Unstake STT"
                                : "Queue Unstake STT"
                              : "Unstake STT"}
                      </span>
                      <ChevronRightIcon className="h-5 w-5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Portfolio Section */}
          <div className="space-y-6">
            {/* Your Portfolio */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <div className="flex items-center mb-4">
                <BoltIcon className="h-5 w-5 text-yellow-400 mr-2" />
                <h3 className="text-lg font-semibold text-white">Your Portfolio</h3>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-300">Staked STT</span>
                  <span className="font-medium text-white">{formatNumber(userAssets)} STT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">csSTT Balance</span>
                  <span className="font-medium text-white">{formatNumber(userShares)} csSTT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Pending Rewards</span>
                  <span className="font-medium text-green-400">+{pendingRewards.toFixed(3)} STT</span>
                </div>
                <div className="border-t border-white/10 pt-3">
                  <div className="flex justify-between">
                    <span className="font-semibold text-white">Total Value</span>
                    <span className="font-bold text-white">
                      {(Number(formatEther(userAssets || 0n)) + pendingRewards).toFixed(1)} STT
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-300">Current APY</span>
                  <span className="font-medium text-white">{mockAPY}%</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full"
                    style={{ width: "100%" }}
                  ></div>
                </div>
                <p className="text-xs text-gray-400 mt-1">Earning rewards since staking began</p>
              </div>
            </div>

            {/* Exchange Rate Info */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">Exchange Rate</h3>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">1 STT = {reverseExchangeRate.toFixed(3)} csSTT</p>
                <p className="text-sm text-gray-400 mt-1">Updated every epoch</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StakePage;
