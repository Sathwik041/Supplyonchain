"use client";

import type { NextPage } from "next";

const About: NextPage = () => {
  return (
    <div className="flex flex-col items-center justify-center grow bg-base-200 py-20 px-4">
      <div className="max-w-3xl text-center">
        <h1 className="text-4xl font-black mb-8">About SupplyOnChain</h1>
        <p className="text-xl opacity-80 mb-6">
          SupplyOnChain is a decentralized escrow protocol designed for high-value industrial transactions. By
          leveraging smart contracts on the blockchain, we eliminate the need for traditional, expensive, and slow
          intermediaries.
        </p>
        <p className="text-xl opacity-80 mb-6">
          Our milestone-based payment structure ensures that funds are only released when specific production and
          delivery goals are verified, providing security for both buyers and sellers.
        </p>
        <p className="text-xl opacity-80">
          Upon successful completion of a contract, the protocol automatically mints a Digital Machine Passport as an
          NFT, serving as an immutable Certificate of Origin and specification for the asset.
        </p>
      </div>
    </div>
  );
};

export default About;
