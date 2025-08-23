"use client";

import Link from "next/link";
import type { NextPage } from "next";
import { formatEther } from "viem";
import {
  ArrowRightIcon,
  ArrowTrendingUpIcon,
  BoltIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

const Home: NextPage = () => {
  // Read contract data
  const { data: totalAssets } = useScaffoldReadContract({
    contractName: "CovusVault",
    functionName: "totalAssets",
  });

  const { data: totalSupply } = useScaffoldReadContract({
    contractName: "CovusVault",
    functionName: "totalSupply",
  });

  const formatNumber = (value: bigint | undefined) => {
    if (!value) return "0";
    return Number(formatEther(value)).toLocaleString();
  };

  // Mock data for demonstration
  const mockData = {
    totalStakers: 15420,
    averageAPY: 4.2,
    protocolRevenue: 234567,
  };

  const stats = [
    {
      name: "TVL",
      value: `${formatNumber(totalAssets)} STT`,
      icon: CurrencyDollarIcon,
    },
    {
      name: "Stakers",
      value: mockData.totalStakers.toLocaleString(),
      icon: UsersIcon,
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
      title: "Transparent",
      description: "All protocol data is publicly available on-chain for complete transparency.",
      icon: "👁️",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Hero Section */}
      <div className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Stake STT
            <br />
            <span className="text-6xl md:text-7xl bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Stay Liquid
            </span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
            Covus is a next-generation liquid staking protocol where you can earn staking rewards with Somnia validators
            while keeping your assets liquid through an ERC-4626 vault with instant withdrawals and a fair queue system.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/stake"
              className="inline-flex items-center px-8 py-4 bg-white text-gray-900 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
            >
              <span>Stake Now</span>
              <ArrowRightIcon className="h-5 w-5 ml-2" />
            </Link>
          </div>
        </div>

        {/* Stats Section */}
        {/* <div className="flex items-center justify-center gap-6 mb-20">
          {stats.map(stat => (
            <div key={stat.name} className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 w-1/4">
              <div className="flex items-center mb-4">
                <stat.icon className="h-8 w-8 text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">{stat.value}</h3>
              <p className="text-[10px] tracking-[1px] text-gray-300 uppercase">{stat.name}</p>
            </div>
          ))}
        </div> */}
      </div>

      {/* Features Section */}
      <div className="bg-white/5 backdrop-blur-sm py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Why Choose Covus?</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Covus is a next-generation liquid staking protocol that combines security, transparency, and high yields
              to provide the best staking experience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <div className="text-4xl mb-6">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-white mb-4">{feature.title}</h3>
                <p className="text-gray-300">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-6 py-20">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-white mb-6">Ready to Start Staking?</h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Join thousands of users who are already earning rewards with Covus. Start your staking journey today.
          </p>
          <Link
            href="/stake"
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-all transform hover:scale-105"
          >
            <BoltIcon className="h-5 w-5 mr-2" />
            <span>Start Staking Now</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Home;
