# 🏗 Industrial Supply Chain Escrow Protocol

A decentralized escrow and asset tracking system built for high-value industrial procurement. This platform ensures trust between buyers and sellers through milestone-based payments, verified logistics tracking, and NFT-backed **Machine Passports**.

Deployed on **Monad Testnet**.

## 🚀 Overview

This protocol solves the trust gap in international supply chains by locking funds in a secure smart contract that only releases payments upon verified milestones:
- **30% Production Milestone:** Released when the seller accepts and begins manufacturing.
- **50% Delivery Milestone:** Released upon verification of shipping and logistics data.
- **20% Final Inspection:** Released when the buyer confirms the asset meets quality standards.

### 🛡 Key Features

- **Escrow Factory:** Permissionless creation of custom escrow contracts for any industrial agreement.
- **Machine Passport (ERC-721):** Every successfully completed contract automatically mints a unique NFT "Passport" to the buyer, serving as a permanent, on-chain record of the asset's origin, specifications, and provenance.
- **IPFS Integration:** Secure storage of Purchase Orders (POs) and logistics documentation via Pinata.
- **Dispute Resolution:** Integrated arbitrator role to handle exceptions and ensure fair outcomes.
- **QR Code Verification:** Physical-to-Digital verification using mobile-ready QR scanning for participant addresses.

## 🛠 Tech Stack

- **Blockchain:** Monad Testnet
- **Smart Contracts:** Solidity (Hardhat)
- **Frontend:** Next.js, TypeScript, Tailwind CSS, DaisyUI
- **Web3 Hooks:** Wagmi, Viem, Scaffold-ETH 2
- **Storage:** IPFS (Pinata)

## 📍 Contract Addresses (Monad Testnet)

| Contract | Address |
| :--- | :--- |
| **EscrowFactory** | `0xabBd6D1FC5d11Be96713192556C682c5C7962A54` |
| **MachinePassport** | `0xB9612C560E8d91CeaC3602970fcEF3Bf1Cd3ccc0` |
| **SupplyChainEscrow** | `0x6400aB9d9E49D2E667B05197c1738A4cC29533C7` (Implementation) |

## 🚦 Getting Started

### Prerequisites

- [Node.js (>= v20.18.3)](https://nodejs.org/)
- [Yarn](https://yarnpkg.com/)
- MetaMask with **Monad Testnet** configured.

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd blitz-hack
```

2. Install dependencies:
```bash
yarn install
```

3. Configure environment variables:
Create a `.env` file in `packages/nextjs/` and `packages/hardhat/` with your:
- `NEXT_PUBLIC_ALCHEMY_API_KEY`
- `PRIVATE_KEY` (for deployment)
- `NEXT_PUBLIC_PINATA_API_KEY` & `NEXT_PUBLIC_PINATA_API_SECRET`

### Commands

- **Start Frontend:** `yarn start`
- **Compile Contracts:** `yarn compile`
- **Deploy Contracts:** `yarn deploy --network monadTestnet`
- **Lint Code:** `yarn lint`

## ⚖ License

This project is licensed under the MIT License.
