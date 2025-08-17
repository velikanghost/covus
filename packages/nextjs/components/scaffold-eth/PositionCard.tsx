"use client";

import { formatEther } from "viem";
import { ArrowTrendingUpIcon, ChartBarIcon, CurrencyDollarIcon } from "@heroicons/react/24/outline";

interface PositionCardProps {
  userShares: bigint | undefined;
  userAssets: bigint | undefined;
  totalSupply: bigint | undefined;
  exchangeRate: number;
  userETHBalance: bigint | undefined;
}

export const PositionCard = ({
  userShares,
  userAssets,
  totalSupply,
  exchangeRate,
  userETHBalance,
}: PositionCardProps) => {
  const formatNumber = (value: bigint | undefined) => {
    if (!value) return "0";
    return Number(formatEther(value)).toFixed(4);
  };

  const userSharePercentage =
    totalSupply && userShares ? ((Number(userShares) / Number(totalSupply)) * 100).toFixed(4) : "0";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center mb-6">
        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
          <ChartBarIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="ml-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Your Position</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Track your staking performance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900 dark:text-white flex items-center">
            <CurrencyDollarIcon className="h-4 w-4 mr-2" />
            Your Balances
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-300">csSTT Shares:</span>
              <span className="font-medium text-gray-900 dark:text-white">{formatNumber(userShares)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-300">Staked Value:</span>
              <span className="font-medium text-gray-900 dark:text-white">{formatNumber(userAssets)} ETH</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-300">ETH Balance:</span>
              <span className="font-medium text-gray-900 dark:text-white">{formatNumber(userETHBalance)} ETH</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900 dark:text-white flex items-center">
            <ArrowTrendingUpIcon className="h-4 w-4 mr-2" />
            Protocol Stats
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-300">Total Supply:</span>
              <span className="font-medium text-gray-900 dark:text-white">{formatNumber(totalSupply)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-300">Exchange Rate:</span>
              <span className="font-medium text-gray-900 dark:text-white">{exchangeRate.toFixed(6)}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-300">Your Share:</span>
              <span className="font-medium text-gray-900 dark:text-white">{userSharePercentage}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-6">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-2">
          <span>Your Share of Total Supply</span>
          <span>{userSharePercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${userSharePercentage}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};
