import {
  createPublicClient,
  getContract,
  http,
  type WalletClient,
  type PublicClient,
  createWalletClient,
} from 'viem'
import { sepolia } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

import abi from '../contracts/Rollup.json'
import { PRIVATE_KEY } from './config'

export default class Contract {
  public readonly abi = abi
  public readonly client: PublicClient
  public readonly wallet: WalletClient

  constructor(public readonly address: `0x${string}`) {
    this.client = createPublicClient({
      chain: sepolia,
      transport: http(),
    })
    this.wallet = createWalletClient({
      chain: sepolia,
      transport: http(),
      account: privateKeyToAccount(`0x${PRIVATE_KEY}`),
    })
    console.info('💳 The coinbase:', this.wallet.account?.address)
  }

  get contract() {
    return getContract({
      address: this.address,
      abi: this.abi,
      client: {
        public: this.client,
        wallet: this.wallet,
      },
    })
  }
}
