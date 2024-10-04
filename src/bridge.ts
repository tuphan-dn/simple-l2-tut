import { Level } from 'level'
import { type Hex, type Log, zeroAddress } from 'viem'
import { hexToBytes } from 'ethereum-cryptography/utils'

import Tx from './tx'
import Contract from './contract'

export const pool = new Level<Uint8Array, Uint8Array>('data/pool', {
  keyEncoding: 'buffer',
  valueEncoding: 'buffer',
})

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
              args: { account: Hex; amount: bigint }
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
}
