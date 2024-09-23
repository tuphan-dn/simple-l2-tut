import { Level } from 'level'
import { keccak256 } from 'ethereum-cryptography/keccak'

import { PORT } from './config'
import { metadata } from './evm'

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(() => resolve(), ms))

export const pool = new Level<Uint8Array, Uint8Array>(`data/${PORT}/pool`, {
  keyEncoding: 'buffer',
  valueEncoding: 'buffer',
})

export default class Sequencer {
  constructor(public readonly THRESHOLD = 60000) {}

  getMyLatestBlock = async () => {
    try {
      return await metadata.get('latest-block')
    } catch (er: any) {
      if (er.code !== 'LEVEL_NOT_FOUND') throw er
      return keccak256(Buffer.from('rollup-genesis-block', 'utf8'))
    }
  }

  setMyLatestBlock = async (latest: Uint8Array) => {
    return await metadata.put('latest-block', latest)
  }

  start = async (): Promise<void> => {
    await sleep(Math.ceil(Math.random() * this.THRESHOLD))
    console.log(await this.getMyLatestBlock())
    // Validate the latest block, skip if I'm late
    // Else propose a new block
    this.start()
  }
}
