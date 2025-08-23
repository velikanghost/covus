"use client";

import type { NextPage } from "next";
import { formatEther } from "viem";
import {
  ArrowTrendingUpIcon,
  ChartBarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

const AnalyticsPage: NextPage = () => {
  // Read contract data
  const { data: totalAssets } = useScaffoldReadContract({
    contractName: "CovusVault",
    functionName: "totalAssets",
  });

  const { data: totalSupply } = useScaffoldReadContract({
    contractName: "CovusVault",
    functionName: "totalSupply",
  });

  const { data: queuedAssets } = useScaffoldReadContract({
    contractName: "CovusVault",
    functionName: "queuedAssets",
  });

  const { data: freeLiquidity } = useScaffoldReadContract({
    contractName: "CovusVault",
    functionName: "freeLiquidity",
  });

  const formatNumber = (value: bigint | undefined) => {
    if (!value) return "0";
    return Number(formatEther(value)).toLocaleString();
  };

  // Mock data for demonstration
  const mockData = {
    totalStakers: 15420,
    averageStake: 125.5,
    protocolRevenue: 234567,
    totalRewardsDistributed: 890123,
    apyHistory: [3.8, 4.1, 4.2, 4.0, 4.3, 4.2],
    tvlHistory: [1200000, 1350000, 1420000, 1380000, 1450000, 1500000],
    dailyStakes: [45, 52, 38, 67, 41, 58, 49],
    dailyWithdrawals: [12, 8, 15, 6, 19, 11, 14],
  };

  const stats = [
    {
      name: "Total Value Locked",
      value: `${formatNumber(totalAssets)} STT`,
      change: "+12.5%",
      changeType: "positive",
      icon: CurrencyDollarIcon,
    },
    {
      name: "Total Stakers",
      value: mockData.totalStakers.toLocaleString(),
      change: "+8.2%",
      changeType: "positive",
      icon: UsersIcon,
    },
    {
      name: "Average Stake",
      value: `${mockData.averageStake} STT`,
      change: "+5.1%",
      changeType: "positive",
      icon: ChartBarIcon,
    },
    {
      name: "Protocol Revenue",
      value: `${mockData.protocolRevenue.toLocaleString()} STT`,
      change: "+15.3%",
      changeType: "positive",
      icon: ArrowTrendingUpIcon,
    },
  ];

  const features = [
    {
      title: "Liquid Staking",
      description:
        "Stake your STT and receive liquid csSTT tokens that can be used in DeFi protocols while earning rewards.",
      icon: "💧",
    },
    {
      title: "High APY",
      description: "Earn competitive yields through our optimized staking strategy and validator selection.",
      icon: "📈",
    },
    {
      title: "Secure & Audited",
      description: "Our smart contracts are thoroughly audited and secured by industry-leading security firms.",
      icon: "🔒",
    },
    {
      title: "Instant Liquidity",
      description: "Trade your csSTT tokens instantly without waiting for withdrawal periods.",
      icon: "⚡",
    },
    {
      title: "Transparent",
      description: "All protocol data is publicly available on-chain for complete transparency.",
      icon: "👁️",
    },
    {
      title: "Community Driven",
      description: "Governed by the community with proposals and voting mechanisms.",
      icon: "🏛️",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <div className="container mx-auto px-6 py-8">
        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Protocol Analytics</h1>
          <p className="text-lg text-gray-300">Real-time data and insights about the Covus protocol</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {stats.map(stat => (
            <div key={stat.name} className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <stat.icon className="h-8 w-8 text-blue-400" />
                <span
                  className={`text-sm font-medium ${
                    stat.changeType === "positive" ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {stat.change}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">{stat.value}</h3>
              <p className="text-sm text-gray-300">{stat.name}</p>
            </div>
          ))}
        </div>

        {/* Protocol Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Key Metrics */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10">
            <h2 className="text-2xl font-bold text-white mb-6">Key Metrics</h2>
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Total Supply (csSTT)</span>
                <span className="font-semibold text-white">{formatNumber(totalSupply)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Queued Assets</span>
                <span className="font-semibold text-white">{formatNumber(queuedAssets)} STT</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Free Liquidity</span>
                <span className="font-semibold text-white">{formatNumber(freeLiquidity)} STT</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Total Rewards Distributed</span>
                <span className="font-semibold text-white">
                  {mockData.totalRewardsDistributed.toLocaleString()} STT
                </span>
              </div>
            </div>
          </div>

          {/* APY Chart */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10">
            <h2 className="text-2xl font-bold text-white mb-6">APY History</h2>
            <div className="space-y-4">
              {mockData.apyHistory.map((apy, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Week {index + 1}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-white/20 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full"
                        style={{ width: `${(apy / 5) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-white">{apy}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10 mb-12">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Why Choose Covus?</h2>
            <p className="text-lg text-gray-300 max-w-3xl mx-auto">
              Covus is a next-generation liquid staking protocol that combines security, transparency, and high yields
              to provide the best staking experience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center p-6 rounded-lg hover:bg-white/5 transition-colors">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-300">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Daily Stakes */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10">
            <h2 className="text-2xl font-bold text-white mb-6">Daily Stakes (Last 7 Days)</h2>
            <div className="space-y-4">
              {mockData.dailyStakes.map((stakes, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Day {index + 1}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-white/20 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: `${(stakes / 70) * 100}%` }}></div>
                    </div>
                    <span className="text-sm font-medium text-white">{stakes} stakes</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Daily Withdrawals */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10">
            <h2 className="text-2xl font-bold text-white mb-6">Daily Withdrawals (Last 7 Days)</h2>
            <div className="space-y-4">
              {mockData.dailyWithdrawals.map((withdrawals, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Day {index + 1}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-white/20 rounded-full h-2">
                      <div
                        className="bg-orange-500 h-2 rounded-full"
                        style={{ width: `${(withdrawals / 20) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-white">{withdrawals} withdrawals</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
