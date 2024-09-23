import { createPublicClient, getContract, http, type PublicClient } from 'viem'
import { sepolia } from 'viem/chains'

import abi from '../contracts/Rollup.json'

export default class Contract {
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
}
