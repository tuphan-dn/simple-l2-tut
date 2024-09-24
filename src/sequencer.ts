import { Level } from 'level'
import { decodeFunctionData, type Hex } from 'viem'

import { PORT } from './config'
import Contract from './contract'
import { stateTrie } from './state'
import Tx, { type TxLog, txTrie } from './tx'
import { metadata, MyLatestBlock, MyLatestRoot } from './metadata'
import { buf2bin, hash } from './trie'

// If I'm no the leader, sync the new blocks
// Else
// Bundled <= 5 txs withdrawn from the pool
// Apply to the tx-trie and state-trie
// Compute root = hash(prev | tx-trie-root | state-trie-root)
// Propose the block
// Sync

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
    const latest = await MyLatestBlock.get()
    const logs = await this.client.getContractEvents({
      abi: this.abi,
      eventName: 'Propose',
      fromBlock: latest + BigInt(1),
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
    const txs: Tx[] = []
    for await (const [key, value] of pool.iterator({ limit: 5 })) {
      await pool.del(key)
      const tx = new Tx(
        value.subarray(0, 20),
        value.subarray(20, 40),
        BigInt(`0x${Buffer.from(value.subarray(40, 72)).toString('hex')}`),
        value.subarray(72, 104),
      )
      if (await txTrie.get(buf2bin(tx.txId))) continue
      else txs.push(tx)
    }
    if (!txs.length) return console.info('⛏️ Empty pool')
    // Apply transactions
    await this.execute(txs)
    // Submit the block
    const prev = (await this.contract.read.latest()) as string
    const root: Hex = `0x${Buffer.from(
      hash({
        left: Buffer.from(prev.substring(2), 'hex'),
        right: hash({
          left: await txTrie.root(),
          right: await stateTrie.root(),
        }),
      })!!,
    ).toString('hex')}`
    try {
      const txId = await this.contract.write.propose([
        root,
        prev,
        txs.map((tx) => tx.decode()),
      ])
      const { blockNumber } = await this.client.waitForTransactionReceipt({
        hash: txId,
      })
      // Update state
      await MyLatestBlock.set(blockNumber)
      await MyLatestRoot.set(root)
      return console.info('⛏️ Proposed a new block:', root)
    } catch {
      return console.info('⛏️ Failed to proposed a new block')
    }
  }

  sync = async <T extends { transactionHash: Hex; blockNumber: bigint }>(
    logs: T[],
  ) => {
    for (const log of logs) {
      const { input } = await this.client.getTransaction({
        hash: log.transactionHash,
      })
      const {
        args: [root, prev, txs],
      }: {
        args: [Hex, Hex, TxLog[]]
      } = decodeFunctionData({
        abi: this.abi,
        data: input,
      }) as any
      // Apply transactions
      await this.execute(txs.map((tx) => Tx.encode(tx)))
      // Update state
      await MyLatestBlock.set(log.blockNumber)
      await MyLatestRoot.set(root)
      return console.info('⬇️ Synced block:', root)
    }
  }

  execute = async (txs: Tx[]) => {
    console.log('=================')
    for (const tx of txs) {
      console.log(tx)
    }
  }
}
