"use client";

import { useEffect, useState } from "react";
import { Curve } from "./_components";
import type { NextPage } from "next";
import { Address as AddressType, formatEther, isAddress, parseEther } from "viem";
import { useAccount } from "wagmi";
import { Address, AddressInput, Balance, EtherInput, IntegerInput } from "~~/components/scaffold-eth";
import { useDeployedContractInfo, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { useWatchBalance } from "~~/hooks/scaffold-eth/useWatchBalance";

// REGEX for number inputs (only allow numbers and a single decimal point)
const NUMBER_REGEX = /^\.?\d+\.?\d*$/;

const Dex: NextPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [ethToTokenAmount, setEthToTokenAmount] = useState("");
  const [tokenToETHAmount, setTokenToETHAmount] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [approveSpender, setApproveSpender] = useState("");
  const [approveAmount, setApproveAmount] = useState("");
  const [accountBalanceOf, setAccountBalanceOf] = useState("");
  const [swapDirection, setSwapDirection] = useState<"ETH→csETH" | "csETH→ETH">("ETH→csETH");

  const { data: DEXInfo } = useDeployedContractInfo({ contractName: "DEX" });
  const { data: CovusVaultInfo } = useDeployedContractInfo({ contractName: "CovusVault" });
  const { address: connectedAccount } = useAccount();

  const { data: DEXcsETHBalance } = useScaffoldReadContract({
    contractName: "CovusVault",
    functionName: "balanceOf",
    args: [DEXInfo?.address?.toString()],
  });

  const { data: userCsETHBalance } = useScaffoldReadContract({
    contractName: "CovusVault",
    functionName: "balanceOf",
    args: [connectedAccount],
  });

  useEffect(() => {
    if (DEXcsETHBalance !== undefined) {
      setIsLoading(false);
    }
  }, [DEXcsETHBalance]);

  const { data: DEXtotalLiquidity } = useScaffoldReadContract({
    contractName: "DEX",
    functionName: "totalLiquidity",
  });

  const { writeContractAsync: writeDexContractAsync } = useScaffoldWriteContract({ contractName: "DEX" });

  const { writeContractAsync: writeCovusVaultContractAsync } = useScaffoldWriteContract({ contractName: "CovusVault" });

  const { data: balanceOfWrite } = useScaffoldReadContract({
    contractName: "CovusVault",
    functionName: "balanceOf",
    args: [accountBalanceOf as AddressType],
    query: {
      enabled: isAddress(accountBalanceOf),
    },
  });

  const { data: contractBalance } = useScaffoldReadContract({
    contractName: "CovusVault",
    functionName: "balanceOf",
    args: [DEXInfo?.address],
  });

  const { data: userLiquidity } = useScaffoldReadContract({
    contractName: "DEX",
    functionName: "getLiquidity",
    args: [connectedAccount],
  });

  const { data: contractETHBalance } = useWatchBalance({ address: DEXInfo?.address });

  return (
    <>
      <h1 className="text-center mb-4 mt-5">
        <span className="block text-xl text-right mr-7">
          🏦 csSTT: {parseFloat(formatEther(userCsETHBalance || 0n)).toFixed(4)}
        </span>
        <span className="block text-xl text-right mr-7">
          💦💦: {parseFloat(formatEther(userLiquidity || 0n)).toFixed(4)}
        </span>
        <span className="block text-2xl mb-2">Covus Liquid Staking</span>
        <span className="block text-4xl font-bold">🦄 DEX Trading </span>
      </h1>
      <div className="items-start pt-10 grid grid-cols-1 md:grid-cols-2 content-start">
        <div className="px-5 py-5">
          <div className="bg-base-100 shadow-lg shadow-secondary border-8 border-secondary rounded-xl p-8 m-8">
            <div className="flex flex-col text-center">
              <span className="text-3xl font-semibold mb-2">DEX Contract</span>
              <span className="block text-2xl mb-2 mx-auto">
                <Address size="xl" address={DEXInfo?.address} />
              </span>
              <span className="flex flex-row mx-auto mt-5">
                {" "}
                <Balance className="text-xl" address={DEXInfo?.address} /> ⚖️
                {isLoading ? (
                  <span>Loading...</span>
                ) : (
                  <span className="pl-8 text-xl">🏦 {parseFloat(formatEther(DEXcsETHBalance || 0n)).toFixed(4)}</span>
                )}
              </span>
            </div>
            <div className="py-3 px-4">
              <div className="flex mb-4 justify-center items-center">
                <span className="w-1/2">
                  ethToToken{" "}
                  <EtherInput
                    value={ethToTokenAmount}
                    onChange={value => {
                      setTokenToETHAmount("");
                      setEthToTokenAmount(value);
                    }}
                    name="ethToToken"
                  />
                </span>
                <button
                  className="btn btn-primary h-[2.2rem] min-h-[2.2rem] mt-6 mx-5"
                  onClick={async () => {
                    try {
                      await writeDexContractAsync({
                        functionName: "sttToToken",
                        value: NUMBER_REGEX.test(ethToTokenAmount) ? parseEther(ethToTokenAmount) : 0n,
                      });
                    } catch (err) {
                      console.error("Error calling ethToToken function", err);
                    }
                  }}
                >
                  Send
                </button>
              </div>
              <div className="flex justify-center items-center">
                <span className="w-1/2">
                  tokenToETH{" "}
                  <IntegerInput
                    value={tokenToETHAmount}
                    onChange={value => {
                      setEthToTokenAmount("");
                      setTokenToETHAmount(value.toString());
                    }}
                    name="tokenToETH"
                    disableMultiplyBy1e18
                  />
                </span>
                <button
                  className="btn btn-primary h-[2.2rem] min-h-[2.2rem] mt-6 mx-5"
                  onClick={async () => {
                    try {
                      await writeDexContractAsync({
                        functionName: "tokenToStt",
                        // @ts-expect-error - Show error on frontend while sending, if user types invalid number
                        args: [NUMBER_REGEX.test(tokenToETHAmount) ? parseEther(tokenToETHAmount) : tokenToETHAmount],
                      });
                    } catch (err) {
                      console.error("Error calling tokenToEth function", err);
                    }
                  }}
                >
                  Send
                </button>
              </div>
            </div>
            <p className="text-center text-primary-content text-xl mt-8 -ml-8">
              Liquidity ({DEXtotalLiquidity ? parseFloat(formatEther(DEXtotalLiquidity || 0n)).toFixed(4) : "None"})
            </p>
            <div className="px-4 py-3">
              {/* Approve csSTT for DEX */}
              <div className="flex mb-4 justify-center items-center">
                <span className="w-1/2">
                  Approve csSTT{" "}
                  <IntegerInput
                    value={approveAmount}
                    onChange={value => setApproveAmount(value.toString())}
                    placeholder="Amount"
                    disableMultiplyBy1e18
                  />
                </span>
                <button
                  className="btn btn-secondary h-[2.2rem] min-h-[2.2rem] mt-6 mx-5"
                  onClick={async () => {
                    try {
                      await writeCovusVaultContractAsync({
                        functionName: "approve",
                        args: [
                          DEXInfo?.address,
                          NUMBER_REGEX.test(approveAmount) ? parseEther(approveAmount) : parseEther("0"),
                        ],
                      });
                    } catch (err) {
                      console.error("Error calling approve function", err);
                    }
                  }}
                >
                  Approve
                </button>
              </div>

              <div className="flex mb-4 justify-center items-center">
                <span className="w-1/2">
                  Deposit <EtherInput value={depositAmount} onChange={value => setDepositAmount(value)} />
                </span>
                <button
                  className="btn btn-primary h-[2.2rem] min-h-[2.2rem] mt-6 mx-5"
                  onClick={async () => {
                    try {
                      await writeDexContractAsync({
                        functionName: "deposit",
                        value: NUMBER_REGEX.test(depositAmount) ? parseEther(depositAmount) : 0n,
                      });
                    } catch (err) {
                      console.error("Error calling deposit function", err);
                    }
                  }}
                >
                  Send
                </button>
              </div>

              <div className="flex justify-center items-center">
                <span className="w-1/2">
                  Withdraw <EtherInput value={withdrawAmount} onChange={value => setWithdrawAmount(value)} />
                </span>
                <button
                  className="btn btn-primary h-[2.2rem] min-h-[2.2rem] mt-6 mx-5"
                  onClick={async () => {
                    try {
                      await writeDexContractAsync({
                        functionName: "withdraw",
                        // @ts-expect-error - Show error on frontend while sending, if user types invalid number
                        args: [NUMBER_REGEX.test(withdrawAmount) ? parseEther(withdrawAmount) : withdrawAmount],
                      });
                    } catch (err) {
                      console.error("Error calling withdraw function", err);
                    }
                  }}
                >
                  Send
                </button>
              </div>
            </div>
          </div>

          {/* csSTT Trading Section */}
          <div className="space-y-4 bg-base-100 shadow-lg shadow-secondary border-8 border-secondary rounded-xl py-5 p-8 m-8">
            <div className="flex flex-col text-center mt-2 mb-4 px-4">
              <span className="block text-3xl font-semibold mb-2">🏦 csSTT Trading</span>
              <span className="mx-auto">
                <Address size="xl" address={CovusVaultInfo?.address} />
              </span>
              <p className="text-sm text-gray-600 mt-2">Trade your liquid staking tokens!</p>

              {/* Balance Display */}
              <div className="mt-4 grid grid-cols-1 gap-4 text-sm">
                <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="font-semibold text-gray-900 dark:text-white">Your csSTT</p>
                  <p className="text-gray-600 dark:text-gray-300">{formatEther(userCsETHBalance || 0n)}</p>
                </div>
              </div>
            </div>

            <div className="px-4 py-3">
              <div className="flex flex-col gap-4 mb-4 justify-center items-center">
                {/* Swap Direction */}
                <div className="w-full">
                  <label className="block text-sm font-medium mb-2">Swap Direction</label>
                  <select
                    value={swapDirection}
                    onChange={e => setSwapDirection(e.target.value as any)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ETH→csETH">ETH → csSTT</option>
                    <option value="csETH→ETH">csSTT → ETH</option>
                  </select>
                </div>

                {/* Swap Amount */}
                <div className="w-full">
                  <label className="block text-sm font-medium mb-2">Amount to Swap</label>
                  <IntegerInput
                    value={tokenToETHAmount}
                    onChange={value => setTokenToETHAmount(value.toString())}
                    placeholder="Amount"
                    disableMultiplyBy1e18
                  />
                </div>

                {/* Swap Button */}
                <button
                  className="btn btn-primary h-[2.2rem] min-h-[2.2rem] mt-auto w-full"
                  disabled={!tokenToETHAmount || parseFloat(tokenToETHAmount) <= 0}
                  onClick={async () => {
                    try {
                      if (swapDirection === "ETH→csETH") {
                        // ETH to csSTT swap
                        console.log("Swapping ETH for csSTT...");
                        await writeDexContractAsync({
                          functionName: "sttToToken",
                          value: parseEther(tokenToETHAmount),
                        });
                      } else {
                        // csSTT to ETH swap
                        // Check if user has enough csSTT
                        if (!userCsETHBalance || userCsETHBalance < parseEther(tokenToETHAmount)) {
                          alert("You don't have enough csSTT. Please stake ETH first to get csSTT tokens.");
                          return;
                        }

                        // First approve DEX to spend csSTT
                        console.log("Approving DEX to spend csSTT...");
                        await writeCovusVaultContractAsync({
                          functionName: "approve",
                          args: [DEXInfo?.address, parseEther(tokenToETHAmount)],
                        });

                        // Then swap csSTT for ETH
                        console.log("Swapping csSTT for ETH...");
                        await writeDexContractAsync({
                          functionName: "tokenToStt",
                          args: [parseEther(tokenToETHAmount)],
                        });
                      }
                    } catch (err) {
                      console.error("Error calling swap function", err);
                      alert("Swap failed. Check console for details.");
                    }
                  }}
                >
                  Swap {swapDirection}
                </button>

                {/* Info */}
                <div className="text-xs text-gray-500 text-center mt-2">
                  💡 This demonstrates how csSTT can be used in DeFi protocols!
                </div>

                {/* Help Section */}
                {(!userCsETHBalance || userCsETHBalance === 0n) && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
                      🏦 Need csSTT tokens?
                    </h4>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
                      To trade csSTT, you need to stake ETH first:
                    </p>
                    <ol className="text-xs text-blue-700 dark:text-blue-300 list-decimal list-inside space-y-1">
                      <li>Go to the main page</li>
                      <li>Stake some ETH to get csSTT tokens</li>
                      <li>Come back here to trade your csSTT</li>
                    </ol>
                    <a href="/" className="inline-block mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline">
                      → Go to Staking Page
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto p-8 m-8 md:sticky md:top-0">
          <Curve
            addingEth={ethToTokenAmount !== "" ? parseFloat(ethToTokenAmount.toString()) : 0}
            addingToken={tokenToETHAmount !== "" ? parseFloat(tokenToETHAmount.toString()) : 0}
            ethReserve={parseFloat(formatEther(contractETHBalance?.value || 0n))}
            tokenReserve={parseFloat(formatEther(contractBalance || 0n))}
            width={500}
            height={500}
          />
        </div>
      </div>
    </>
  );
};

export default Dex;
