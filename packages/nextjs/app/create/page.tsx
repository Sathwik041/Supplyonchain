"use client";

import React, { ChangeEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import jsQR from "jsqr";
import type { NextPage } from "next";
import { toast } from "react-hot-toast";
import { decodeEventLog, isAddress, parseEther } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  PaperClipIcon,
  QrCodeIcon,
  RocketLaunchIcon,
  ShieldCheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import LogisticsTimeline, { EscrowStatus } from "~~/components/LogisticsTimeline";
import { BlockieAvatar } from "~~/components/scaffold-eth";
import deployedContractsData from "~~/contracts/deployedContracts";
import { useScaffoldWriteContract, useTargetNetwork } from "~~/hooks/scaffold-eth";

const CreateContract: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const publicClient = usePublicClient();
  const router = useRouter();
  const { targetNetwork } = useTargetNetwork();

  const [status] = useState<EscrowStatus>(EscrowStatus.CREATED);
  const [totalAmount, setTotalAmount] = useState<string>("");
  const [sellerAddress, setSellerAddress] = useState<string>("");
  const [arbitratorAddress, setArbitratorAddress] = useState<string>("");
  const [itemName, setItemName] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [deliveryDays, setDeliveryDays] = useState<string>("");

  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [poCid, setPoCid] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");

  const [sellerVerified, setSellerVerified] = useState<boolean | null>(null);
  const [arbitratorVerified, setArbitratorVerified] = useState<boolean | null>(null);

  const handleRemoveFile = () => {
    setPoCid("");
    setFileName("");
    toast.success("File removed");
  };

  const handleQrVerify = async (e: ChangeEvent<HTMLInputElement>, target: "seller" | "arbitrator") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    const notificationId = toast.loading("Scanning QR code...");

    reader.onload = async event => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) return;

        const scanImage = (w: number, h: number) => {
          canvas.width = w;
          canvas.height = h;
          context.imageSmoothingEnabled = false;
          context.filter = "grayscale(100%) contrast(120%)";
          context.drawImage(img, 0, 0, w, h);
          const data = context.getImageData(0, 0, w, h);
          return jsQR(data.data, w, h, { inversionAttempts: "attemptBoth" });
        };

        let code = scanImage(img.width, img.height);
        if (!code && img.width > 800) code = scanImage(800, (800 / img.width) * img.height);
        if (!code && img.width > 400) code = scanImage(400, (400 / img.width) * img.height);

        if (code) {
          let qrAddress = code.data.trim();
          if (qrAddress.includes(":")) {
            const parts = qrAddress.split(":");
            const possibleAddress = parts[parts.length - 1].split("@")[0];
            if (isAddress(possibleAddress)) qrAddress = possibleAddress;
          }

          const targetAddress = target === "seller" ? sellerAddress : arbitratorAddress;

          if (!targetAddress) {
            if (target === "seller") {
              setSellerAddress(qrAddress);
              setSellerVerified(true);
            } else {
              setArbitratorAddress(qrAddress);
              setArbitratorVerified(true);
            }
            toast.success("Address extracted and filled!", { id: notificationId });
          } else if (qrAddress.toLowerCase() === targetAddress.toLowerCase()) {
            if (target === "seller") setSellerVerified(true);
            else setArbitratorVerified(true);
            toast.success(`${target.charAt(0).toUpperCase() + target.slice(1)} Verified!`, { id: notificationId });
          } else {
            if (target === "seller") setSellerVerified(false);
            else setArbitratorVerified(false);
            toast.error(`Security Warning: QR does not match input address!`, { id: notificationId });
          }
        } else {
          toast.error("Scan failed. Try to zoom in on the QR or ensure it's not blurry.", {
            id: notificationId,
            duration: 6000,
          });
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const milestone1 = totalAmount ? (parseFloat(totalAmount) * 0.3).toFixed(4) : "0.00";
  const milestone2 = totalAmount ? (parseFloat(totalAmount) * 0.5).toFixed(4) : "0.00";
  const milestone3 = totalAmount ? (parseFloat(totalAmount) * 0.2).toFixed(4) : "0.00";

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setFileName(file.name);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const metadata = JSON.stringify({ name: `PO_${file.name}_${Date.now()}` });
      formData.append("pinataMetadata", metadata);
      const options = JSON.stringify({ cidVersion: 0 });
      formData.append("pinataOptions", options);

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
        setPoCid(resData.IpfsHash);
        toast.success("PO uploaded to IPFS successfully!");
      } else {
        throw new Error(resData.error || "Upload failed");
      }
    } catch (error) {
      console.error("Error uploading to Pinata:", error);
      toast.error("Failed to upload file to IPFS.");
    } finally {
      setIsUploading(false);
    }
  };

  const { writeContractAsync: createEscrowAsync } = useScaffoldWriteContract({
    contractName: "EscrowFactory",
  });

  const handleDeploy = async () => {
    if (!connectedAddress) return toast.error("Please connect your wallet first.");
    if (!sellerAddress || !arbitratorAddress || !totalAmount || !itemName || !quantity || !deliveryDays)
      return toast.error("Please fill in all required fields.");
    if (!isAddress(sellerAddress)) return toast.error("Invalid Seller Address.");
    if (!isAddress(arbitratorAddress)) return toast.error("Invalid Arbitrator Address.");
    if (connectedAddress?.toLowerCase() === arbitratorAddress.toLowerCase())
      return toast.error("Buyer and Arbitrator cannot be the same address.");
    if (connectedAddress?.toLowerCase() === sellerAddress.toLowerCase())
      return toast.error("Buyer and Seller cannot be the same address.");
    if (sellerAddress.toLowerCase() === arbitratorAddress.toLowerCase())
      return toast.error("Seller and Arbitrator cannot be the same address.");
    if (!poCid) return toast.error("Please upload the Purchase Order first.");

    setIsDeploying(true);
    const notificationId = toast.loading("Creating Escrow via Factory...");

    try {
      const txHash = await createEscrowAsync({
        functionName: "createEscrow",
        args: [
          connectedAddress,
          sellerAddress,
          arbitratorAddress,
          parseEther(totalAmount),
          itemName,
          BigInt(quantity),
          BigInt(parseInt(deliveryDays) * 86400),
          poCid,
        ],
      });

      if (!txHash || !publicClient || !targetNetwork) throw new Error("Transaction failed or network error");
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

      const factoryAbi = (deployedContractsData as any)[targetNetwork.id]?.EscrowFactory?.abi;
      if (!factoryAbi) throw new Error("Factory ABI not found");

      let newEscrowAddress = "";
      for (const log of receipt.logs) {
        try {
          const event = decodeEventLog({
            abi: factoryAbi,
            eventName: "EscrowCreated",
            data: log.data,
            topics: log.topics,
          });
          newEscrowAddress = (event.args as any).escrowAddress;
          break;
        } catch {}
      }

      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ["#22c55e", "#3b82f6", "#f59e0b"] });
      toast.success("Escrow created successfully!", { id: notificationId });

      if (newEscrowAddress) router.push(`/orders/${newEscrowAddress}`);
      else router.push(`/orders`);
    } catch (error: any) {
      console.error("Creation failed:", error);
      toast.error(`Creation failed: ${error.message}`, { id: notificationId });
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="flex flex-col grow bg-base-200 pb-20 relative">
      <div className="max-w-7xl w-full mx-auto px-4 mt-8">
        <div className="mb-10">
          <LogisticsTimeline currentStatus={status} isDraft={true} />
        </div>

        <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in duration-700">
          <div className="card bg-base-100 shadow-xl border border-secondary/20 flex-1 rounded-sm overflow-hidden">
            <div className="card-body p-8 md:p-12">
              <h2 className="card-title text-3xl text-primary mb-8 border-b pb-4 font-bold">Create New Contract</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                <div className="space-y-6">
                  <h3 className="font-bold text-lg opacity-70 uppercase tracking-tight flex items-center gap-2">
                    <ShieldCheckIcon className="h-5 w-5" />
                    Participant Details
                  </h3>
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold">Buyer Address (You)</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered w-full bg-base-200 rounded-sm font-mono text-xs"
                      disabled
                      value={connectedAddress || "Connect Wallet"}
                    />
                  </div>

                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold flex items-center gap-2">
                        Seller Address
                        {sellerVerified === true && (
                          <span className="badge badge-success badge-xs gap-1 text-[8px] uppercase py-2">
                            ✅ Verified
                          </span>
                        )}
                        {sellerVerified === false && (
                          <span className="badge badge-error badge-xs gap-1 text-[8px] uppercase py-2">
                            ❌ Mismatch
                          </span>
                        )}
                      </span>
                    </label>
                    <div className="relative group flex items-center gap-2">
                      {isAddress(sellerAddress) && (
                        <div className="flex-shrink-0">
                          <BlockieAvatar address={sellerAddress} size={35} />
                        </div>
                      )}
                      <div className="relative flex-1">
                        <input
                          type="text"
                          placeholder="0x..."
                          className={`input input-bordered w-full focus:input-primary rounded-sm transition-all pr-12 font-mono text-xs ${sellerAddress && !isAddress(sellerAddress) ? "input-error" : ""} ${sellerVerified === true ? "border-success bg-success/5" : ""} ${sellerVerified === false ? "border-error bg-error/5" : ""}`}
                          value={sellerAddress}
                          onChange={e => {
                            setSellerAddress(e.target.value);
                            setSellerVerified(null);
                          }}
                        />
                        <label className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-primary hover:scale-110 transition-transform">
                          <QrCodeIcon className="h-6 w-6" />
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={e => handleQrVerify(e, "seller")}
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold flex items-center gap-2">
                        Arbitrator Address
                        {arbitratorVerified === true && (
                          <span className="badge badge-success badge-xs gap-1 text-[8px] uppercase py-2">
                            ✅ Verified
                          </span>
                        )}
                        {arbitratorVerified === false && (
                          <span className="badge badge-error badge-xs gap-1 text-[8px] uppercase py-2">
                            ❌ Mismatch
                          </span>
                        )}
                      </span>
                    </label>
                    <div className="relative group flex items-center gap-2">
                      {isAddress(arbitratorAddress) && (
                        <div className="flex-shrink-0">
                          <BlockieAvatar address={arbitratorAddress} size={35} />
                        </div>
                      )}
                      <div className="relative flex-1">
                        <input
                          type="text"
                          placeholder="0x..."
                          className={`input input-bordered w-full focus:input-primary rounded-sm transition-all pr-12 font-mono text-xs ${arbitratorAddress && !isAddress(arbitratorAddress) ? "input-error" : ""} ${arbitratorVerified === true ? "border-success bg-success/5" : ""} ${arbitratorVerified === false ? "border-error bg-error/5" : ""}`}
                          value={arbitratorAddress}
                          onChange={e => {
                            setArbitratorAddress(e.target.value);
                            setArbitratorVerified(null);
                          }}
                        />
                        <label className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-primary hover:scale-110 transition-transform">
                          <QrCodeIcon className="h-6 w-6" />
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={e => handleQrVerify(e, "arbitrator")}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="font-bold text-lg opacity-70 uppercase tracking-tight flex items-center gap-2">
                    <PaperClipIcon className="h-5 w-5" />
                    Cargo & Terms
                  </h3>
                  <div className="flex gap-4">
                    <div className="form-control w-2/3">
                      <label className="label">
                        <span className="label-text font-semibold">Item Name</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Industrial Pump"
                        className="input input-bordered w-full focus:input-primary rounded-sm"
                        value={itemName}
                        onChange={e => setItemName(e.target.value)}
                      />
                    </div>
                    <div className="form-control w-1/3">
                      <label className="label">
                        <span className="label-text font-semibold">Quantity</span>
                      </label>
                      <input
                        type="number"
                        placeholder="10"
                        className="input input-bordered w-full focus:input-primary rounded-sm"
                        value={quantity}
                        onChange={e => setQuantity(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold">Total Amount (MON)</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="1.5"
                      className="input input-bordered w-full focus:input-primary rounded-sm"
                      value={totalAmount}
                      onChange={e => setTotalAmount(e.target.value)}
                    />
                  </div>
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold">Contract Deadline (Days)</span>
                    </label>
                    <input
                      type="number"
                      placeholder="30"
                      className="input input-bordered w-full focus:input-primary rounded-sm"
                      value={deliveryDays}
                      onChange={e => setDeliveryDays(e.target.value)}
                    />
                  </div>

                  <div className="form-control w-full pt-2">
                    <label className="label">
                      <span className="label-text font-semibold text-xs uppercase opacity-60">
                        Purchase Order <span className="text-error font-bold">* Mandatory</span>
                      </span>
                    </label>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 relative group/file">
                        <label className="cursor-pointer block">
                          <div
                            className={`flex items-center justify-center gap-2 border-2 border-dashed rounded-sm p-3 transition-colors ${poCid ? "border-success bg-success/5" : "border-base-300 hover:border-primary"}`}
                          >
                            {isUploading ? (
                              <ArrowPathIcon className="h-5 w-5 animate-spin" />
                            ) : poCid ? (
                              <CheckCircleIcon className="h-5 w-5 text-success" />
                            ) : (
                              <PaperClipIcon className="h-5 w-5 opacity-50" />
                            )}
                            <span className="text-sm truncate font-medium">
                              {isUploading
                                ? "Uploading..."
                                : poCid
                                  ? "PO pinned to IPFS"
                                  : fileName || "Attach Purchase Order"}
                            </span>
                          </div>
                          <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                        </label>
                        {(poCid || fileName) && !isUploading && (
                          <button
                            type="button"
                            onClick={e => {
                              e.preventDefault();
                              handleRemoveFile();
                            }}
                            className="absolute -top-2 -right-2 bg-error text-error-content rounded-full p-1 shadow-lg hover:scale-110 transition-transform z-10"
                            title="Remove file"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card-actions justify-end gap-4 mt-12 border-t pt-8">
                <Link href="/dashboard" className="btn btn-ghost btn-lg rounded-sm">
                  Discard Draft
                </Link>
                <button
                  className={`btn btn-primary btn-lg px-12 shadow-lg flex gap-2 rounded-sm ${isDeploying ? "loading" : ""}`}
                  onClick={handleDeploy}
                  disabled={isDeploying}
                >
                  {!isDeploying && <RocketLaunchIcon className="h-6 w-6" />}
                  {isDeploying ? "Creating..." : "Create Escrow Contract"}
                </button>
              </div>
            </div>
          </div>

          <div className="lg:w-80">
            <div className="sticky top-8 space-y-6">
              <div className="card bg-primary text-primary-content shadow-2xl overflow-hidden rounded-sm">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <CurrencyDollarIcon className="h-24 w-24" />
                </div>
                <div className="card-body relative z-10">
                  <h3 className="card-title text-sm uppercase tracking-widest opacity-80 flex items-center gap-2 font-black">
                    Payment Breakdown
                  </h3>
                  <div className="mt-4 space-y-4">
                    <div className="flex justify-between items-center border-b border-primary-content/20 pb-2">
                      <span className="text-sm font-medium uppercase opacity-60">Total Volume</span>
                      <span className="text-xl font-black">{totalAmount || "0.00"} MON</span>
                    </div>
                    <div className="space-y-4 pt-2">
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col">
                          <span className="text-xs font-black uppercase opacity-70">Production</span>
                          <span className="text-[10px] opacity-60 font-bold">Initial (30%)</span>
                        </div>
                        <span className="font-mono font-bold text-sm">{milestone1} MON</span>
                      </div>
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col">
                          <span className="text-xs font-black uppercase opacity-70">Delivery</span>
                          <span className="text-[10px] opacity-60 font-bold">Verified (50%)</span>
                        </div>
                        <span className="font-mono font-bold text-sm">{milestone2} MON</span>
                      </div>
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col">
                          <span className="text-xs font-black uppercase opacity-70">Inspection</span>
                          <span className="text-[10px] opacity-60 font-bold">Final (20%)</span>
                        </div>
                        <span className="font-mono font-bold text-sm">{milestone3} MON</span>
                      </div>
                    </div>
                    <div className="bg-white/10 p-3 rounded-sm mt-4 text-xs">
                      <p className="font-black mb-1 flex items-center gap-1 uppercase tracking-tighter">
                        <ShieldCheckIcon className="h-3 w-3" /> Escrow Protocol Secured
                      </p>
                      <p className="opacity-80 font-medium">
                        Security provided by industrial-grade smart contract escrow.
                      </p>
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

export default CreateContract;
