import { type Log, zeroAddress } from 'viem'
import { hexToBytes } from 'ethereum-cryptography/utils'

import { pool } from './sequencer'
import Tx from './tx'
import Contract from './contract'

export default class Bridge extends Contract {
  watch = () => {
    const unwatch = this.contract.watchEvent.Lock(
      {},
      {
        onLogs: async (logs: any) => {
          const txs: Tx[] = logs.map(
            ({
              args: { account, amount },
              transactionHash,
            }: Log & {
              args: { account: `0x${string}`; amount: bigint }
            }) =>
              new Tx(
                hexToBytes(zeroAddress),
                hexToBytes(account),
                amount,
                hexToBytes(transactionHash!!),
              ),
          )
          await pool.batch(
            txs.map((tx) => ({ type: 'put', key: tx.txId, value: tx.data })),
          )
        },
      },
    )
    return unwatch
  }

  genesis = async () => {
    return await this.contract.read.genesis()
  }
}
