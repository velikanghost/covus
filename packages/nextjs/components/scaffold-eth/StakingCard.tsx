"use client";

import React, { useState } from "react";
import { formatEther, parseEther } from "viem";
import { useAccount } from "wagmi";
import { ArrowDownIcon, ArrowUpIcon } from "@heroicons/react/24/outline";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

interface StakingCardProps {
  type: "stake" | "withdraw";
  userBalance: bigint | undefined;
  maxAmount: bigint | undefined;
  onSuccess?: () => void;
}

export const StakingCard = ({ type, userBalance, onSuccess }: StakingCardProps) => {
  const { address: connectedAddress } = useAccount();
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Read contract data for liquidity check
  const { data: freeLiquidity } = useScaffoldReadContract({
    contractName: "CovusVault",
    functionName: "freeLiquidity",
  });

  const { data: totalSupply } = useScaffoldReadContract({
    contractName: "CovusVault",
    functionName: "totalSupply",
  });

  const { data: totalAssets } = useScaffoldReadContract({
    contractName: "CovusVault",
    functionName: "totalAssets",
  });

  const { data: queuedAssets } = useScaffoldReadContract({
    contractName: "CovusVault",
    functionName: "queuedAssets",
  });

  const { writeContractAsync: depositETH } = useScaffoldWriteContract("CovusVault");
  const { writeContractAsync: requestWithdrawal } = useScaffoldWriteContract("CovusVault");
  const { writeContractAsync: instantRedeem } = useScaffoldWriteContract("CovusVault");

  const isStake = type === "stake";
  const icon = isStake ? ArrowUpIcon : ArrowDownIcon;
  const title = isStake ? "Stake ETH" : "Withdraw ETH";
  const description = isStake ? "Deposit ETH to receive liquid csSTT tokens" : "Withdraw your staked ETH";

  // Calculate if withdrawal can be instant
  const getWithdrawalType = () => {
    if (isStake || !amount || !freeLiquidity) return "stake";
    const withdrawAmountWei = parseEther(amount);
    return freeLiquidity >= withdrawAmountWei ? "instant" : "queued";
  };

  const buttonText = isStake
    ? "Stake ETH"
    : amount
      ? getWithdrawalType() === "instant"
        ? "Instant Withdraw ETH"
        : "Queue Withdraw ETH"
      : "Withdraw ETH";
  const buttonColor = isStake ? "bg-blue-600 hover:bg-blue-700" : "bg-red-600 hover:bg-red-700";

  const handleAction = async () => {
    if (!amount) return;

    setIsProcessing(true);
    try {
      if (isStake) {
        await depositETH({
          functionName: "depositSTT",
          args: [connectedAddress],
          value: parseEther(amount),
        });
      } else {
        const withdrawAmountWei = parseEther(amount);

        // Check if there's enough free liquidity for instant withdrawal
        if (freeLiquidity && freeLiquidity >= withdrawAmountWei) {
          // Calculate shares to burn for instant redemption
          const actualTotalAssets = totalAssets && queuedAssets ? totalAssets + queuedAssets : totalAssets;
          const sharesToBurn =
            totalSupply && actualTotalAssets && actualTotalAssets > 0n
              ? (withdrawAmountWei * totalSupply) / actualTotalAssets
              : withdrawAmountWei;

          // Use instant redemption when there's enough liquidity
          await instantRedeem({
            functionName: "redeem",
            args: [sharesToBurn, connectedAddress, connectedAddress],
          });
        } else {
          // Use queue system when there's insufficient liquidity
          await requestWithdrawal({
            functionName: "requestWithdrawal",
            args: [parseEther(amount), true], // true = withdraw as STT
          });
        }
      }
      setAmount("");
      onSuccess?.();
    } catch (error) {
      console.error(`${title} failed:`, error);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatBalance = (balance: bigint | undefined) => {
    if (!balance) return "0";
    return Number(formatEther(balance)).toFixed(4);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center mb-4">
        <div className={`p-2 rounded-lg ${isStake ? "bg-blue-100 dark:bg-blue-900" : "bg-red-100 dark:bg-red-900"}`}>
          {React.createElement(icon, {
            className: `h-6 w-6 ${isStake ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400"}`,
          })}
        </div>
        <div className="ml-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Amount ({isStake ? "ETH" : "ETH"})
          </label>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.0"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Available: {formatBalance(userBalance)} {isStake ? "ETH" : "ETH"}
          </p>
        </div>

        <button
          onClick={handleAction}
          disabled={!amount || isProcessing}
          className={`w-full ${buttonColor} disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors`}
        >
          {isProcessing ? "Processing..." : buttonText}
        </button>
      </div>
    </div>
  );
};
