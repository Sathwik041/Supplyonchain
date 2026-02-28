"use client";

import React from "react";
import {
  CheckCircleIcon,
  CubeIcon,
  CurrencyDollarIcon,
  DocumentCheckIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";

export enum EscrowStatus {
  CREATED,
  ACCEPTED,
  PRODUCTION,
  PRODUCTION_COMPLETED,
  SHIPPED,
  DELIVERED,
  COMPLETED,
  DISPUTED,
  CANCELLED,
}

interface LogisticsTimelineProps {
  currentStatus: EscrowStatus;
  isPaused?: boolean;
  isDraft?: boolean;
}

const LogisticsTimeline: React.FC<LogisticsTimelineProps> = ({ currentStatus, isPaused, isDraft }) => {
  const steps = [
    { name: "Contract", status: EscrowStatus.ACCEPTED, icon: DocumentCheckIcon, description: "Accepted" },
    {
      name: "Funding",
      status: EscrowStatus.PRODUCTION,
      icon: CurrencyDollarIcon,
      description: "30% Released",
      percentage: "30%",
    },
    { name: "Production", status: EscrowStatus.PRODUCTION_COMPLETED, icon: CubeIcon, description: "Manufacturing" },
    { name: "Shipped", status: EscrowStatus.SHIPPED, icon: TruckIcon, description: "In transit" },
    {
      name: "Delivered",
      status: EscrowStatus.DELIVERED,
      icon: CheckCircleIcon,
      description: "50% Released",
      percentage: "50%",
    },
    {
      name: "Completed",
      status: EscrowStatus.COMPLETED,
      icon: CheckCircleIcon,
      description: "20% Released",
      percentage: "20%",
    },
  ];

  const getStepClass = (stepStatus: EscrowStatus) => {
    if (currentStatus === EscrowStatus.CANCELLED) return "step-error";
    if (isPaused && stepStatus === currentStatus) return "step-warning";
    if (isDraft && stepStatus === EscrowStatus.CREATED) return "step-primary";
    if (currentStatus > stepStatus) return "step-success";
    if (currentStatus === stepStatus) return "step-success"; // Current milestone is achieved

    const currentIndexInSteps = steps.findIndex(s => s.status === currentStatus);
    const stepIndex = steps.findIndex(s => s.status === stepStatus);
    if (!isDraft && !isPaused && stepIndex === currentIndexInSteps + 1 && currentStatus < EscrowStatus.COMPLETED)
      return "step-primary";

    return "";
  };

  const getIconContainerClass = (stepStatus: EscrowStatus) => {
    if (currentStatus === EscrowStatus.CANCELLED) return "bg-error/10 text-error border-error/30";
    if (isPaused && stepStatus === currentStatus) return "bg-warning/10 text-warning border-warning/30 animate-pulse";
    if (isDraft && stepStatus === EscrowStatus.CREATED)
      return "bg-primary/10 text-primary border-primary animate-pulse";
    if (currentStatus >= stepStatus) return "bg-success/10 text-success border-success/30";

    const currentIndexInSteps = steps.findIndex(s => s.status === currentStatus);
    const stepIndex = steps.findIndex(s => s.status === stepStatus);
    if (!isDraft && !isPaused && stepIndex === currentIndexInSteps + 1 && currentStatus < EscrowStatus.COMPLETED) {
      return "bg-primary/10 text-primary border-primary animate-pulse";
    }

    return "bg-base-200 text-base-content/20 border-base-300";
  };

  const getLabelClass = (stepStatus: EscrowStatus) => {
    if (currentStatus === EscrowStatus.CANCELLED) {
      if (stepStatus <= currentStatus) return "text-error font-bold";
      return "text-base-content/40 font-medium";
    }
    if (isPaused && stepStatus === currentStatus) return "text-warning font-bold";
    if (isDraft && stepStatus === EscrowStatus.CREATED) return "text-primary font-bold";
    if (currentStatus >= stepStatus) return "text-success font-bold";

    const currentIndexInSteps = steps.findIndex(s => s.status === currentStatus);
    const stepIndex = steps.findIndex(s => s.status === stepStatus);
    if (!isDraft && !isPaused && stepIndex === currentIndexInSteps + 1 && currentStatus < EscrowStatus.COMPLETED) {
      return "text-primary font-bold";
    }

    return "text-base-content/40 font-medium";
  };

  return (
    <div className="w-full py-4 px-4 bg-base-100 rounded-sm shadow-md border border-secondary/10 relative">
      {isPaused && (
        <div className="absolute top-2 right-2 flex items-center gap-2 px-3 py-1 bg-warning/20 text-warning rounded-full border border-warning/30 z-20">
          <div className="w-2 h-2 bg-warning rounded-full animate-ping"></div>
          <span className="text-[10px] font-black uppercase tracking-tighter">Logistics Paused</span>
        </div>
      )}
      <div className="flex justify-between items-center mb-6 px-2">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <TruckIcon className="h-5 w-5 text-success" />
          Logistics Status
        </h2>
        {currentStatus === EscrowStatus.COMPLETED && (
          <div className="badge badge-success gap-2 py-3 rounded-sm font-bold">
            <CheckCircleIcon className="h-4 w-4" /> Order Finalized
          </div>
        )}
      </div>

      <ul className="steps steps-vertical lg:steps-horizontal w-full">
        {steps.map((step, index) => {
          const currentIndex = steps.findIndex(s => s.status === currentStatus);
          const isReached = isDraft
            ? false
            : step.name === "Contract"
              ? currentStatus >= EscrowStatus.ACCEPTED
              : currentStatus >= step.status;

          const isActive =
            (isDraft && step.name === "Contract") ||
            (!isDraft &&
              !isPaused &&
              !isReached &&
              ((step.name === "Contract" && currentStatus === EscrowStatus.CREATED) ||
                (step.name === "Funding" && currentStatus === EscrowStatus.ACCEPTED) ||
                (index === currentIndex + 1 &&
                  currentStatus >= EscrowStatus.PRODUCTION &&
                  currentStatus < EscrowStatus.COMPLETED)));

          return (
            <li
              key={step.name}
              className={`step ${getStepClass(step.status)} transition-all duration-500 text-[10px]`}
              data-content={isReached ? "✓" : isActive ? "●" : ""}
            >
              <div className="flex flex-col items-center mt-2 group relative">
                {step.percentage && (
                  <div
                    className={`absolute -top-10 px-2 py-0.5 rounded-full text-[9px] font-black border ${
                      isReached
                        ? "bg-success text-success-content border-success"
                        : isActive
                          ? "bg-primary text-primary-content border-primary"
                          : "bg-base-200 text-base-content/40 border-base-300"
                    }`}
                  >
                    {step.percentage}
                  </div>
                )}
                <div
                  className={`p-2.5 rounded-lg border-2 mb-2 transition-all duration-300 group-hover:scale-110 ${getIconContainerClass(step.status)}`}
                >
                  <step.icon className="h-5 w-5" />
                </div>
                <span className={`text-xs tracking-tight ${getLabelClass(step.status)}`}>{step.name}</span>
                <span className="text-[9px] uppercase font-bold opacity-30 mt-0.5 tracking-tighter">
                  {isReached ? "Completed" : isActive ? "In Progress" : "Not Started"}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      {isPaused && (
        <div className="mt-8 alert alert-warning shadow-lg rounded-sm mx-4 w-auto text-warning-content">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span>Dispute Raised! Logistics and payments are frozen until resolution.</span>
        </div>
      )}

      {currentStatus === EscrowStatus.CANCELLED && (
        <div className="mt-8 alert alert-error shadow-lg rounded-sm mx-4 w-auto text-error-content">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>This contract has been Declined/Cancelled.</span>
        </div>
      )}
    </div>
  );
};

export default LogisticsTimeline;
