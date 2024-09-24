import { Level } from 'level'
import { decodeFunctionData } from 'viem'
import { concatBytes } from 'ethereum-cryptography/utils'
import { keccak256 } from 'ethereum-cryptography/keccak'

import { PORT } from './config'
import Contract from './contract'

// If I'm no the leader, sync the new blocks
// Else
// Bundled <= 5 txs withdrawn from the pool
// Apply to the tx-trie and state-trie
// Compute root = hash(prev | tx-trie-root | state-trie-root)
// Propose the block
// Sync

type Tx = {
  from: `0x${string}`
  to: `0x${string}`
  amount: bigint
  witness: `0x${string}`
}

const THRESHOLD = 60000
const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(() => resolve(), ms))

export const pool = new Level<Uint8Array, Uint8Array>(`data/${PORT}/pool`, {
  keyEncoding: 'buffer',
  valueEncoding: 'buffer',
})
export const metadata = new Level<string, Buffer>(`data/${PORT}/metadata`, {
  valueEncoding: 'buffer',
})

export default class Sequencer extends Contract {
  getMyLatestBlock = async () => {
    try {
      const buf = await metadata.get('latest-block')
      return BigInt(`0x${buf.toString('hex')}`)
    } catch (er: any) {
      if (er.code !== 'LEVEL_NOT_FOUND') throw er
      return BigInt(6744077)
    }
  }

  setMyLatestBlock = async (latest: bigint) => {
    return await metadata.put(
      'latest-block',
      Buffer.from(latest.toString(16), 'hex'),
    )
  }

  start = async (): Promise<void> => {
    await sleep(Math.ceil(Math.random() * THRESHOLD))
    const fromBlock = await this.getMyLatestBlock()
    const logs = await this.client.getContractEvents({
      abi: this.abi,
      eventName: 'Propose',
      fromBlock,
    })
    if (!logs.length) await this.propose() // Updated! Propose a new block
    else {
      const latest = await this.sync(logs) // Sync new blocks
      await this.setMyLatestBlock(latest)
    }
    this.start()
  }

  propose = async () => {
    const prev = (await this.contract.read.latest()) as string
    const txs: Tx[] = []
    let bundled = Uint8Array.from(Buffer.from(prev.substring(2), 'hex'))
    for await (const [key, value] of pool.iterator({ limit: 5 })) {
      await pool.del(key)
      txs.push({
        from: `0x${Buffer.from(value.subarray(0, 20)).toString('hex')}`,
        to: `0x${Buffer.from(value.subarray(20, 40)).toString('hex')}`,
        amount: BigInt(
          `0x${Buffer.from(value.subarray(40, 72)).toString('hex')}`,
        ),
        witness: `0x${Buffer.from(value.subarray(72, 104)).toString('hex')}`,
      })
      bundled = concatBytes(bundled, value)
    }
    const root = `0x${Buffer.from(keccak256(bundled)).toString('hex')}`
    const txId = await this.contract.write.propose([root, prev, txs])
    return console.info('⛏️ Proposed a new block:', txId)
  }

  sync = async <
    T extends { transactionHash: `0x${string}`; blockNumber: bigint },
  >(
    logs: T[],
  ): Promise<bigint> => {
    for (const log of logs) {
      const tx = await this.client.getTransaction({
        hash: log.transactionHash,
      })
      const { args } = decodeFunctionData({ abi: this.abi, data: tx.input })
      // Apply transactions
      console.log(args)
    }
    return logs[logs.length - 1].blockNumber + BigInt(1)
  }
}
