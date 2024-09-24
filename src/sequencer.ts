import { Level } from 'level'
import { decodeFunctionData } from 'viem'
import { concatBytes } from 'ethereum-cryptography/utils'
import { keccak256 } from 'ethereum-cryptography/keccak'

import { PORT } from './config'
import Contract from './contract'
import { stateTrie } from './state'
import { txTrie } from './tx'
import { metadata, MyLatestBlock, MyLatestRoot } from './metadata'
import { hash } from './trie'

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

export default class Sequencer extends Contract {
  start = async (): Promise<void> => {
    await sleep(Math.ceil(Math.random() * THRESHOLD))
    const fromBlock = await MyLatestBlock.get()
    const logs = await this.client.getContractEvents({
      abi: this.abi,
      eventName: 'Propose',
      fromBlock,
    })
    if (!logs.length) {
      // Check reorg'ed
      if ((await this.contract.read.latest()) !== (await MyLatestRoot.get())) {
        console.info('😱 Reorg: Clear all state and resync from the beginning')
        await stateTrie.clear()
        await txTrie.clear()
        await metadata.clear()
      } else {
        // Updated! Propose a new block
        await this.propose()
      }
    } else {
      // Sync new blocks
      await this.sync(logs)
    }
    return this.start()
  }

  propose = async () => {
    const prev = (await this.contract.read.latest()) as string
    const txs: Tx[] = []
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
    }
    // Apply transactions
    await this.execute(txs)
    // Submit the block
    const root: `0x${string}` = `0x${Buffer.from(
      hash({
        left: Buffer.from(prev.substring(2), 'hex'),
        right: hash({
          left: await txTrie.root(),
          right: await stateTrie.root(),
        }),
      })!!,
    ).toString('hex')}`
    const txId = await this.contract.write.propose([root, prev, txs])
    // Update state
    await MyLatestRoot.set(root)
    // Return
    return console.info('⛏️ Proposed a new block:', txId)
  }

  sync = async <
    T extends { transactionHash: `0x${string}`; blockNumber: bigint },
  >(
    logs: T[],
  ) => {
    for (const log of logs) {
      const { input } = await this.client.getTransaction({
        hash: log.transactionHash,
      })
      const {
        args: [root, prev, txs],
      }: { args: [`0x${string}`, `0x${string}`, Tx[]] } = decodeFunctionData({
        abi: this.abi,
        data: input,
      }) as any
      // Apply transactions
      await this.execute(txs)
      // Update state
      await MyLatestBlock.set(log.blockNumber)
      await MyLatestRoot.set(root)
      // Return
      return console.info('⬇️ Synced block:', root)
    }
  }

  execute = async (txs: Tx[]) => {}
}
