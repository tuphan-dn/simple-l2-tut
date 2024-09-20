// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

struct Block {
  bytes32 prev;
  uint256 timestamp;
}

contract Rollup {
  bytes32 public genesis = keccak256(bytes('rollup-genesis-block'));
  mapping(bytes32 root => Block block) chain;
  mapping(address account => mapping(bytes32 root => bool unlocked)) unlocks;

  modifier unlockable(bytes32 header) {
    require(!unlocks[msg.sender][header], 'Already unlocked.');
    require(
      chain[header].timestamp + 60 < block.timestamp,
      'Still in the challenge window.'
    );
    _;
    unlocks[msg.sender][header] = true;
  }

  event Lock(address indexed account, uint256 amount);
  event Unlock(address indexed account, uint256 amount);
  event Propose(
    address indexed account,
    bytes32 indexed root,
    bytes32 indexed prev
  );

  function lock() public payable {
    emit Lock(msg.sender, msg.value);
  }

  function unlock(
    uint256 amount,
    bytes32[] calldata proof
  ) public unlockable(proof[proof.length - 1]) {
    // Merkle proof here
    payable(msg.sender).transfer(amount);
    emit Unlock(msg.sender, amount);
  }

  function propose(bytes32 root, bytes32 prev, bytes32[] calldata txs) public {
    chain[root] = Block({prev: prev, timestamp: block.timestamp});
    emit Propose(msg.sender, root, prev);
  }
}
