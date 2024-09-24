import {
  createPublicClient,
  getContract,
  http,
  type WalletClient,
  type PublicClient,
  createWalletClient,
  type Hex,
} from 'viem'
import { holesky } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

import abi from '../contracts/Rollup.json'
import { PRIVATE_KEY } from './config'

export default class Contract {
  public readonly abi = abi
  public readonly client: PublicClient
  public readonly wallet: WalletClient

  constructor(public readonly address: Hex) {
    this.client = createPublicClient({
      chain: holesky,
      transport: http(
        'https://holesky.infura.io/v3/783c24a3a364474a8dbed638263dc410',
      ),
    })
    this.wallet = createWalletClient({
      chain: holesky,
      transport: http(
        'https://holesky.infura.io/v3/783c24a3a364474a8dbed638263dc410',
      ),
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
