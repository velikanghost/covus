"use client";

import { useState } from "react";
import type { NextPage } from "next";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { ArrowDownTrayIcon, ClockIcon, WalletIcon } from "@heroicons/react/24/outline";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

const WithdrawalPage: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const [isProcessing, setIsProcessing] = useState(false);

  // Read contract data
  const { data: pendingRequests } = useScaffoldReadContract({
    contractName: "CovusVault",
    functionName: "pendingRequests",
  });

  const { data: head } = useScaffoldReadContract({
    contractName: "CovusVault",
    functionName: "head",
  });

  const { data: tail } = useScaffoldReadContract({
    contractName: "CovusVault",
    functionName: "tail",
  });

  const { data: queuedAssets } = useScaffoldReadContract({
    contractName: "CovusVault",
    functionName: "queuedAssets",
  });

  const { data: freeLiquidity } = useScaffoldReadContract({
    contractName: "CovusVault",
    functionName: "freeLiquidity",
  });

  // Write contract functions
  const { writeContractAsync: processQueue } = useScaffoldWriteContract("CovusVault");

  const formatNumber = (value: bigint | undefined) => {
    if (!value) return "0";
    return Number(formatEther(value)).toLocaleString();
  };

  const handleProcessQueue = async () => {
    if (!connectedAddress) return;

    setIsProcessing(true);
    try {
      // Process all pending requests
      await processQueue({
        functionName: "processQueue",
        args: [pendingRequests || 0n],
      });
    } catch (error) {
      console.error("Process queue failed:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getQueueStatus = () => {
    if (!pendingRequests || pendingRequests === 0n) {
      return "No pending withdrawal requests";
    }

    const pending = Number(pendingRequests);
    const queued = formatNumber(queuedAssets);
    const free = formatNumber(freeLiquidity);

    return `${pending} pending requests (${queued} STT queued, ${free} STT available)`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <div className="container mx-auto px-6 py-8">
        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Withdrawal Queue</h1>
          <p className="text-lg text-gray-300">Monitor and process the withdrawal queue</p>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10">
            <div className="flex items-center mb-6">
              <ArrowDownTrayIcon className="h-6 w-6 text-blue-400 mr-3" />
              <h2 className="text-2xl font-bold text-white">Withdrawal Queue Status</h2>
            </div>

            {!connectedAddress ? (
              <div className="text-center py-12">
                <WalletIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">Connect Your Wallet</h3>
                <p className="text-gray-300">Connect your wallet to view the withdrawal queue</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Queue Status */}
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">Queue Status</h3>
                      <p className="text-sm text-gray-300">{getQueueStatus()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-white">{pendingRequests ? Number(pendingRequests) : 0}</p>
                      <p className="text-sm text-gray-300">Pending requests</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-white/10 rounded-lg p-4 border border-white/20">
                      <p className="text-sm text-gray-300">Queued Assets</p>
                      <p className="text-xl font-bold text-white">{formatNumber(queuedAssets)} STT</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-4 border border-white/20">
                      <p className="text-sm text-gray-300">Free Liquidity</p>
                      <p className="text-xl font-bold text-white">{formatNumber(freeLiquidity)} STT</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-4 border border-white/20">
                      <p className="text-sm text-gray-300">Queue Position</p>
                      <p className="text-xl font-bold text-white">{head && tail ? Number(tail - head) : 0}</p>
                    </div>
                  </div>

                  <button
                    onClick={handleProcessQueue}
                    disabled={!pendingRequests || pendingRequests === 0n || isProcessing}
                    className={`w-full px-6 py-3 rounded-lg font-medium transition-colors ${
                      pendingRequests && pendingRequests > 0n
                        ? "bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white"
                        : "bg-gray-600 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {isProcessing ? "Processing..." : "Process Queue"}
                  </button>
                </div>

                {/* Queue Information */}
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
                  <h3 className="text-lg font-semibold text-white mb-4">How the Queue Works</h3>
                  <div className="space-y-3 text-sm text-gray-300">
                    <p>• Withdrawal requests are processed in FIFO (First In, First Out) order</p>
                    <p>• Requests can only be processed when there is sufficient liquidity</p>
                    <p>• The queue processes all available requests when triggered</p>
                    <p>• Anyone can trigger the queue processing</p>
                    <p>• Processed withdrawals are paid out immediately</p>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
                  <div className="text-center py-8 text-gray-400">
                    <ClockIcon className="h-12 w-12 mx-auto mb-4 text-gray-500" />
                    <p>No recent queue processing activity</p>
                    <p className="text-sm mt-2">Queue processing events will appear here</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WithdrawalPage;
