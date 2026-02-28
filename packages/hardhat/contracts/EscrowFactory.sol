// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./SupplyChainEscrow.sol";
import "./MachinePassport.sol";

contract EscrowFactory is Ownable {
    address public passport;
    address public implementation;

    mapping(address => bool) public isEscrow;
    address[] public allEscrows;

    event EscrowCreated(address indexed escrowAddress, address indexed buyer, address indexed seller, uint256 totalAmount);

    constructor(address _passport, address _implementation) Ownable(msg.sender) {
        require(_passport != address(0), "Invalid passport address");
        require(_implementation != address(0), "Invalid implementation address");
        passport = _passport;
        implementation = _implementation;
    }

    function updateImplementation(address _implementation) external onlyOwner {
        implementation = _implementation;
    }

    function createEscrow(
        address _buyer,
        address _seller,
        address _arbitrator,
        uint256 _totalAmount,
        string memory _itemName,
        uint256 _quantity,
        uint256 _deliveryDurationSeconds,
        string memory _poCid
    ) external returns (address) {
        address clone = Clones.clone(implementation);
        SupplyChainEscrow(payable(clone)).initialize(
            _buyer,
            _seller,
            _arbitrator,
            _totalAmount,
            _itemName,
            _quantity,
            _deliveryDurationSeconds,
            _poCid
        );
        isEscrow[clone] = true;
        allEscrows.push(clone);
        emit EscrowCreated(clone, _buyer, _seller, _totalAmount);
        return clone;
    }

    function mintPassport(address to, string calldata uri) external {
        require(isEscrow[msg.sender], "Only escrows can mint");
        MachinePassport(passport).mintPassport(to, uri);
    }

    function getAllEscrows() external view returns (address[] memory) {
        return allEscrows;
    }
}
