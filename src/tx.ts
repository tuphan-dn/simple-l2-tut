import { randomBytes } from '@libp2p/crypto'
import { keccak256 } from 'ethereum-cryptography/keccak'
import {
  bytesToHex,
  concatBytes,
  hexToBytes,
} from 'ethereum-cryptography/utils'
import { type Hex } from 'viem'
import { Level } from 'level'

import { PORT } from './config'
import Trie, { bigintToBytes } from './trie'

export type TxLog = {
  from: Hex
  to: Hex
  amount: bigint
  witness: Hex
}

export default class Tx {
  constructor(
    public readonly from: Uint8Array,
    public readonly to: Uint8Array,
    public readonly amount: bigint,
    public readonly witness: Uint8Array = randomBytes(32),
  ) {}

  get value() {
    return bigintToBytes(this.amount)
  }

  get txId() {
    return keccak256(this.data)
  }

  get data() {
    return concatBytes(this.from, this.to, this.value, this.witness)
  }

  static encode(tx: TxLog) {
    return new Tx(
      hexToBytes(tx.from.substring(2)),
      hexToBytes(tx.to.substring(2)),
      tx.amount,
      hexToBytes(tx.witness.substring(2)),
    )
  }

  decode(): TxLog {
    return {
      from: `0x${bytesToHex(this.from)}`,
      to: `0x${bytesToHex(this.to)}`,
      amount: this.amount,
      witness: `0x${bytesToHex(this.witness)}`,
    }
  }
}

export const txTrie = new Trie(
  new Level<boolean[], Uint8Array>(`data/${PORT}/txs-trie`, {
    keyEncoding: 'buffer',
    valueEncoding: 'buffer',
  }),
)
