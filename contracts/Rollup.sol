// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import 'hardhat/console.sol';

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

struct Node {
  bool[] key;
  bytes value;
}

contract Rollup {
  bytes32 public latest =
    0xab2344d27f94c1e4753f34becf3bbe88aea4caf33c2380c85b4e4ef6f286e6d1;
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

  modifier merkle(
    Node calldata node,
    bytes[] calldata proof,
    bytes32 root
  ) {
    require(verify(node, proof, root), 'Invalid proof');
    _;
  }

  event Lock(address indexed account, uint256 amount);
  event Unlock(address indexed account, uint256 amount);
  event Propose(
    address indexed account,
    bytes32 indexed root,
    bytes32 indexed prev
  );

  function verify(
    Node memory node,
    bytes[] memory proof,
    bytes32 root
  ) private pure returns (bool) {
    bytes memory cache = node.value;
    for (uint i = 0; i < node.key.length; i++) {
      bool bit = node.key[i];
      bytes memory left = !bit ? cache : proof[i];
      bytes memory right = !bit ? proof[i] : cache;
      cache = hash(left, right);
    }
    return root == bytes32(cache);
  }

  function hash(
    bytes memory left,
    bytes memory right
  ) private pure returns (bytes memory) {
    bytes32 undefined = keccak256('');
    if (keccak256(left) != undefined || keccak256(right) != undefined) {
      return bytes.concat(keccak256(bytes.concat(left, right)));
    } else {
      return bytes('');
    }
  }

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

  function challenge(
    bytes32 root,
    Node calldata prevState,
    bytes[] calldata prevStateProof,
    Node calldata transaction,
    bytes[] calldata txProof,
    Node calldata nextState,
    bytes[] calldata nextStateProof
  )
    public
    view
    merkle(prevState, prevStateProof, chain[root].prev)
    merkle(transaction, txProof, root)
    merkle(nextState, nextStateProof, root)
    returns (bool)
  {
    uint256 prev = uint256(bytes32(prevState.value));
    Tx memory trans = Tx({
      from: address(bytes20(transaction.value[0:20])),
      to: address(bytes20(transaction.value[20:40])),
      amount: uint256(bytes32(transaction.value[40:72])),
      witness: bytes32(transaction.value[72:104])
    });
    uint256 next = uint256(bytes32(nextState.value));
    require(prev + trans.amount != next, 'The block is honest');
    // Rewarded here
    return true;
  }
}
