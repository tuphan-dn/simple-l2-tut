import { Level } from 'level'
import { zeroAddress } from 'viem'

import { PORT } from './config'
import Trie, { bigintToBytes, bytesToBinary } from './trie'
import { hexToBytes } from 'ethereum-cryptography/utils'

export const stateTrie = new Trie(
  new Level<boolean[], Uint8Array>(`data/${PORT}/state-trie`, {
    keyEncoding: 'buffer',
    valueEncoding: 'buffer',
  }),
  [
    {
      key: bytesToBinary(hexToBytes(zeroAddress.substring(2))),
      value: bigintToBytes(BigInt('1000000000000000000000000000')),
    },
  ],
)
