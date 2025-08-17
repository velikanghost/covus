"use client";

import { useEffect, useState } from "react";
import type { NextPage } from "next";
import { formatEther, parseEther } from "viem";
import { useAccount, useBalance } from "wagmi";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BoltIcon,
  ChartBarIcon,
  ChevronRightIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

const Home: NextPage = () => {
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

  // User balances
  const { data: userETHBalance } = useBalance({
    address: connectedAddress,
  });

  // Write contract functions
  const { writeContractAsync: depositETH } = useScaffoldWriteContract("CovusVault");
  const { writeContractAsync: requestWithdrawal } = useScaffoldWriteContract("CovusVault");

  // Calculate actual total assets (including queued assets) for display
  const actualTotalAssets = totalAssets && queuedAssets ? totalAssets + queuedAssets : totalAssets;

  // Calculate exchange rate (how many ETH 1 csSTT is worth) - using actual total assets
  const exchangeRate =
    actualTotalAssets && totalSupply && totalSupply > 0n ? Number(actualTotalAssets) / Number(totalSupply) : 1;

  // Calculate reverse exchange rate (how many csSTT 1 ETH gets you)
  const reverseExchangeRate =
    totalSupply && actualTotalAssets && actualTotalAssets > 0n ? Number(totalSupply) / Number(actualTotalAssets) : 1;

  // Calculate APY (mock calculation for demo)
  const mockAPY = 4.2;
  const mockAPYChange = 0.2;
  const protocolFee = 10;
  const validatorCount = 89106;
  const pendingRewards = userAssets ? Number(formatEther(userAssets)) * 0.01 : 0; // 1% of staked amount as pending rewards

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
      // Convert ETH amount to shares for withdrawal
      const sharesToBurn =
        totalSupply && actualTotalAssets && actualTotalAssets > 0n
          ? (parseEther(withdrawAmount) * totalSupply) / actualTotalAssets
          : parseEther(withdrawAmount);

      await requestWithdrawal({
        functionName: "requestWithdrawal",
        args: [sharesToBurn, false], // false = withdraw as WETH
      });
      setWithdrawAmount("");
    } catch (error) {
      console.error("Withdrawal request failed:", error);
    } finally {
      setIsWithdrawing(false);
    }
  };

  const formatNumber = (value: bigint | undefined, decimals: number = 18) => {
    if (!value) return "0";
    return Number(formatEther(value)).toLocaleString();
  };

  const setMaxAmount = () => {
    if (activeTab === "stake") {
      setDepositAmount(formatEther(userETHBalance?.value || 0n));
    } else {
      // For withdrawal, show the ETH value of user's shares
      setWithdrawAmount(formatEther(userAssets || 0n));
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="container mx-auto px-6 py-8">
          {/* Protocol Title */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Liquid Staking Protocol</h1>
            <p className="text-lg text-gray-600">Stake ETH and receive liquid csSTT tokens while earning rewards</p>
          </div>

          {/* Protocol Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-500">Total Staked</h3>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(totalAssets)} ETH</p>
              <p className="text-sm text-gray-500">Across {validatorCount.toLocaleString()} validators</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-500">Network APY</h3>
              </div>
              <p className="text-2xl font-bold text-gray-900">{mockAPY}%</p>
              <p className="text-sm text-green-600">⬆️ +{mockAPYChange}% this week</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-500">Protocol Fee</h3>
              </div>
              <p className="text-2xl font-bold text-gray-900">{protocolFee}%</p>
              <p className="text-sm text-gray-500">Applied to rewards</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-500">Exchange Rate</h3>
              </div>
              <p className="text-2xl font-bold text-gray-900">1 ETH = {reverseExchangeRate.toFixed(3)} csSTT</p>
              <p className="text-sm text-gray-500">Updated every epoch</p>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Stake ETH Section */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Stake ETH</h2>
                <p className="text-gray-600 mb-6">
                  Stake your ETH to receive liquid csSTT tokens and start earning rewards
                </p>

                {/* Tabs */}
                <div className="flex space-x-1 mb-6 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setActiveTab("stake")}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                      activeTab === "stake" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Stake
                  </button>
                  <button
                    onClick={() => setActiveTab("unstake")}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                      activeTab === "unstake" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Unstake
                  </button>
                </div>

                {/* Input Section */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                        className="w-full px-4 py-3 pr-20 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                        <span className="text-gray-500">ETH</span>
                        <button
                          onClick={setMaxAmount}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                        >
                          Max
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Balance:{" "}
                      {activeTab === "stake"
                        ? formatNumber(userETHBalance?.value) + " ETH"
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
                    className="w-full bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2"
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
                              : "Stake ETH"
                            : isWithdrawing
                              ? "Unstaking..."
                              : "Unstake ETH"}
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
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center mb-4">
                  <BoltIcon className="h-5 w-5 text-yellow-500 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Your Portfolio</h3>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Staked ETH</span>
                    <span className="font-medium">{formatNumber(userAssets)} ETH</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">csSTT Balance</span>
                    <span className="font-medium">{formatNumber(userShares)} csSTT</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pending Rewards</span>
                    <span className="font-medium text-green-600">+{pendingRewards.toFixed(3)} ETH</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-900">Total Value</span>
                      <span className="font-bold text-gray-900">
                        {(Number(formatEther(userAssets || 0n)) + pendingRewards).toFixed(1)} ETH
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Current APY</span>
                    <span className="font-medium">{mockAPY}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-teal-400 h-2 rounded-full" style={{ width: "100%" }}></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Earning rewards since staking began</p>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                <div className="text-center py-8 text-gray-500">
                  <p>No recent activity</p>
                </div>
              </div>

              {/* Debug Info - Remove in production */}
              {connectedAddress && (
                <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                  <h4 className="text-sm font-semibold text-yellow-800 mb-2">Debug Info</h4>
                  <div className="text-xs text-yellow-700 space-y-1">
                    <p>Total Assets (Free): {formatNumber(totalAssets)} ETH</p>
                    <p>Queued Assets: {formatNumber(queuedAssets)} ETH</p>
                    <p>Actual Total Assets: {formatNumber(actualTotalAssets)} ETH</p>
                    <p>Total Supply: {formatNumber(totalSupply)} csSTT</p>
                    <p>Your Shares: {formatNumber(userShares)} csSTT</p>
                    <p>Your Assets Value: {formatNumber(userAssets)} ETH</p>
                    <p>Exchange Rate: 1 csSTT = {exchangeRate.toFixed(6)} ETH</p>
                    <p>Reverse Rate: 1 ETH = {reverseExchangeRate.toFixed(6)} csSTT</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
