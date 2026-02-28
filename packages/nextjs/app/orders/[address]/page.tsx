"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Address } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { toast } from "react-hot-toast";
import { formatEther, parseEther } from "viem";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  DocumentCheckIcon,
  DocumentMagnifyingGlassIcon,
  ExclamationTriangleIcon,
  HomeIcon,
  ListBulletIcon,
  PaperClipIcon,
  ShieldCheckIcon,
  Square2StackIcon,
  TruckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import LogisticsTimeline, { EscrowStatus } from "~~/components/LogisticsTimeline";
import deployedContractsData from "~~/contracts/deployedContracts";
import { useTargetNetwork, useTransactor } from "~~/hooks/scaffold-eth";

interface Order {
  address: string;
  buyer: string;
  seller: string;
  arbitrator: string;
  item: string;
  amount: string;
  status: number;
  poCid: string;
  sellerAccepted: boolean;
  shipped: boolean;
  shippingProvider: string;
  trackingNumber: string;
  delivered: boolean;
  deliveredAt: bigint;
  completed: boolean;
  disputed: boolean;
  disputeReason: string;
  shippingCid: string;
  productionLogs: string[];
  createdAt: bigint;
}

const OrderManagement: NextPage = () => {
  const params = useParams();
  const contractAddress = params.address as string;
  const { address: connectedAddress } = useAccount();
  const publicClient = usePublicClient();
  const { targetNetwork } = useTargetNetwork();

  const writeTx = useTransactor();
  const { writeContractAsync } = useWriteContract();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);

  const [shippingCid, setShippingCid] = useState<string>("");
  const [isUploadingShipping, setIsUploadingShipping] = useState<boolean>(false);
  const [shippingFileName, setShippingFileName] = useState<string>("");

  const [productionCid, setProductionCid] = useState<string>("");
  const [isUploadingProduction, setIsUploadingProduction] = useState<boolean>(false);
  const [productionFileName, setProductionFileName] = useState<string>("");

  const [localProductionLogs, setLocalProductionLogs] = useState<string[]>([]);

  const [disputeReasonInput, setDisputeReasonInput] = useState<string>("");

  const fetchOrderDetails = useCallback(async () => {
    if (!publicClient || !contractAddress || !targetNetwork) return;

    const escrowAbi = (deployedContractsData as any)[targetNetwork.id]?.SupplyChainEscrow?.abi;
    if (!escrowAbi) return;

    setLoading(true);
    try {
      const [
        buyer,
        seller,
        arbitrator,
        itemName,
        totalAmount,
        status,
        poCid,
        sellerAccepted,
        shipped,
        shippingProvider,
        trackingNumber,
        delivered,
        deliveredAt,
        completed,
        disputed,
        shippingCidFromContract,
        productionLogsFromContract,
        createdAtFromContract,
        disputeReasonFromContract,
      ] = await Promise.all([
        publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: escrowAbi,
          functionName: "buyer",
          args: [],
        }),
        publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: escrowAbi,
          functionName: "seller",
          args: [],
        }),
        publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: escrowAbi,
          functionName: "arbitrator",
          args: [],
        }),
        publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: escrowAbi,
          functionName: "itemName",
          args: [],
        }),
        publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: escrowAbi,
          functionName: "totalAmount",
          args: [],
        }),
        publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: escrowAbi,
          functionName: "status",
          args: [],
        }),
        publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: escrowAbi,
          functionName: "poCid",
          args: [],
        }),
        publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: escrowAbi,
          functionName: "sellerAccepted",
          args: [],
        }),
        publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: escrowAbi,
          functionName: "shipped",
          args: [],
        }),
        publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: escrowAbi,
          functionName: "shippingProvider",
          args: [],
        }),
        publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: escrowAbi,
          functionName: "trackingNumber",
          args: [],
        }),
        publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: escrowAbi,
          functionName: "delivered",
          args: [],
        }),
        publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: escrowAbi,
          functionName: "deliveredAt",
          args: [],
        }),
        publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: escrowAbi,
          functionName: "completed",
          args: [],
        }),
        publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: escrowAbi,
          functionName: "disputed",
          args: [],
        }),
        publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: escrowAbi,
          functionName: "shippingCid",
          args: [],
        }),
        publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: escrowAbi,
          functionName: "getProductionLogs",
          args: [],
        }),
        publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: escrowAbi,
          functionName: "createdAt",
          args: [],
        }),
        publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: escrowAbi,
          functionName: "disputeReason",
          args: [],
        }),
      ]);

      setOrder({
        address: contractAddress,
        buyer: buyer as string,
        seller: seller as string,
        arbitrator: arbitrator as string,
        item: itemName as string,
        amount: formatEther(totalAmount as bigint),
        status: Number(status),
        poCid: poCid as string,
        sellerAccepted: sellerAccepted as boolean,
        shipped: shipped as boolean,
        shippingProvider: shippingProvider as string,
        trackingNumber: trackingNumber as string,
        delivered: delivered as boolean,
        deliveredAt: deliveredAt as bigint,
        completed: completed as boolean,
        disputed: disputed as boolean,
        shippingCid: shippingCidFromContract as string,
        productionLogs: productionLogsFromContract as string[],
        createdAt: createdAtFromContract as bigint,
        disputeReason: disputeReasonFromContract as string,
      });
    } catch (error) {
      console.error("Error fetching order details:", error);
      toast.error("Failed to fetch order from blockchain.");
    } finally {
      setLoading(false);
    }
  }, [contractAddress, publicClient, targetNetwork]);

  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  const handleShippingFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setShippingFileName(file.name);
    setIsUploadingShipping(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const metadata = JSON.stringify({
        name: `ShippingDocs_${file.name}_${Date.now()}`,
      });
      formData.append("pinataMetadata", metadata);

      const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: {
          pinata_api_key: process.env.NEXT_PUBLIC_PINATA_API_KEY || "",
          pinata_secret_api_key: process.env.NEXT_PUBLIC_PINATA_API_SECRET || "",
        },
        body: formData,
      });

      const resData = await res.json();
      if (resData.IpfsHash) {
        setShippingCid(resData.IpfsHash);
        toast.success("Shipping proof uploaded to IPFS successfully!");
      } else {
        throw new Error(resData.error || "Upload failed");
      }
    } catch (error) {
      console.error("Error uploading shipping docs:", error);
      toast.error("Failed to upload shipping proof to IPFS.");
    } finally {
      setIsUploadingShipping(false);
    }
  };

  const handleProductionFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setProductionFileName(file.name);
    setIsUploadingProduction(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const metadata = JSON.stringify({
        name: `ProductionWIP_${file.name}_${Date.now()}`,
      });
      formData.append("pinataMetadata", metadata);

      const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: {
          pinata_api_key: process.env.NEXT_PUBLIC_PINATA_API_KEY || "",
          pinata_secret_api_key: process.env.NEXT_PUBLIC_PINATA_API_SECRET || "",
        },
        body: formData,
      });

      const resData = await res.json();
      if (resData.IpfsHash) {
        setProductionCid(resData.IpfsHash);
        toast.success("Production update uploaded to IPFS!");
      } else {
        throw new Error(resData.error || "Upload failed");
      }
    } catch (error) {
      console.error("Error uploading production WIP:", error);
      toast.error("Failed to upload production update.");
    } finally {
      setIsUploadingProduction(false);
    }
  };

  const handleAction = async (functionName: string, args: any[] = [], value?: bigint) => {
    if (!targetNetwork) return;
    const escrowAbi = (deployedContractsData as any)[targetNetwork.id]?.SupplyChainEscrow?.abi;
    if (!escrowAbi) return;

    setIsActionLoading(true);
    try {
      await writeTx(() =>
        writeContractAsync({
          address: contractAddress as `0x${string}`,
          abi: escrowAbi,
          functionName: functionName as any,
          args: args as any,
          value: value,
        }),
      );
      toast.success(`Action ${functionName} successful!`);
      fetchOrderDetails();
    } catch (e) {
      console.error(`Error in ${functionName}:`, e);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRaiseDispute = async () => {
    if (!disputeReasonInput) {
      return toast.error("Please provide a reason for the dispute.");
    }
    if (!targetNetwork) return;
    const escrowAbi = (deployedContractsData as any)[targetNetwork.id]?.SupplyChainEscrow?.abi;
    if (!escrowAbi) return;

    setIsActionLoading(true);
    const notificationId = toast.loading("Uploading dispute statement...");

    try {
      // 1. Upload statement to IPFS
      const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          pinata_api_key: process.env.NEXT_PUBLIC_PINATA_API_KEY || "",
          pinata_secret_api_key: process.env.NEXT_PUBLIC_PINATA_API_SECRET || "",
        },
        body: JSON.stringify({
          reason: disputeReasonInput,
          order: contractAddress,
          timestamp: Date.now(),
          raisedBy: connectedAddress,
        }),
      });

      const resData = await res.json();
      if (!resData.IpfsHash) throw new Error("IPFS upload failed");

      // 2. Call smart contract
      await writeTx(() =>
        writeContractAsync({
          address: contractAddress as `0x${string}`,
          abi: escrowAbi,
          functionName: "raiseDispute",
          args: [resData.IpfsHash],
        }),
      );

      toast.success("Dispute raised and evidence secured!", { id: notificationId });
      setDisputeReasonInput("");
      fetchOrderDetails();
    } catch (e: any) {
      console.error("Error raising dispute:", e);
      toast.error(`Error: ${e.message}`, { id: notificationId });
    } finally {
      setIsActionLoading(false);
    }
  };

  if (loading || !order) {
    return (
      <div className="flex flex-col items-center justify-center grow bg-base-200">
        <div className="loading loading-spinner loading-lg text-primary"></div>
        <p className="mt-4 text-lg font-medium">Fetching Contract State...</p>
      </div>
    );
  }

  const isBuyer = connectedAddress?.toLowerCase() === order.buyer.toLowerCase();
  const isSeller = connectedAddress?.toLowerCase() === order.seller.toLowerCase();

  const isExpired = order.status === 0 && Date.now() / 1000 > Number(order.createdAt) + 86400;
  const expiryTime = new Date((Number(order.createdAt) + 86400) * 1000);

  // CREATED=0, ACCEPTED=1, IN_PRODUCTION=2, PRODUCTION_COMPLETED=3, SHIPPED=4, DELIVERED=5, COMPLETED=6, DISPUTED=7, REFUNDED=8
  const timelineStatus = isExpired
    ? EscrowStatus.CANCELLED
    : order.status === 0
      ? EscrowStatus.CREATED
      : order.status === 1
        ? EscrowStatus.ACCEPTED
        : order.status === 2
          ? EscrowStatus.PRODUCTION
          : order.status === 3
            ? EscrowStatus.PRODUCTION_COMPLETED
            : order.status === 4
              ? EscrowStatus.SHIPPED
              : order.status === 5
                ? EscrowStatus.DELIVERED
                : order.status === 6
                  ? EscrowStatus.COMPLETED
                  : order.status === 7
                    ? EscrowStatus.DISPUTED
                    : order.status === 8
                      ? EscrowStatus.CANCELLED
                      : EscrowStatus.CREATED;

  const milestone1 = (parseFloat(order.amount) * 0.3).toFixed(4);
  const milestone2 = (parseFloat(order.amount) * 0.5).toFixed(4);
  const milestone3 = (parseFloat(order.amount) * 0.2).toFixed(4);

  const getTrackingUrl = (provider: string, tracking: string) => {
    const p = provider.toLowerCase();
    if (p.includes("fedex")) return `https://www.fedex.com/fedextrack/?trknbr=${tracking}`;
    if (p.includes("ups")) return `https://www.ups.com/track?tracknum=${tracking}`;
    if (p.includes("dhl")) return `https://www.dhl.com/en/express/tracking.html?AWB=${tracking}&brand=DHL`;
    return null;
  };

  return (
    <div className="flex flex-col grow bg-base-200 pb-20">
      <div className="max-w-7xl w-full mx-auto px-4 mt-8">
        <div className="text-sm breadcrumbs mb-6 text-base-content/60">
          <ul>
            <li>
              <Link href="/dashboard" className="flex items-center gap-2 hover:text-primary">
                <HomeIcon className="h-4 w-4" />
                Dashboard
              </Link>
            </li>
            <li>
              <Link href="/orders" className="flex items-center gap-2 hover:text-primary">
                <Square2StackIcon className="h-4 w-4" />
                My Orders
              </Link>
            </li>
            <li className="font-bold text-base-content">
              <span className="flex items-center gap-2">
                <DocumentCheckIcon className="h-4 w-4" />
                Order Details
              </span>
            </li>
          </ul>
        </div>

        <div className="mb-10">
          <LogisticsTimeline currentStatus={timelineStatus} isPaused={order.disputed} />
        </div>

        <div className="card bg-base-100 shadow-xl border border-secondary/20 rounded-sm overflow-hidden">
          <div className="card-body p-0">
            <div className="bg-primary/5 p-8 border-b border-primary/10">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 text-primary mb-2">
                    <CheckCircleIcon className="h-6 w-6" />
                    <span className="font-bold uppercase tracking-wider text-sm">
                      Escrow #{contractAddress.slice(-4)}
                    </span>
                  </div>
                  <h2 className="text-4xl font-black text-base-content mb-2">{order.item}</h2>
                  <Address address={order.address} />
                </div>
                <div className="text-right">
                  <div className="text-xs uppercase opacity-50 font-bold mb-1">Status</div>
                  <div
                    className={`badge ${order.status === 7 || isExpired ? "badge-error" : "badge-primary"} p-4 rounded-sm font-bold text-lg uppercase tracking-tighter`}
                  >
                    {isExpired
                      ? "Expired"
                      : [
                          "Created",
                          "Accepted",
                          "In Production",
                          "Production Ready",
                          "Shipped",
                          "Delivered",
                          "Completed",
                          "Disputed",
                          "Cancelled",
                        ][order.status]}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="col-span-2 space-y-8">
                {/* ACTION CARDS */}
                {order.status === 0 && (
                  <div
                    className={`${isExpired ? "bg-error/10 border-error/20" : "bg-warning/10 border-warning/20"} p-6 rounded-sm border`}
                  >
                    <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                      {isExpired ? <XMarkIcon className="h-5 w-5 text-error" /> : <ClockIcon className="h-5 w-5" />}
                      {isExpired ? "Offer Expired" : "Waiting for Seller"}
                    </h3>
                    <p className="text-sm mb-4">
                      {isExpired
                        ? "This contract offer was not accepted within the 24-hour window and is now void."
                        : `The seller has until ${expiryTime.toLocaleString()} to review and accept these terms.`}
                    </p>
                    <div className="flex flex-col gap-3">
                      {isSeller && !isExpired && (
                        <>
                          <button
                            className={`btn btn-warning rounded-sm shadow-md px-10 ${isActionLoading ? "loading" : ""}`}
                            onClick={() => handleAction("acceptContract")}
                          >
                            Accept Terms & Contract
                          </button>
                        </>
                      )}
                      {isBuyer && (
                        <button
                          className={`btn btn-error btn-outline rounded-sm ${isActionLoading ? "loading" : ""}`}
                          onClick={() => handleAction("cancelContract")}
                        >
                          {isExpired ? "Clear from Dashboard" : "Withdraw Order"}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {order.status === 1 && (
                  <>
                    {isBuyer ? (
                      <div className="bg-primary/10 p-6 rounded-sm border border-primary/20">
                        <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                          <CurrencyDollarIcon className="h-5 w-5" /> Secure Escrow Funding
                        </h3>
                        <p className="text-sm mb-4">
                          Terms accepted. Please fund the contract to initiate production and secure the trade.
                        </p>

                        <div className="bg-primary/20 p-4 rounded-sm border border-primary/30 mb-6">
                          <p className="text-sm font-bold text-primary mb-0 flex items-center gap-2">
                            <ShieldCheckIcon className="h-5 w-5" />
                            Depositing Total {order.amount} ETH and Auto Release {milestone1} ETH (30%) for seller to
                            start production.
                          </p>
                        </div>

                        <button
                          className={`btn btn-primary rounded-sm shadow-lg px-8 ${isActionLoading ? "loading" : ""}`}
                          onClick={() => handleAction("depositAndStartProduction", [], parseEther(order.amount))}
                        >
                          Deposit and Auto Release
                        </button>
                      </div>
                    ) : isSeller ? (
                      <div className="bg-base-200 p-6 rounded-sm border border-base-300">
                        <h3 className="font-bold text-lg mb-2 flex items-center gap-2 text-base-content/70">
                          <ClockIcon className="h-5 w-5" /> Awaiting Initial Deposit
                        </h3>
                        <p className="text-sm mb-1">
                          Contract terms accepted. Waiting for the buyer to fund the escrow.
                        </p>
                        <p className="text-xs opacity-50 italic">
                          Production should commence immediately after the initial 30% ({milestone1} ETH) is released.
                        </p>
                      </div>
                    ) : null}
                  </>
                )}

                {order.status === 2 && (
                  <div className="space-y-6">
                    {isSeller && (
                      <div className="bg-success/10 p-6 rounded-sm border border-success/20">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-bold text-lg flex items-center gap-2">
                              <ArrowPathIcon className="h-5 w-5" /> Post Production Update
                            </h3>
                            <p className="text-sm opacity-70">
                              Keep the buyer informed. These updates will be permanently recorded on-chain when you
                              ship.
                            </p>
                          </div>
                          <button
                            className={`btn btn-sm btn-outline btn-success rounded-sm ${isActionLoading ? "loading" : ""}`}
                            onClick={() => handleAction("finishProduction")}
                          >
                            Mark Production as Finished
                          </button>
                        </div>

                        <div className="flex flex-col md:flex-row gap-3">
                          <label
                            className={`flex-1 flex items-center justify-center gap-2 border-2 border-dashed rounded-sm p-2 transition-colors cursor-pointer bg-base-100 ${productionCid ? "border-success" : "border-base-300"}`}
                          >
                            {isUploadingProduction ? (
                              <ArrowPathIcon className="h-4 w-4 animate-spin" />
                            ) : (
                              <PaperClipIcon className="h-4 w-4 opacity-50" />
                            )}
                            <span className="text-xs font-medium truncate max-w-[200px]">
                              {isUploadingProduction
                                ? "Uploading..."
                                : productionCid
                                  ? "Update Ready"
                                  : productionFileName || "Evidence Photo/Report"}
                            </span>
                            <input
                              type="file"
                              className="hidden"
                              onChange={handleProductionFileUpload}
                              disabled={isUploadingProduction}
                            />
                          </label>
                          <button
                            className={`btn btn-success rounded-sm ${isActionLoading || !productionCid ? "btn-disabled" : ""}`}
                            onClick={() => {
                              setLocalProductionLogs([...localProductionLogs, productionCid]);
                              toast.success("Progress update added to local manifest!");
                              setProductionCid("");
                              setProductionFileName("");
                            }}
                          >
                            Add to Shipping Manifest
                          </button>
                        </div>
                      </div>
                    )}

                    {isBuyer && (
                      <div className="bg-primary/10 p-6 rounded-sm border border-primary/20">
                        <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                          <ClockIcon className="h-5 w-5" /> Production in Progress
                        </h3>
                        <p className="text-sm">
                          The seller is currently manufacturing your item. Once the item ships, the full production
                          audit trail will be available here.
                        </p>
                      </div>
                    )}

                    <div className="card bg-base-100 border border-base-300 rounded-sm">
                      <div className="card-body p-6">
                        <h4 className="text-xs font-black uppercase opacity-50 mb-4 flex items-center gap-2">
                          <ListBulletIcon className="h-4 w-4" /> Production Audit Log (
                          {order.productionLogs.length + (isSeller ? localProductionLogs.length : 0)})
                        </h4>
                        {order.productionLogs.length === 0 && localProductionLogs.length === 0 ? (
                          <p className="text-center py-8 opacity-30 italic text-sm">No production updates yet.</p>
                        ) : (
                          <div className="space-y-4">
                            {order.productionLogs.map((log, index) => (
                              <div
                                key={`onchain-${index}`}
                                className="flex items-center justify-between p-3 bg-base-200 rounded-sm group hover:bg-base-300 transition-colors border-l-4 border-success"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="bg-success/10 text-success p-2 rounded-full font-bold text-[10px]">
                                    On-Chain
                                  </div>
                                  <span className="text-xs font-bold">Verified Production Evidence</span>
                                </div>
                                <a
                                  href={`https://gateway.pinata.cloud/ipfs/${log}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="btn btn-ghost btn-xs gap-1 group-hover:text-primary"
                                >
                                  <DocumentMagnifyingGlassIcon className="h-4 w-4" /> View
                                </a>
                              </div>
                            ))}
                            {isSeller &&
                              localProductionLogs.map((log, index) => (
                                <div
                                  key={`local-${index}`}
                                  className="flex items-center justify-between p-3 bg-base-200 rounded-sm group border-l-4 border-warning italic opacity-80"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="bg-warning/10 text-warning p-2 rounded-full font-bold text-[10px]">
                                      Pending
                                    </div>
                                    <span className="text-xs font-bold">WIP Update (Will sync on ship)</span>
                                  </div>
                                  <a
                                    href={`https://gateway.pinata.cloud/ipfs/${log}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn btn-ghost btn-xs gap-1"
                                  >
                                    <DocumentMagnifyingGlassIcon className="h-4 w-4" /> Preview
                                  </a>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {order.status === 3 && (
                  <div className="space-y-6">
                    {isBuyer && (
                      <div className="bg-success/10 p-6 rounded-sm border border-success/20">
                        <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                          <CheckCircleIcon className="h-5 w-5" /> Production Completed
                        </h3>
                        <p className="text-sm">
                          Manufacturing is finished. The seller is currently preparing your order for shipment. You will
                          be notified as soon as a tracking number is provided.
                        </p>
                      </div>
                    )}

                    {isSeller && (
                      <div className="bg-success/10 p-6 rounded-sm border border-success/20 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-bold text-lg flex items-center gap-2">
                              <TruckIcon className="h-5 w-5" /> Ready for Shipment
                            </h3>
                            <p className="text-sm opacity-70">
                              Production complete. Provide tracking details. All {localProductionLogs.length} pending
                              updates will be committed to the blockchain now.
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="form-control">
                            <label className="label text-[10px] font-bold uppercase opacity-60">Carrier</label>
                            <select id="provider" className="select select-bordered select-sm rounded-sm">
                              <option value="FedEx">FedEx</option>
                              <option value="UPS">UPS</option>
                              <option value="DHL">DHL</option>
                              <option value="Maersk">Maersk</option>
                              <option value="Other">Other Global Carrier</option>
                            </select>
                          </div>
                          <div className="form-control">
                            <label className="label text-[10px] font-bold uppercase opacity-60">Tracking Number</label>
                            <input
                              id="tracking"
                              placeholder="TRK123456789"
                              className="input input-bordered input-sm rounded-sm"
                            />
                          </div>
                        </div>

                        <div className="form-control mb-6">
                          <label className="label text-[10px] font-bold uppercase opacity-60">
                            Final Shipping Proof (Bill of Lading)
                          </label>
                          <label
                            className={`flex items-center justify-center gap-2 border-2 border-dashed rounded-sm p-3 transition-colors cursor-pointer bg-base-100 ${shippingCid ? "border-success" : "border-base-300"}`}
                          >
                            {isUploadingShipping ? (
                              <ArrowPathIcon className="h-4 w-4 animate-spin" />
                            ) : (
                              <PaperClipIcon className="h-4 w-4 opacity-50" />
                            )}
                            <span className="text-sm font-medium">
                              {isUploadingShipping
                                ? "Uploading..."
                                : shippingCid
                                  ? "Proof pinned to IPFS"
                                  : shippingFileName || "Attach Evidence"}
                            </span>
                            <input
                              type="file"
                              className="hidden"
                              onChange={handleShippingFileUpload}
                              disabled={isUploadingShipping}
                            />
                          </label>
                        </div>

                        <button
                          className={`btn btn-success btn-block rounded-sm shadow-md ${isActionLoading ? "loading" : ""}`}
                          onClick={() => {
                            const p = (document.getElementById("provider") as HTMLSelectElement).value;
                            const t = (document.getElementById("tracking") as HTMLInputElement).value;
                            if (!t) return toast.error("Tracking number required");
                            if (!shippingCid) return toast.error("Please upload shipping proof first");
                            handleAction("markShipped", [p, t, shippingCid, localProductionLogs]);
                          }}
                        >
                          Confirm Shipment & Commit Audit Log
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {order.status === 4 && (
                  <>
                    {isBuyer && (
                      <div className="bg-success/10 p-6 rounded-sm border border-success/20">
                        <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                          <TruckIcon className="h-5 w-5" /> Verify Delivery
                        </h3>
                        <p className="text-sm mb-4">
                          The item has been shipped. Please check the delivery status before confirming.
                        </p>

                        <div className="bg-base-100 p-4 rounded-sm border border-success/20 shadow-sm mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
                          <div>
                            <p className="text-[10px] uppercase font-bold opacity-50 mb-1">Carrier & Tracking</p>
                            <p className="text-sm font-bold">
                              {order.shippingProvider} — <span className="font-mono">{order.trackingNumber}</span>
                            </p>
                          </div>
                          {getTrackingUrl(order.shippingProvider, order.trackingNumber) && (
                            <a
                              href={getTrackingUrl(order.shippingProvider, order.trackingNumber) || "#"}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-outline btn-sm btn-primary gap-2"
                            >
                              <ArrowTopRightOnSquareIcon className="h-4 w-4" /> Track Shipment
                            </a>
                          )}
                        </div>

                        <div className="flex flex-col gap-2">
                          <p className="text-xs font-bold opacity-70">
                            Once you verify the item has arrived and is in good condition:
                          </p>
                          <button
                            className={`btn btn-success rounded-sm shadow-lg ${isActionLoading ? "loading" : ""}`}
                            onClick={() => handleAction("confirmDelivery")}
                          >
                            Confirm Delivery & Release {milestone2} ETH
                          </button>
                        </div>
                      </div>
                    )}

                    {isSeller && (
                      <div className="bg-primary/5 p-8 rounded-sm border border-primary/20">
                        <div className="flex flex-col items-center text-center">
                          <div className="relative mb-6">
                            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping scale-150 opacity-20"></div>
                            <div className="bg-primary/10 p-5 rounded-full text-primary relative z-10">
                              <TruckIcon className="h-12 w-12" />
                            </div>
                          </div>
                          <h3 className="text-2xl font-black mb-2">Shipment in Transit</h3>
                          <p className="text-sm opacity-70 max-w-md mx-auto mb-8">
                            You have successfully marked the item as shipped. We are now waiting for the buyer to
                            confirm the delivery at their warehouse.
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {order.status === 5 && (
                  <div className="bg-success/10 p-6 rounded-sm border border-success/20">
                    <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                      <CheckCircleIcon className="h-5 w-5" /> Final Inspection Phase
                    </h3>
                    <p className="text-sm mb-4">Item delivered. The 14-day inspection period is active.</p>

                    <div className="bg-base-100 p-4 rounded-sm border border-warning/20 shadow-sm mb-6">
                      <p className="text-[10px] uppercase font-bold opacity-50 mb-1 flex items-center gap-1">
                        <ClockIcon className="h-3 w-3" /> Fairness Timer
                      </p>
                      <p className="text-sm font-bold text-warning">Automatic Release in 14 Days</p>
                    </div>

                    {isBuyer ? (
                      <div className="flex flex-col gap-2">
                        <p className="text-xs font-bold opacity-70">
                          Satisfied with the item? Complete the contract to release the final 20%:
                        </p>
                        <button
                          className={`btn btn-success rounded-sm shadow-lg ${isActionLoading ? "loading" : ""}`}
                          onClick={() => handleAction("buyerCompletecontract")}
                        >
                          Complete & Release {milestone3} ETH
                        </button>
                      </div>
                    ) : isSeller ? (
                      <div className="flex flex-col gap-2">
                        <p className="text-xs font-bold opacity-70">
                          You can claim the final payment once the inspection period expires:
                        </p>
                        <button
                          className={`btn btn-primary rounded-sm shadow-lg ${isActionLoading ? "loading" : ""}`}
                          onClick={() => handleAction("sellerClaimFinalPayment")}
                          disabled={Date.now() < Number(order.deliveredAt) * 1000 + 14 * 86400 * 1000}
                        >
                          {Date.now() < Number(order.deliveredAt) * 1000 + 14 * 86400 * 1000
                            ? "Inspection Period Active"
                            : `Claim Final ${milestone3} ETH`}
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}

                {order.status === 6 && (
                  <div className="bg-success/10 p-8 rounded-sm border border-success/20">
                    <div className="flex flex-col items-center text-center">
                      <div className="flex justify-center mb-4">
                        <div className="relative">
                          <ShieldCheckIcon className="h-20 w-20 text-success opacity-20" />
                          <div className="absolute bottom-0 right-0 bg-base-100 rounded-full p-1 border border-success/20">
                            <CheckCircleIcon className="h-8 w-8 text-success" />
                          </div>
                        </div>
                      </div>
                      <h3 className="text-3xl font-black mb-2">100% Payment Released</h3>
                      <p className="text-sm opacity-70 mb-6 mx-auto max-w-md">
                        This escrow has been successfully finalized. All funds have been transferred to the seller, and
                        the machine&apos;s provenance has been secured.
                      </p>
                    </div>
                  </div>
                )}

                {order.status === 7 && (
                  <div className="bg-error/10 p-8 rounded-sm border border-error/20 text-center">
                    <ExclamationTriangleIcon className="h-12 w-12 text-error mx-auto mb-4" />
                    <h3 className="text-2xl font-black text-error mb-2">Order Under Dispute</h3>
                    <p className="text-sm opacity-70 mb-6 max-w-md mx-auto">
                      All logistics and payments for this contract have been frozen. The Arbitrator is currently
                      reviewing the evidence and statement provided.
                    </p>
                  </div>
                )}

                {/* Dispute Action (Buyer only) */}
                {order.status >= 2 && order.status < 6 && !order.disputed && isBuyer && (
                  <div className="bg-error/5 p-6 rounded-sm border border-error/10">
                    <h3 className="font-bold text-error mb-2">Need to Raise a Dispute?</h3>
                    <p className="text-xs opacity-70 mb-4">
                      If there are issues with the production or delivery, you can freeze the contract and request
                      arbitration.
                    </p>
                    <div className="flex flex-col gap-3">
                      <textarea
                        className="textarea textarea-bordered rounded-sm"
                        placeholder="Reason for dispute..."
                        value={disputeReasonInput}
                        onChange={e => setDisputeReasonInput(e.target.value)}
                      ></textarea>
                      <button
                        className="btn btn-error btn-sm rounded-sm"
                        onClick={handleRaiseDispute}
                        disabled={isActionLoading}
                      >
                        Raise Formal Dispute
                      </button>
                    </div>
                  </div>
                )}

                {/* DETAILS STATS */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="stat bg-base-100 border border-base-300 rounded-sm p-4">
                    <div className="stat-title text-[10px] uppercase font-bold opacity-50">Total Value</div>
                    <div className="stat-value text-2xl font-black text-primary">{order.amount} ETH</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase opacity-50">Buyer</h4>
                    <Address address={order.buyer} />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase opacity-50">Seller</h4>
                    <Address address={order.seller} />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* PAYMENT BREAKDOWN */}
                <div className="card bg-primary text-primary-content shadow-lg rounded-sm overflow-hidden">
                  <div className="card-body p-5">
                    <h3 className="text-[10px] uppercase font-black tracking-widest opacity-70 flex items-center gap-2 mb-4">
                      <CurrencyDollarIcon className="h-4 w-4" /> Payment Milestones
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase opacity-60">1. Production (30%)</span>
                        </div>
                        <span className="font-mono font-bold text-sm">{milestone1} ETH</span>
                      </div>
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase opacity-60">2. Delivery (50%)</span>
                        </div>
                        <span className="font-mono font-bold text-sm">{milestone2} ETH</span>
                      </div>
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase opacity-60">3. Inspection (20%)</span>
                        </div>
                        <span className="font-mono font-bold text-sm">{milestone3} ETH</span>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-primary-content/10 flex justify-between items-center">
                      <span className="text-xs font-black uppercase">Total Volume</span>
                      <span className="text-lg font-black">{order.amount} ETH</span>
                    </div>
                  </div>
                </div>

                <div className="card bg-base-200/50 border border-base-300 rounded-sm">
                  <div className="card-body p-4">
                    <h3 className="font-black uppercase text-xs flex items-center gap-2 mb-4">
                      <PaperClipIcon className="h-4 w-4 opacity-40" /> Documents
                    </h3>
                    <div className="bg-base-100 p-3 rounded-sm border border-dashed border-base-300 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DocumentCheckIcon className="h-5 w-5 text-success" />
                        <span className="text-xs font-bold">Purchase Order</span>
                      </div>
                      <a
                        href={`https://gateway.pinata.cloud/ipfs/${order.poCid}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-ghost btn-xs btn-square"
                      >
                        <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderManagement;
