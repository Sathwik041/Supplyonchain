// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

interface IEscrowFactory {
    function mintPassport(address to, string calldata uri) external;
}

contract SupplyChainEscrow is ReentrancyGuard, Initializable {

    address public buyer;
    address public seller;
    address public arbitrator;
    address public factory;

    uint256 public totalAmount;      // in wei
    uint256 public productionAmount; // 30% of totalAmount
    uint256 public AfterDeliverAmount; //50% of totalAmount
    uint256 public remainingAmount;  // 20% of totalAmount

    string public itemName;
    uint256 public quantity;
    uint256 public deliveryDeadline; // timestamp

    string public shippingProvider;
    string public trackingNumber;
    string public poCid;
    string public shippingCid;
    string[] public productionLogs;
    string public disputeReason;
    uint256 public deliveredAt;
    uint256 public createdAt;

    bool public deposited;
    bool public shipped;
    bool public delivered;
    bool public completed;
    bool public disputed;
    bool public sellerAccepted;

    enum Status {
        CREATED,
        ACCEPTED,
        IN_PRODUCTION,
        PRODUCTION_COMPLETED,
        SHIPPED,
        DELIVERED,
        COMPLETED,
        DISPUTED,
        REFUNDED
    }

    Status public status;

    // EVENTS 

    event EscrowCreated(
        address indexed buyer,
        address indexed seller,
        address escrowAddress,
        uint256 totalAmount,
        string poCid
    );

    event SellerAccepted();
    event ProductionPaymentReleased(uint256 amount);
    event ProductionUpdate(string cid);
    event ProductionFinished();
    event MarkedShipped(string provider, string trackingNumber);
    event AfterDeliverPaymentReleased(uint256 amount);
    event FinalPaymentReleased(uint256 amount);
    event DisputeRaised(address indexed raisedBy);
    event DisputeResolved(bool releasedToSeller);
    event ContractCancelled(address indexed buyer);

    //  MODIFIERS 

    modifier onlyBuyer() {
        require(msg.sender == buyer, "Not buyer");
        _;
    }

    modifier onlySeller() {
        require(msg.sender == seller, "Not seller");
        _;
    }

    modifier onlyArbitrator() {
        require(msg.sender == arbitrator, "Not arbitrator");
        _;
    }

    modifier notDisputed() {
        require(!disputed, "Dispute active");
        _;
    }

    //  CONSTRUCTOR & INITIALIZER

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @param _deliveryDurationSeconds Delivery duration in seconds from now
    function initialize(
        address _buyer,
        address _seller,
        address _arbitrator,
        uint256 _totalAmount,              // in wei (e.g., 0.1 MON = 100000000000000000)
        string memory _itemName,
        uint256 _quantity,
        uint256 _deliveryDurationSeconds,
        string memory _poCid
    ) external initializer {
        require(_buyer != address(0), "Invalid buyer");
        require(_seller != address(0), "Invalid seller");
        require(_totalAmount > 0, "Amount must be > 0");
        require(_quantity > 0, "Quantity must be > 0");
        require(_deliveryDurationSeconds > 0, "Invalid duration");

        buyer = _buyer;
        seller = _seller;
        arbitrator = _arbitrator;
        factory = msg.sender; // The Factory deploys this

        totalAmount = _totalAmount;
        productionAmount = 0;
        remainingAmount = _totalAmount;

        itemName = _itemName;
        quantity = _quantity;
        deliveryDeadline = block.timestamp + _deliveryDurationSeconds;
        createdAt = block.timestamp;
        poCid = _poCid;

        status = Status.CREATED;

        emit EscrowCreated(_buyer, _seller, address(this), _totalAmount, _poCid);
    }

    //  CORE FLOW 

    /// Seller accepts the terms and PO
    function acceptContract() external onlySeller {
        require(status == Status.CREATED, "Already accepted or in progress");
        require(block.timestamp <= createdAt + 24 hours, "Offer expired");
        sellerAccepted = true;
        status = Status.ACCEPTED;
        emit SellerAccepted();
    }

    /// Buyer deposits MON and starts production
    function depositAndStartProduction() 
        external 
        payable 
        onlyBuyer 
        nonReentrant 
    {
        require(sellerAccepted, "Seller must accept first");
        require(!deposited, "Already deposited");
        require(msg.value == totalAmount, "Send exact totalAmount");
        require(status == Status.ACCEPTED, "Must be accepted by seller first");
        require(block.timestamp <= createdAt + 24 hours, "Offer expired");

        uint256 amount = (totalAmount * 30) / 100;
        productionAmount = amount;
        remainingAmount = totalAmount - amount;
        deposited = true;
        status = Status.IN_PRODUCTION;
        
        // Release 30% to seller immediately
        (bool sent, ) = seller.call{value: amount}("");
        require(sent, "Failed to send production payment");

        emit ProductionPaymentReleased(amount);
    }

    function getProductionLogs() external view returns (string[] memory) {
        return productionLogs;
    }

    /// Seller marks production as finished
    function finishProduction() external onlySeller notDisputed {
        require(status == Status.IN_PRODUCTION, "Production not started or already finished");
        status = Status.PRODUCTION_COMPLETED;
        emit ProductionFinished();
    }

    //Claim after Deadline if seller doesnt deliver after deadline
    function BuyerclaimAfterDeadline() external onlyBuyer notDisputed nonReentrant {
        require(block.timestamp > deliveryDeadline, "Deadline not passed");
        require(!shipped, "Already shipped");
        require(deposited, "Not funded");
        uint256 amount= remainingAmount;
        remainingAmount = 0;
        status = Status.REFUNDED;
        
        (bool sent, ) = buyer.call{value: amount}("");
        require(sent, "Transfer failed");

    }

    //Seller claim if buyer didnot respond after shipping
        function sellerClaimAfterDeadline()
        external
        onlySeller notDisputed nonReentrant 
    {
        require(shipped, "Not shipped");
        require(!completed, "Already completed");
        require(!disputed, "Under dispute");
        require(block.timestamp > deliveryDeadline, "Deadline not passed");

        uint256 amount = remainingAmount;
        remainingAmount = 0;
        completed = true;
        status = Status.COMPLETED;

        (bool sent, ) = seller.call{value: amount}("");
        require(sent, "Transfer failed");
    }


    //Cancel contract before Deposit or Acceptance
    function cancelContract() external {
        require(msg.sender == buyer || msg.sender == seller, "Not authorized");
        require(!deposited, "Already funded");
        require(status == Status.CREATED, "Cannot cancel once accepted or in progress");

        status = Status.REFUNDED;

        emit ContractCancelled(msg.sender);
    }


    /// Seller marks the item as shipped
    function markShipped(
        string memory _shippingProvider,
        string memory _trackingNumber,
        string memory _shippingCid,
        string[] memory _productionLogs
    ) 
        external 
        onlySeller 
        notDisputed 
    {
        require(status == Status.PRODUCTION_COMPLETED, "Production must be finished first");
        require(!shipped, "Already shipped");
        require(bytes(_trackingNumber).length > 0, "Tracking required");

        shippingProvider = _shippingProvider;
        trackingNumber = _trackingNumber;
        shippingCid = _shippingCid;

        // Batch commit the production logs at the moment of shipping
        for (uint i = 0; i < _productionLogs.length; i++) {
            productionLogs.push(_productionLogs[i]);
            emit ProductionUpdate(_productionLogs[i]);
        }

        shipped = true;
        status = Status.SHIPPED;

        emit MarkedShipped(_shippingProvider, _trackingNumber);
    }

    /// Buyer confirms delivery and releases 50% of remaining
    function confirmDelivery() 
        external 
        onlyBuyer 
        nonReentrant 
        notDisputed 
    {
        require(shipped, "Not shipped");
        require(!delivered, "Already Delivered");

         uint256 amount = (totalAmount * 50) / 100;
        AfterDeliverAmount = amount;
        remainingAmount = remainingAmount - amount ;
        delivered = true;
        deliveredAt = block.timestamp;
        status = Status.DELIVERED;
        

        (bool sent, ) = seller.call{value: amount}("");
        require(sent, "Failed to send after deliver payment");

         emit AfterDeliverPaymentReleased(amount);

    }

    ///Buyer Completes contract after checking the machine/item are working 
    function buyerCompletecontract (string memory _metadataCid) external onlyBuyer nonReentrant {

        require(delivered, "Item not yet delivered");
        require(!completed, "Contract already completed");

        uint256 amount = remainingAmount;
        remainingAmount = 0;
        completed = true;
        status = Status.COMPLETED;

                (bool sent, ) = seller.call{value: amount}("");
                require(sent, "Failed to send final payment");
        
                // Mint Digital Passport NFT to buyer with full metadata
                IEscrowFactory(factory).mintPassport(buyer, _metadataCid);
        
                emit FinalPaymentReleased(amount);
            }
        


    /// Seller claims remaining funds if buyer doesn't complete or dispute within 14 days of delivery
    function sellerClaimFinalPayment(string memory _metadataCid) external onlySeller notDisputed nonReentrant {
        require(delivered, "Not delivered");
        require(!completed, "Already completed");
        require(block.timestamp > deliveredAt + 14 days, "Inspection period active");

        uint256 amount = remainingAmount;
        remainingAmount = 0;
        completed = true;
        status = Status.COMPLETED;

        (bool sent, ) = seller.call{value: amount}("");
        require(sent, "Transfer failed");

        // Mint Digital Passport NFT to buyer with full metadata
        IEscrowFactory(factory).mintPassport(buyer, _metadataCid);

        emit FinalPaymentReleased(amount);
    }

    //  DISPUTE 

    function raiseDispute(string memory _reasonCid) external {
        require(
            msg.sender == buyer || msg.sender == seller,
            "Not authorized"
        );
        require(!completed, "Already completed");

        disputed = true;
        disputeReason = _reasonCid;
        status = Status.DISPUTED;

        emit DisputeRaised(msg.sender);
    }

    function resolveDispute(bool releaseToSeller)
        external
        onlyArbitrator
        nonReentrant
    {
        require(disputed, "No dispute");
        uint256 amount = remainingAmount;
        require(amount > 0, "No funds to release");
   
        
        remainingAmount = 0;
        disputed = false;

        if (releaseToSeller) {
            completed = true;
            status = Status.COMPLETED;
            (bool sent, ) = seller.call{value: amount}("");
            require(sent, "Failed to send to seller");
        } else {
            status = Status.REFUNDED;
            (bool sent, ) = buyer.call{value: amount}("");
            require(sent, "Failed to refund buyer");
        }


        emit DisputeResolved(releaseToSeller);
    }

    //  FALLBACK 
    receive() external payable {} // Allow contract to receive MON directly
}
