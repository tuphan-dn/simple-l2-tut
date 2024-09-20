import {
  createPublicClient,
  getContract,
  http,
  type Log,
  zeroAddress,
  type PublicClient,
} from 'viem'
import { sepolia } from 'viem/chains'
import { hexToBytes } from 'ethereum-cryptography/utils'

import abi from '../contracts/Rollup.json'
import { pool } from './pool'
import Tx from './tx'

export default class Bridge {
  public readonly client: PublicClient

  constructor(public readonly address: `0x${string}`) {
    this.client = createPublicClient({
      chain: sepolia,
      transport: http(),
    })
  }

  get contract() {
    return getContract({
      address: this.address,
      abi,
      client: this.client,
    })
  }

  watch = () => {
    const unwatch = this.contract.watchEvent.Lock(
      {},
      {
        onLogs: async (logs: any) => {
          for (const {
            args: { account, amount },
            transactionHash,
          } of logs as Array<
            Log & {
              args: { account: `0x${string}`; amount: bigint }
            }
          >) {
            const tx = new Tx(
              hexToBytes(zeroAddress),
              hexToBytes(account),
              amount,
              hexToBytes(transactionHash!!),
            )
            console.log(tx.data)
            await pool.put(tx.txId, tx.data)
          }
        },
      },
    )
    return unwatch
  }

  genesis = async () => {
    return await this.contract.read.genesis()
  }
}
