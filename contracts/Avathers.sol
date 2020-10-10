// SPDX-License-Identifier: MIT
pragma solidity 0.6.2;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/introspection/ERC165.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract Avathers is IERC721, ERC165 {
  using SafeMath for uint256;
  using Address for address;

  uint256 constant dnaDigits = 26;
  uint256 constant dnaModulus = 10**dnaDigits;

  // bytes4(keccak256("onERC721Received(address, adress, uint256, bytes)"))
  bytes4 private constant _ERC721_RECEIVED = 0x150b7a02;

  struct Avather {
    string name;
    uint256 dna;
  }

  Avather[] public avather;

  // 0x00000023424 - 3 
  mapping(address => uint256) public ownerAvatherCount;

  // Id => Address
  mapping(uint256 => address) public avatherToOwner;

  mapping(uint256 => bool) public dnaAvatherExists;

  mapping(uint256 => address) public avatherApprovals; 

  mapping(address => mapping(address => bool)) public operatorApprovals;

  constructor() public {}

  // Modifier
  modifier isUnique(uint256 _dna){
    require(!dnaAvatherExists[_dna], "Avather already exists");
    _;
  }

  // Metodos
  function createRandomAvather(string memory _name) public {
    uint256 randDna = generateRandomDna(_name, msg.sender);
    _createAvather(_name, randDna);
  }

  function generateRandomDna(
    string memory _str, 
    address _owner
  ) public pure returns(uint256) {
    uint256 rand = uint256(keccak256(abi.encodePacked(_str))) + uint256(_owner);

    rand = rand.mod(dnaModulus);

    return rand;
  }

  function _createAvather(string memory _name, uint256 _dna) internal isUnique(_dna) {
    avather.push(Avather(_name, _dna));

    uint256 id = avather.length.sub(1);

    avatherToOwner[id] = msg.sender;
    ownerAvatherCount[msg.sender] = ownerAvatherCount[msg.sender].add(1);
  } 

  function approve(address _to, uint256 _avatherId) public override {
    require(msg.sender == avatherToOwner[_avatherId], "You are not the owner");
    avatherApprovals[_avatherId] = _to;
    emit Approval(msg.sender, _to, _avatherId);
  }

  function getApproved(uint _avatherId) public override view returns(address) {
    require(_exists(_avatherId), "Avather does not exists");
    return avatherApprovals[_avatherId];
  }

  function _exists(uint256 _avatherId) internal view returns(bool){
    address owner = avatherToOwner[_avatherId];

    return owner != address(0);
  }

  function setApprovalForAll(address _to, bool approved) public override {
    require(_to != msg.sender, "Cannot approve yourself");
    operatorApprovals[msg.sender][_to] = approved;
    emit ApprovalForAll(msg.sender, _to, approved);
  }

  function isApprovedForAll(
    address _owner,
    address _operator
  ) public override view returns(bool){
    return operatorApprovals[_owner][_operator];
  }

  function transferFrom(
    address _from, 
    address _to, 
    uint256 _avatherId
  ) public override {
    require(_exists(_avatherId), "Avather does not exists");
    require(_from != address(0) && _to != address(0), "Invalid address");
    require(_from != _to, "Cannot transfer to yourself");
    require(_isApprovedOrOwner(msg.sender, _avatherId), "Not approved");

    ownerAvatherCount[_from] = ownerAvatherCount[_from].sub(1);
    ownerAvatherCount[_to] = ownerAvatherCount[_to].add(1);
    avatherToOwner[_avatherId] = _to;

    emit Transfer(_from, _to, _avatherId);
    if(avatherApprovals[_avatherId] != address(0)){
      avatherApprovals[_avatherId] = address(0);
    }
  }

  function safeTransferFrom(
    address _from,
    address _to,
    uint256 avatherId,
    bytes memory _data
  ) public override {
    transferFrom(_from, _to, avatherId);
    require(
      _checkOnERC721Received(_from, _to, avatherId, _data), 
      "Must implement onERC721Received"
    );
  }

  function safeTransferFrom(
    address _from,
    address _to,
    uint256 avatherId
  ) public override {
    safeTransferFrom(_from, _to, avatherId, "");
  }

  function _checkOnERC721Received(
    address _from,
    address _to,
    uint256 avatherId,
    bytes memory _data
  ) internal returns(bool){
    if(!_to.isContract()){
      return true;
    }

    bytes4 methodId = IERC721Receiver(_to).onERC721Received(
      msg.sender,
      _from,
      avatherId,
      _data
    );

    return (methodId == _ERC721_RECEIVED);
  }

  function _isApprovedOrOwner(
    address _spender, 
    uint256 _avatherId
  ) internal view returns(bool){
    address owner = avatherToOwner[_avatherId];
    return (_spender == owner || 
      getApproved(_avatherId) == _spender || 
      isApprovedForAll(owner, _spender));
  }

  function balanceOf(address _owner) public override view returns (uint256){
    return ownerAvatherCount[_owner];
  }

  function ownerOf(uint _avatherId) public override view returns (address){
    address owner = avatherToOwner[_avatherId];
    require(owner != address(0), "Invalid avatherId");
    return owner;
  }

  function burn(uint256 _avatheeerId) external {
        require(msg.sender != address(0), "Invalid address.");
        require(_exists(_avatheeerId), "Avatheeer does not exist.");
        require(
            _isApprovedOrOwner(msg.sender, _avatheeerId),
            "Address is not approved."
        );

        ownerAvatherCount[msg.sender] = ownerAvatherCount[msg.sender].sub(
            1
        );
        avatherToOwner[_avatheeerId] = address(0);
    }

    // Returns array of Avatheeers found by owner
    function getAvathersByOwner(address _owner)
        public
        view
        returns (
            // Functions marked as `view` promise not to modify state
            // Learn more: https://solidity.readthedocs.io/en/v0.6.2/contracts.html#view-functions
            uint256[] memory
        )
    {
        // Uses the `memory` storage location to store values only for the
        // lifecycle of this function call.
        // Learn more: https://solidity.readthedocs.io/en/v0.6.2/introduction-to-smart-contracts.html#storage-memory-and-the-stack
        uint256[] memory result = new uint256[](ownerAvatherCount[_owner]);
        uint256 counter = 0;
        for (uint256 i = 0; i < avather.length; i++) {
            if (avatherToOwner[i] == _owner) {
                result[counter] = i;
                counter++;
            }
        }
        return result;
    }
}