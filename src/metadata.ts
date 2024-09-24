import { Level } from 'level'
import { bytesToBigInt, type Hex } from 'viem'
import { bytesToHex, hexToBytes } from 'ethereum-cryptography/utils'

import { PORT } from './config'
import { bigintToBytes } from './trie'

export const metadata = new Level<string, Uint8Array>(`data/${PORT}/metadata`, {
  valueEncoding: 'buffer',
})

export class MyLatestBlock {
  static get = async (): Promise<bigint> => {
    try {
      const buf = await metadata.get('latest-block')
      return bytesToBigInt(buf)
    } catch (er: any) {
      if (er.code !== 'LEVEL_NOT_FOUND') throw er
      return BigInt(2398479)
    }
  }

  static set = async (latest: bigint) => {
    return await metadata.put('latest-block', bigintToBytes(latest))
  }
}

export class MyLatestRoot {
  static get = async (): Promise<Hex> => {
    try {
      const buf = await metadata.get('latest-root')
      return `0x${bytesToHex(buf)}`
    } catch (er: any) {
      if (er.code !== 'LEVEL_NOT_FOUND') throw er
      return '0xab2344d27f94c1e4753f34becf3bbe88aea4caf33c2380c85b4e4ef6f286e6d1'
    }
  }

  static set = async (root: Hex) => {
    return await metadata.put('latest-root', hexToBytes(root.substring(2)))
  }
}
