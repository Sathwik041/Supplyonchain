"use client";

import Link from "next/link";
import type { NextPage } from "next";

const Home: NextPage = () => {
  return (
    <>
      <div className="flex items-center flex-col grow pt-10 px-4">
        <div className="max-w-4xl text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
            Next-Gen Supply Chain Protocol
            <span className="text-primary text-5xl md:text-7xl block mt-2">SUPPLYONCHAIN</span>
          </h1>

          <div className="mb-10 text-xl md:text-2xl text-base-content/80 max-w-3xl mx-auto space-y-4">
            <p>
              Securing high-value industrial transactions through milestone-based smart escrows and digital machine
              passports.
            </p>
            <p className="font-semibold text-primary/90">
              30% Initial Production &bull; 50% Verified Delivery &bull; 20% Final Inspection
            </p>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16">
            <Link
              href="/dashboard"
              className="btn btn-primary btn-lg px-12 text-xl shadow-lg hover:scale-105 transition-transform"
            >
              Get Started
            </Link>
            <Link href="/about" className="btn btn-outline btn-lg px-12 text-xl hover:bg-primary/10">
              Learn More
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-4 max-w-6xl w-full px-4 mb-20">
          <div className="card bg-base-100 shadow-xl border border-secondary hover:scale-105 transition-transform">
            <div className="card-body">
              <h2 className="card-title text-primary font-bold">📦 For Buyers</h2>
              <p>
                Secure your industrial orders. Pay in milestones as the production and shipping progresses. Full control
                over delivery confirmation.
              </p>
            </div>
          </div>
          <div className="card bg-base-100 shadow-xl border border-secondary hover:scale-105 transition-transform">
            <div className="card-body">
              <h2 className="card-title text-primary font-bold">⚙️ For Sellers</h2>
              <p>
                Get upfront production costs. Receive payments automatically upon shipping and delivery confirmation.
                Protected by smart contract escrow.
              </p>
            </div>
          </div>
          <div className="card bg-base-100 shadow-xl border border-secondary hover:scale-105 transition-transform">
            <div className="card-body">
              <h2 className="card-title text-primary font-bold">⚖️ Arbitration</h2>
              <p>
                A neutral ground to resolve disputes in the supply chain. Review milestones and evidence to release
                funds fairly and transparently.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
