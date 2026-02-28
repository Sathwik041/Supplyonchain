import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";

/**
 * Deploys a contract named "SupplyChainEscrow" using the deployer account and
 * constructor arguments set to the deployer address
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deploySupplyChainEscrow: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  /*
    On localhost, the deployer account is the one that comes with Hardhat, which is already funded.

    When deploying to live networks (e.g. `yarn deploy --network monadTestnet`), the deployer account
    should have sufficient balance to pay for the gas fees for contract creation.

    You can generate a random account with `yarn generate` which will fill PRIVATE_KEY
    in .env and then you can send ETH to its address or use a faucet.
  */
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // 1. Deploy MachinePassport
  const machinePassportDeployment = await deploy("MachinePassport", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
    deterministicDeployment: false,
  });

  // 2. Deploy SupplyChainEscrow (Implementation for Clones)
  const supplyChainEscrowImplementation = await deploy("SupplyChainEscrow", {
    from: deployer,
    args: [], // Zero-arg constructor
    log: true,
    autoMine: true,
  });

  // 3. Deploy EscrowFactory with MachinePassport address and SupplyChainEscrow implementation
  const escrowFactoryDeployment = await deploy("EscrowFactory", {
    from: deployer,
    args: [machinePassportDeployment.address, supplyChainEscrowImplementation.address],
    log: true,
    autoMine: true,
  });

  // 4. Transfer ownership of MachinePassport to EscrowFactory
  const machinePassport = await hre.ethers.getContractAt("MachinePassport", machinePassportDeployment.address);
  const currentOwner = await machinePassport.owner();

  if (currentOwner.toLowerCase() !== escrowFactoryDeployment.address.toLowerCase()) {
    console.log("Transfereing ownership of MachinePassport to EscrowFactory...");
    const transferTx = await machinePassport.transferOwnership(escrowFactoryDeployment.address, {
      gasLimit: 1000000,
    });
    await transferTx.wait();
    console.log("Ownership transferred.");
  }

  const escrowFactory = await hre.ethers.getContract<Contract>("EscrowFactory", deployer);
  console.log("🏢 EscrowFactory deployed at:", await escrowFactory.getAddress());
  console.log("📜 MachinePassport owned by Factory at:", await machinePassport.getAddress());
  console.log("📦 SupplyChainEscrow implementation at:", supplyChainEscrowImplementation.address);
};

export default deploySupplyChainEscrow;

deploySupplyChainEscrow.tags = ["SupplyChainEscrow", "EscrowFactory", "MachinePassport"];
