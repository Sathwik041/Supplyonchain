// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./SupplyChainEscrow.sol";
import "./MachinePassport.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";

contract EscrowFactory {
    address[] public allEscrows;
    mapping(address => address[]) public buyerToEscrows;
    mapping(address => address[]) public sellerToEscrows;
    mapping(address => bool) public isEscrow;

    MachinePassport public passportContract;
    address public implementation;

    event EscrowCreated(
        address indexed escrowAddress,
        address indexed buyer,
        address indexed seller,
        string itemName,
        uint256 totalAmount
    );

    constructor(address _passportAddress, address _implementation) {
        passportContract = MachinePassport(_passportAddress);
        implementation = _implementation;
    }

    /**
     * @dev Deploys a new SupplyChainEscrow contract and tracks it.
     */
    function createEscrow(
        address _seller,
        address _arbitrator,
        uint256 _totalAmount,
        string memory _itemName,
        uint256 _quantity,
        uint256 _deliveryDurationSeconds,
        string memory _poCid
    ) external returns (address) {
        address escrowAddress = Clones.clone(implementation);
        SupplyChainEscrow(payable(escrowAddress)).initialize(
            msg.sender, // The caller is the buyer
            _seller,
            _arbitrator,
            _totalAmount,
            _itemName,
            _quantity,
            _deliveryDurationSeconds,
            _poCid
        );
        
        allEscrows.push(escrowAddress);
        buyerToEscrows[msg.sender].push(escrowAddress);
        sellerToEscrows[_seller].push(escrowAddress);
        isEscrow[escrowAddress] = true;

        emit EscrowCreated(
            escrowAddress,
            msg.sender,
            _seller,
            _itemName,
            _totalAmount
        );

        return escrowAddress;
    }

    /**
     * @dev Called by an Escrow contract when it is completed to mint the NFT.
     */
    function mintPassport(address to, string memory uri) external {
        require(isEscrow[msg.sender], "Only authorized escrows can mint");
        passportContract.mintPassport(to, uri);
    }

    function getBuyerEscrows(address _buyer) external view returns (address[] memory) {
        return buyerToEscrows[_buyer];
    }

    function getSellerEscrows(address _seller) external view returns (address[] memory) {
        return sellerToEscrows[_seller];
    }

    function getEscrowCount() external view returns (uint256) {
        return allEscrows.length;
    }

    function getAllEscrows() external view returns (address[] memory) {
        return allEscrows;
    }
}
