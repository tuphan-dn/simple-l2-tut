import { Level } from 'level'
import { keccak256 } from 'ethereum-cryptography/keccak'
import { type Hex } from 'viem'

import { PORT } from './config'

export const metadata = new Level<string, Buffer>(`data/${PORT}/metadata`, {
  valueEncoding: 'buffer',
})

export class MyLatestBlock {
  static get = async (): Promise<bigint> => {
    try {
      const buf = await metadata.get('latest-block')
      return BigInt(`0x${buf.toString('hex')}`)
    } catch (er: any) {
      if (er.code !== 'LEVEL_NOT_FOUND') throw er
      return BigInt(2397766)
    }
  }

  static set = async (latest: bigint) => {
    return await metadata.put(
      'latest-block',
      Buffer.from(latest.toString(16), 'hex'),
    )
  }
}

export class MyLatestRoot {
  static get = async (): Promise<Hex> => {
    try {
      const buf = await metadata.get('latest-root')
      return `0x${buf.toString('hex')}`
    } catch (er: any) {
      if (er.code !== 'LEVEL_NOT_FOUND') throw er
      return `0x${Buffer.from(
        keccak256(Buffer.from('rollup-genesis-block', 'utf8')),
      ).toString('hex')}`
    }
  }

  static set = async (root: Hex) => {
    return await metadata.put(
      'latest-root',
      Buffer.from(root.substring(2), 'hex'),
    )
  }
}
