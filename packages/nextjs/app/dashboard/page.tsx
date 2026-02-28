"use client";

import Link from "next/link";
import type { NextPage } from "next";
import {
  ExclamationTriangleIcon,
  IdentificationIcon,
  ListBulletIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/outline";

const Dashboard: NextPage = () => {
  return (
    <div className="flex flex-col items-center justify-center grow bg-base-200">
      <div className="max-w-md w-full p-8 bg-base-100 rounded-2xl shadow-2xl text-center">
        <h1 className="text-3xl font-bold mb-10 text-primary uppercase tracking-wider">Dashboard</h1>
        <div className="flex flex-col gap-6">
          <Link
            href="/create"
            className="btn btn-primary btn-lg text-xl hover:scale-105 transition-transform flex gap-3"
          >
            <PlusCircleIcon className="h-6 w-6" />
            Create a Contract
          </Link>
          <Link
            href="/orders"
            className="btn btn-secondary btn-lg text-xl hover:scale-105 transition-transform flex gap-3"
          >
            <ListBulletIcon className="h-6 w-6" />
            View Orders
          </Link>
          <Link
            href="/orders"
            className="btn btn-accent btn-lg text-xl hover:scale-105 transition-transform flex gap-3"
          >
            <IdentificationIcon className="h-6 w-6" />
            View Machine Passports
          </Link>
          <Link
            href="/arbitration"
            className="btn btn-error btn-lg text-xl hover:scale-105 transition-transform flex gap-3"
          >
            <ExclamationTriangleIcon className="h-6 w-6" />
            View Order Disputes
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
