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

  modifier unlocked(bytes32 header) {
    require(!unlocks[msg.sender][header], 'Already unlocked.');
    require(
      chain[header].timestamp + 60 < block.timestamp,
      'Still in the challenge window.'
    );
    _;
  }

  event Lock(address indexed account, uint256 amount);
  event Unlock(address indexed account, uint256 amount);

  function lock() public payable {
    emit Lock(msg.sender, msg.value);
  }

  function unlock(
    uint256 amount,
    bytes32[] calldata proof
  ) public unlocked(proof[proof.length - 1]) {
    unlocks[msg.sender][proof[proof.length - 1]] = true;
    // Merkle proof here
    payable(msg.sender).transfer(amount);
    emit Unlock(msg.sender, amount);
  }

  function submit(bytes32 root, bytes32 prev) public {
    chain[root] = Block({prev: prev, timestamp: block.timestamp});
  }
}
