import { Level } from 'level'
import { bytesToBigInt, decodeFunctionData, type Hex } from 'viem'
import { bytesToHex, hexToBytes } from 'ethereum-cryptography/utils'

import { PORT } from './config'
import Contract from './contract'
import { stateTrie } from './state'
import Tx, { type TxLog, txTrie } from './tx'
import { metadata, MyLatestBlock, MyLatestRoot } from './metadata'
import { bigintToBytes, bytesToBinary, hash } from './trie'

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
    const block = await MyLatestBlock.get()
    const logs = await this.client.getContractEvents({
      abi: this.abi,
      eventName: 'Propose',
      fromBlock: block + BigInt(1),
    })
    if (!logs.length) {
      // Check reorg'ed
      if ((await this.contract.read.latest()) !== (await MyLatestRoot.get())) {
        console.info('😱 Reorg: Clear all state and resync from the beginning')
        await stateTrie.reset()
        await txTrie.reset()
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
        bytesToBigInt(value.subarray(40, 72)),
        value.subarray(72, 104),
      )
      if (await txTrie.get(bytesToBinary(tx.txId))) continue
      else txs.push(tx)
    }
    if (!txs.length) return console.info('⛏️ Empty pool')
    // Apply transactions
    await this.execute(txs)
    // Submit the block
    const prev = (await this.contract.read.latest()) as string
    const root: Hex = `0x${bytesToHex(
      hash({
        left: hexToBytes(prev.substring(2)),
        right: hash({
          left: await txTrie.root(),
          right: await stateTrie.root(),
        }),
      })!!,
    )}`
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
    console.log(txs.map((tx) => tx.decode()))
    for (const tx of txs) {
      await txTrie.put(bytesToBinary(tx.txId), tx.data)
      const from =
        (await stateTrie.get(bytesToBinary(tx.from))) ||
        hexToBytes(''.padStart(64, '0'))
      const to =
        (await stateTrie.get(bytesToBinary(tx.to))) ||
        hexToBytes(''.padStart(64, '0'))
      // No balance validation here so we can makeup a fake transaction later for fraud proof
      await stateTrie.put(
        bytesToBinary(tx.from),
        bigintToBytes(bytesToBigInt(from) - tx.amount),
      )
      await stateTrie.put(
        bytesToBinary(tx.to),
        bigintToBytes(bytesToBigInt(to) + tx.amount),
      )
    }
  }
}
