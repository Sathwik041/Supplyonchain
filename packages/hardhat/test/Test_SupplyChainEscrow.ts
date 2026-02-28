import { expect } from "chai";
import { ethers } from "hardhat";
import { SupplyChainEscrow, EscrowFactory } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("SupplyChainEscrow via Factory", function () {
  let escrowFactory: EscrowFactory;
  let supplyChainEscrow: SupplyChainEscrow;
  let buyer: SignerWithAddress;
  let seller: SignerWithAddress;
  let arbitrator: SignerWithAddress;

  const totalAmount = ethers.parseEther("1.0");
  const itemName = "Mechanical Industrial Machine";
  const quantity = 1n;
  const deliveryDuration = 86400; // 1 day
  const poCid = "QmTest123";

  beforeEach(async () => {
    [buyer, seller, arbitrator] = await ethers.getSigners();

    const MachinePassportFactory = await ethers.getContractFactory("MachinePassport");
    const machinePassport = await MachinePassportFactory.deploy();
    await machinePassport.waitForDeployment();

    const SupplyChainEscrowFactory = await ethers.getContractFactory("SupplyChainEscrow");
    const supplyChainEscrowImplementation = await SupplyChainEscrowFactory.deploy();
    await supplyChainEscrowImplementation.waitForDeployment();

    const EscrowFactoryFactory = await ethers.getContractFactory("EscrowFactory");
    escrowFactory = await EscrowFactoryFactory.deploy(
      await machinePassport.getAddress(),
      await supplyChainEscrowImplementation.getAddress(),
    );
    await escrowFactory.waitForDeployment();

    // Transfer ownership to factory
    await machinePassport.transferOwnership(await escrowFactory.getAddress());

    const tx = await escrowFactory
      .connect(buyer)
      .createEscrow(
        buyer.address,
        seller.address,
        arbitrator.address,
        totalAmount,
        itemName,
        quantity,
        deliveryDuration,
        poCid,
      );
    const receipt = await tx.wait();

    const event = receipt?.logs.find(log => (log as any).fragment?.name === "EscrowCreated") as any;
    const escrowAddress = event.args.escrowAddress;

    supplyChainEscrow = (await ethers.getContractAt(
      "SupplyChainEscrow",
      escrowAddress,
    )) as unknown as SupplyChainEscrow;
  });

  describe("Full Lifecycle", function () {
    it("Should go through the full lifecycle successfully", async function () {
      // 1. Accept
      await supplyChainEscrow.connect(seller).acceptContract();

      // 2. Deposit
      const productionAmount = (totalAmount * 30n) / 100n;
      await expect(
        supplyChainEscrow.connect(buyer).depositAndStartProduction({ value: totalAmount }),
      ).to.changeEtherBalances(
        [buyer, seller, supplyChainEscrow],
        [-totalAmount, productionAmount, totalAmount - productionAmount],
      );

      // 3. Finish Production
      await supplyChainEscrow.connect(seller).finishProduction();

      // 4. Ship
      await supplyChainEscrow.connect(seller).markShipped("FedEx", "TRK123", "QmShipping123", ["QmLog1", "QmLog2"]);

      // 5. Deliver
      const afterDeliverAmount = (totalAmount * 50n) / 100n;
      await expect(supplyChainEscrow.connect(buyer).confirmDelivery()).to.changeEtherBalances(
        [seller, supplyChainEscrow],
        [afterDeliverAmount, -afterDeliverAmount],
      );

      // 6. Complete
      const remainingAmount = await supplyChainEscrow.remainingAmount();
      await expect(supplyChainEscrow.connect(buyer).buyerCompletecontract()).to.changeEtherBalances(
        [seller, supplyChainEscrow],
        [remainingAmount, -remainingAmount],
      );

      // Verify NFT Minting
      const passportAddress = await escrowFactory.passport();
      const passportContract = await ethers.getContractAt("MachinePassport", passportAddress);
      expect(await passportContract.balanceOf(buyer.address)).to.equal(1n);
    });
  });

  describe("Disputes", function () {
    beforeEach(async () => {
      await supplyChainEscrow.connect(seller).acceptContract();
      await supplyChainEscrow.connect(buyer).depositAndStartProduction({ value: totalAmount });
    });

    it("Arbitrator can resolve dispute and refund buyer", async function () {
      await supplyChainEscrow.connect(buyer).raiseDispute("QmDisputeReason");
      const amount = await supplyChainEscrow.remainingAmount();

      await expect(supplyChainEscrow.connect(arbitrator).resolveDispute(false)).to.changeEtherBalances(
        [buyer, supplyChainEscrow],
        [amount, -amount],
      );

      expect(await supplyChainEscrow.status()).to.equal(8); // Status.REFUNDED
    });
  });
});
