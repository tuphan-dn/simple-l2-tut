// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

struct Block {
  bytes32 prev;
  uint256 timestamp;
}

struct Tx {
  address from;
  address to;
  uint256 amount;
  bytes32 witness;
}

contract Rollup {
  bytes32 public latest = keccak256(bytes('rollup-genesis-block'));
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

  modifier referable(bytes32 root, bytes32 prev) {
    require(prev == latest, 'Invalid latest block.');
    _;
    latest = root;
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

  function propose(
    bytes32 root,
    bytes32 prev,
    Tx[] calldata txs
  ) public referable(root, prev) {
    chain[root] = Block({prev: prev, timestamp: block.timestamp});
    emit Propose(msg.sender, root, prev);
  }
}
