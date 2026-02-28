"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Address } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { formatEther } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import {
  ArrowPathIcon,
  ArrowRightIcon,
  ArrowTopRightOnSquareIcon,
  CubeIcon,
  DocumentMagnifyingGlassIcon,
  IdentificationIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
} from "@heroicons/react/24/outline";
import deployedContractsData from "~~/contracts/deployedContracts";
import { useScaffoldReadContract, useTargetNetwork } from "~~/hooks/scaffold-eth";

interface Order {
  address: string;
  buyer: string;
  seller: string;
  item: string;
  amount: string;
  status: number;
  createdAt: bigint;
}

interface PassportNFT {
  tokenId: number;
  uri: string;
  name?: string;
  isJson?: boolean;
}

const ViewOrders: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const router = useRouter();
  const publicClient = usePublicClient();
  const { targetNetwork } = useTargetNetwork();

  const [orders, setOrders] = useState<Order[]>([]);
  const [passports, setPassports] = useState<PassportNFT[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [, setIsPassportsLoading] = useState(false);

  // Fetch passport contract address
  const { data: passportContractAddress } = useScaffoldReadContract({
    contractName: "EscrowFactory",
    functionName: "passport",
  });

  // Get all escrows from factory
  const { data: allEscrowAddresses } = useScaffoldReadContract({
    contractName: "EscrowFactory",
    functionName: "getAllEscrows",
  });

  const fetchOrderDetails = useCallback(async () => {
    if (!allEscrowAddresses || !publicClient || !targetNetwork || !connectedAddress) {
      setOrders([]);
      return;
    }

    const escrowAbi = (deployedContractsData as any)[targetNetwork.id]?.SupplyChainEscrow?.abi;
    if (!escrowAbi) return;

    setIsLoading(true);
    try {
      const fetchedOrders: Order[] = [];

      for (const addr of allEscrowAddresses) {
        try {
          const [buyer, seller] = await Promise.all([
            publicClient.readContract({
              address: addr as `0x${string}`,
              abi: escrowAbi,
              functionName: "buyer",
              args: [],
            }),
            publicClient.readContract({
              address: addr as `0x${string}`,
              abi: escrowAbi,
              functionName: "seller",
              args: [],
            }),
          ]);

          // Filter locally: only show if connected user is buyer or seller
          if (
            (buyer as string).toLowerCase() === connectedAddress.toLowerCase() ||
            (seller as string).toLowerCase() === connectedAddress.toLowerCase()
          ) {
            const [itemName, totalAmount, status, createdAt] = await Promise.all([
              publicClient.readContract({
                address: addr as `0x${string}`,
                abi: escrowAbi,
                functionName: "itemName",
                args: [],
              }),
              publicClient.readContract({
                address: addr as `0x${string}`,
                abi: escrowAbi,
                functionName: "totalAmount",
                args: [],
              }),
              publicClient.readContract({
                address: addr as `0x${string}`,
                abi: escrowAbi,
                functionName: "status",
                args: [],
              }),
              publicClient.readContract({
                address: addr as `0x${string}`,
                abi: escrowAbi,
                functionName: "createdAt",
                args: [],
              }),
            ]);

            fetchedOrders.push({
              address: addr,
              buyer: buyer as string,
              seller: seller as string,
              item: itemName as string,
              amount: formatEther(totalAmount as bigint),
              status: Number(status),
              createdAt: createdAt as bigint,
            });
          }
        } catch (e) {
          console.error(`Error reading escrow ${addr}:`, e);
        }
      }
      setOrders(fetchedOrders);
    } catch (error) {
      console.error("Error fetching order details:", error);
    } finally {
      setIsLoading(false);
    }
  }, [allEscrowAddresses, publicClient, targetNetwork, connectedAddress]);

  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  // Fetch Owned NFTs
  useEffect(() => {
    const fetchPassports = async () => {
      if (!passportContractAddress || !connectedAddress || !publicClient || !targetNetwork) return;

      const machinePassportAbi = (deployedContractsData as any)[targetNetwork.id]?.MachinePassport?.abi;
      if (!machinePassportAbi) return;

      setIsPassportsLoading(true);
      try {
        const balance = await publicClient.readContract({
          address: passportContractAddress as `0x${string}`,
          abi: machinePassportAbi,
          functionName: "balanceOf",
          args: [connectedAddress],
        });

        const nftData: PassportNFT[] = [];
        for (let i = 0; i < Number(balance); i++) {
          const tokenId = await publicClient.readContract({
            address: passportContractAddress as `0x${string}`,
            abi: machinePassportAbi,
            functionName: "tokenOfOwnerByIndex",
            args: [connectedAddress, BigInt(i)],
          });

          const uri = (await publicClient.readContract({
            address: passportContractAddress as `0x${string}`,
            abi: machinePassportAbi,
            functionName: "tokenURI",
            args: [tokenId],
          })) as string;

          let name = "Industrial Machine Asset";
          let isJson = false;

          // Attempt to fetch and parse if it looks like a JSON hash (not a raw file)
          // For simplicity, we can check if it's a CID and then try to fetch its header
          try {
            const response = await fetch(`https://gateway.pinata.cloud/ipfs/${uri}`);
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
              const metadata = await response.json();
              if (metadata.name) {
                name = metadata.name;
                isJson = true;
              }
            }
          } catch {
            // If it's just a raw file (PDF/Image), this might fail or return non-JSON, which is fine
          }

          nftData.push({ tokenId: Number(tokenId), uri, name, isJson });
        }
        setPassports(nftData);
      } catch (error) {
        console.error("Error fetching passports:", error);
      } finally {
        setIsPassportsLoading(false);
      }
    };

    fetchPassports();
  }, [passportContractAddress, connectedAddress, publicClient, targetNetwork]);

  const getStatusLabel = (status: number) => {
    const labels = [
      "Created",
      "Accepted",
      "In Production",
      "Production Ready",
      "Shipped",
      "Delivered",
      "Completed",
      "Disputed",
      "Cancelled",
    ];
    return labels[status] || "Unknown";
  };

  return (
    <div className="flex flex-col grow bg-base-200 pb-20">
      <div className="max-w-7xl w-full mx-auto px-4 mt-8">
        {/* Passports Section */}
        {passports.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-black text-secondary mb-6 flex items-center gap-3">
              <IdentificationIcon className="h-7 w-7" />
              My Machine Passports
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {passports.map(nft => {
                const blockExplorerBase = targetNetwork.blockExplorers?.default.url;
                const blockExplorerLink = blockExplorerBase
                  ? `${blockExplorerBase}/address/${passportContractAddress}`
                  : null;

                return (
                  <div
                    key={nft.tokenId}
                    className="card bg-base-100 shadow-xl border-t-4 border-t-secondary rounded-sm overflow-hidden group hover:shadow-2xl transition-all"
                  >
                    <div className="card-body p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-secondary/10 rounded-lg text-secondary group-hover:bg-secondary group-hover:text-white transition-colors">
                          <ShieldCheckIcon className="h-8 w-8" />
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase font-black opacity-40 leading-none mb-1">Passport ID</p>
                          <p className="text-lg font-mono font-black">#00{nft.tokenId}</p>
                        </div>
                      </div>
                      <h3 className="text-xl font-black mb-1 leading-tight">{nft.name}</h3>
                      <div
                        className={`badge ${nft.isJson ? "badge-success" : "badge-secondary"} badge-outline font-bold text-[10px] uppercase px-2 py-2 mb-4`}
                      >
                        {nft.isJson ? "Full Digital Passport" : "Verified Proof-of-Specs"}
                      </div>

                      <div className="border-t border-base-200 pt-4 mt-2 flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase opacity-40">Specs:</span>
                            <span className="text-[10px] font-mono opacity-60">{nft.uri.slice(0, 12)}...</span>
                          </div>
                          <a
                            href={`https://gateway.pinata.cloud/ipfs/${nft.uri}`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-secondary btn-xs rounded-sm gap-1"
                          >
                            <DocumentMagnifyingGlassIcon className="h-3 w-3" /> View Specs
                          </a>
                        </div>

                        {blockExplorerLink && (
                          <a
                            href={blockExplorerLink}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-outline btn-secondary btn-xs rounded-sm gap-1 w-full"
                          >
                            <ArrowTopRightOnSquareIcon className="h-3 w-3" /> View on Explorer
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
            <ShoppingBagIcon className="h-8 w-8" />
            My Escrow Orders
          </h1>
          <Link href="/create" className="btn btn-primary rounded-sm shadow-md">
            New Contract
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <ArrowPathIcon className="h-12 w-12 animate-spin text-primary opacity-50" />
          </div>
        ) : orders.length === 0 ? (
          <div className="card bg-base-100 shadow-xl border border-secondary/20 p-20 text-center rounded-sm">
            <div className="flex justify-center mb-6">
              <CubeIcon className="h-16 w-16 opacity-10" />
            </div>
            <h2 className="text-2xl font-bold opacity-50">No orders found</h2>
            <p className="mt-2 opacity-40 text-lg">
              {connectedAddress
                ? "You are not involved in any escrow contracts yet."
                : "Please connect your wallet to view your orders."}
            </p>
            <div className="mt-8">
              <Link href="/create" className="btn btn-outline btn-primary px-8 rounded-sm">
                Create Your First Escrow
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {orders.map(order => {
              const isExpired = order.status === 0 && Date.now() / 1000 > Number(order.createdAt) + 86400;

              return (
                <div
                  key={order.address}
                  onClick={() => router.push(`/orders/${order.address}`)}
                  className="card bg-base-100 shadow-sm border border-secondary/20 hover:border-primary hover:shadow-md transition-all cursor-pointer group rounded-sm overflow-hidden"
                >
                  <div className="card-body p-5">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/5 rounded-lg text-primary group-hover:bg-primary group-hover:text-primary-content transition-colors">
                          <CubeIcon className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold group-hover:text-primary transition-colors">
                              {order.item}
                            </h3>
                            <div
                              className={`badge ${order.status === 6 ? "badge-success" : order.status === 7 || isExpired ? "badge-error" : "badge-info"} badge-xs gap-1 py-2 px-2 text-[10px] uppercase font-black rounded-sm`}
                            >
                              {isExpired ? "Expired" : getStatusLabel(order.status)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] opacity-50 font-medium mt-1">
                            <Address address={order.address} size="xs" />
                            {targetNetwork.blockExplorers?.default.url && (
                              <a
                                href={`${targetNetwork.blockExplorers.default.url}/address/${order.address}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary hover:scale-110 transition-transform"
                                onClick={e => e.stopPropagation()}
                              >
                                <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-[10px] uppercase font-bold opacity-40 leading-none mb-1">
                            Total Value
                          </div>
                          <div className="text-xl font-black text-primary">{order.amount} MON</div>
                        </div>
                        <div className="p-2 rounded-full bg-base-200 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                          <ArrowRightIcon className="h-5 w-5" />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-base-200 flex flex-col md:flex-row justify-between items-center gap-4">
                      <div className="flex gap-8">
                        <div>
                          <span className="text-[10px] font-bold uppercase opacity-40 block mb-1">Buyer</span>
                          <Address address={order.buyer} size="sm" />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase opacity-40 block mb-1">Seller</span>
                          <Address address={order.seller} size="sm" />
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="btn btn-primary btn-sm rounded-sm px-6 font-bold text-xs">Manage Order</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewOrders;
