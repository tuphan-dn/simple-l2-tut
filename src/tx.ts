import { randomBytes } from '@libp2p/crypto'
import { keccak256 } from 'ethereum-cryptography/keccak'
import { concatBytes, hexToBytes } from 'ethereum-cryptography/utils'
import { Level } from 'level'

import { PORT } from './config'
import Trie from './trie'

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
}

export const txTrie = new Trie(
  new Level<boolean[], Uint8Array>(`data/${PORT}/txs-trie`, {
    keyEncoding: 'buffer',
    valueEncoding: 'buffer',
  }),
)
