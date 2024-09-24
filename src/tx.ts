import { randomBytes } from '@libp2p/crypto'
import { keccak256 } from 'ethereum-cryptography/keccak'
import { concatBytes, hexToBytes } from 'ethereum-cryptography/utils'
import { type Hex } from 'viem'
import { Level } from 'level'

import { PORT } from './config'
import Trie from './trie'

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
    const hex = this.amount.toString(16)
    const paddedHex = hex.padStart(64, '0')
    return hexToBytes(paddedHex)
  }

  get txId() {
    return keccak256(this.data)
  }

  get data() {
    return concatBytes(this.from, this.to, this.value, this.witness)
  }

  static encode(tx: TxLog) {
    return new Tx(
      Buffer.from(tx.from.substring(2), 'hex'),
      Buffer.from(tx.to.substring(2), 'hex'),
      tx.amount,
      Buffer.from(tx.witness.substring(2), 'hex'),
    )
  }

  decode(): TxLog {
    return {
      from: `0x${Buffer.from(this.from).toString('hex')}`,
      to: `0x${Buffer.from(this.to).toString('hex')}`,
      amount: this.amount,
      witness: `0x${Buffer.from(this.witness).toString('hex')}`,
    }
  }
}

export const txTrie = new Trie(
  new Level<boolean[], Uint8Array>(`data/${PORT}/txs-trie`, {
    keyEncoding: 'buffer',
    valueEncoding: 'buffer',
  }),
)
