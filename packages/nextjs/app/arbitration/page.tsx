"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Address } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { toast } from "react-hot-toast";
import { formatEther } from "viem";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import {
  ArrowPathIcon,
  DocumentMagnifyingGlassIcon,
  ExclamationTriangleIcon,
  ScaleIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import deployedContractsData from "~~/contracts/deployedContracts";
import { useScaffoldReadContract, useTargetNetwork, useTransactor } from "~~/hooks/scaffold-eth";

interface DisputedOrder {
  address: string;
  buyer: string;
  seller: string;
  arbitrator: string;
  item: string;
  amount: string;
  poCid: string;
}

const ArbitrationDashboard: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const publicClient = usePublicClient();
  const writeTx = useTransactor();
  const { targetNetwork } = useTargetNetwork();

  const { writeContractAsync } = useWriteContract();

  const [disputedOrders, setDisputedOrders] = useState<DisputedOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolvingAddr, setResolvingAddr] = useState<string | null>(null);

  // Get all escrows from factory
  const { data: allEscrows } = useScaffoldReadContract({
    contractName: "EscrowFactory",
    functionName: "getAllEscrows",
  });

  const fetchDisputes = useCallback(async () => {
    if (!allEscrows || !publicClient || !connectedAddress || !targetNetwork) return;

    setLoading(true);
    try {
      const disputes: DisputedOrder[] = [];

      const supplyChainEscrowAbi = (deployedContractsData as any)[targetNetwork.id]?.SupplyChainEscrow?.abi;
      if (!supplyChainEscrowAbi) {
        console.error("SupplyChainEscrow ABI not found in deployedContractsData");
        setLoading(false);
        return;
      }

      for (const addr of allEscrows) {
        try {
          const [arbitrator, isDisputed] = await Promise.all([
            publicClient.readContract({
              address: addr as `0x${string}`,
              abi: supplyChainEscrowAbi,
              functionName: "arbitrator",
              args: [],
            }),
            publicClient.readContract({
              address: addr as `0x${string}`,
              abi: supplyChainEscrowAbi,
              functionName: "disputed",
              args: [],
            }),
          ]);

          // Only show if it's disputed AND the connected user is the arbitrator
          if (isDisputed && (arbitrator as string).toLowerCase() === connectedAddress.toLowerCase()) {
            const [buyer, seller, itemName, totalAmount, poCid] = await Promise.all([
              publicClient.readContract({
                address: addr as `0x${string}`,
                abi: supplyChainEscrowAbi,
                functionName: "buyer",
                args: [],
              }),
              publicClient.readContract({
                address: addr as `0x${string}`,
                abi: supplyChainEscrowAbi,
                functionName: "seller",
                args: [],
              }),
              publicClient.readContract({
                address: addr as `0x${string}`,
                abi: supplyChainEscrowAbi,
                functionName: "itemName",
                args: [],
              }),
              publicClient.readContract({
                address: addr as `0x${string}`,
                abi: supplyChainEscrowAbi,
                functionName: "totalAmount",
                args: [],
              }),
              publicClient.readContract({
                address: addr as `0x${string}`,
                abi: supplyChainEscrowAbi,
                functionName: "poCid",
                args: [],
              }),
            ]);

            disputes.push({
              address: addr,
              buyer: buyer as string,
              seller: seller as string,
              arbitrator: arbitrator as string,
              item: itemName as string,
              amount: formatEther(totalAmount as bigint),
              poCid: poCid as string,
            });
          }
        } catch (e) {
          console.error(`Error reading escrow ${addr}:`, e);
        }
      }
      setDisputedOrders(disputes);
    } catch (error) {
      console.error("Error fetching disputes:", error);
    } finally {
      setLoading(false);
    }
  }, [allEscrows, publicClient, connectedAddress, targetNetwork]);

  useEffect(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  const handleResolve = async (escrowAddr: string, releaseToSeller: boolean) => {
    if (!targetNetwork) return;
    const supplyChainEscrowAbi = (deployedContractsData as any)[targetNetwork.id]?.SupplyChainEscrow?.abi;
    if (!supplyChainEscrowAbi) return;

    setResolvingAddr(escrowAddr);
    const notificationId = toast.loading("Resolving dispute...");
    try {
      await writeTx(() =>
        writeContractAsync({
          address: escrowAddr as `0x${string}`,
          abi: supplyChainEscrowAbi,
          functionName: "resolveDispute",
          args: [releaseToSeller],
        }),
      );
      toast.success("Dispute resolved!", { id: notificationId });
      fetchDisputes();
    } catch (e: any) {
      console.error("Error resolving dispute:", e);
      toast.error(`Error: ${e.message}`, { id: notificationId });
    } finally {
      setResolvingAddr(null);
    }
  };

  return (
    <div className="flex flex-col grow bg-base-200 pb-20">
      <div className="max-w-7xl w-full mx-auto px-4 mt-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
            <ShieldCheckIcon className="h-8 w-8" />
            Arbitration Dashboard
          </h1>
          <button onClick={fetchDisputes} className="btn btn-ghost btn-sm gap-2">
            <ArrowPathIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {!connectedAddress ? (
          <div className="card bg-base-100 shadow-xl p-20 text-center rounded-sm">
            <p className="text-xl opacity-50">Please connect your wallet to access arbitration.</p>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-20">
            <ArrowPathIcon className="h-12 w-12 animate-spin text-primary opacity-20" />
          </div>
        ) : disputedOrders.length === 0 ? (
          <div className="card bg-base-100 shadow-xl border border-secondary/20 p-20 text-center rounded-sm">
            <div className="flex justify-center mb-6">
              <ScaleIcon className="h-16 w-16 opacity-10" />
            </div>
            <h2 className="text-2xl font-bold opacity-50">No active disputes</h2>
            <p className="mt-2 opacity-40 text-lg">You are not listed as an arbitrator for any active disputes.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {disputedOrders.map(order => (
              <div
                key={order.address}
                className="card bg-base-100 shadow-md border-l-4 border-l-error rounded-sm overflow-hidden"
              >
                <div className="card-body p-6">
                  <div className="flex flex-col lg:flex-row justify-between gap-8">
                    <div className="flex-1 space-y-4">
                      <div>
                        <div className="flex items-center gap-2 text-error mb-1">
                          <ExclamationTriangleIcon className="h-5 w-5" />
                          <span className="font-bold text-xs uppercase tracking-widest">Dispute Active</span>
                        </div>
                        <h2 className="text-2xl font-black">{order.item}</h2>
                        <Address address={order.address} size="sm" />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-base-200/50 p-4 rounded-sm border border-base-300">
                        <div>
                          <p className="text-[10px] uppercase font-bold opacity-50 mb-1">Buyer (Claimant)</p>
                          <Address address={order.buyer} size="xs" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold opacity-50 mb-1">Seller (Respondent)</p>
                          <Address address={order.seller} size="xs" />
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="bg-primary/10 px-4 py-2 rounded-sm border border-primary/20">
                          <span className="text-xs opacity-60 block">Disputed Amount</span>
                          <span className="text-xl font-black text-primary">{order.amount} MON</span>
                        </div>
                        <a
                          href={`https://gateway.pinata.cloud/ipfs/${order.poCid}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-outline btn-sm rounded-sm gap-2"
                        >
                          <DocumentMagnifyingGlassIcon className="h-4 w-4" />
                          Review PO
                        </a>
                      </div>
                    </div>

                    <div className="lg:w-72 flex flex-col justify-center gap-3 border-t lg:border-t-0 lg:border-l border-base-300 pt-6 lg:pt-0 lg:pl-8">
                      <h3 className="font-bold text-sm uppercase text-center opacity-60 mb-2">Judgment</h3>
                      <button
                        className={`btn btn-success btn-block rounded-sm ${resolvingAddr === order.address ? "loading" : ""}`}
                        onClick={() => handleResolve(order.address, true)}
                        disabled={!!resolvingAddr}
                      >
                        Release to Seller
                      </button>
                      <button
                        className={`btn btn-error btn-block rounded-sm ${resolvingAddr === order.address ? "loading" : ""}`}
                        onClick={() => handleResolve(order.address, false)}
                        disabled={!!resolvingAddr}
                      >
                        Refund to Buyer
                      </button>
                      <p className="text-[10px] text-center opacity-40 italic mt-2">
                        Judgment is final and will release all remaining funds.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ArbitrationDashboard;
