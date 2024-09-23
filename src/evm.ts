import { Level } from 'level'

import { PORT } from './config'
import Contract from './contract'

export const metadata = new Level<string, Uint8Array>(`data/${PORT}/metadata`, {
  keyEncoding: 'json',
  valueEncoding: 'json',
})

export default class EVM extends Contract {
  sync = () => {
    const id = setInterval(async () => {
      // const logs = await this.contract.getEvents.Propose()
      // console.log(logs)
      const tx = await this.client.getTransaction({
        hash: '0x1f5d900f82fa7f6a30d752e79928fceb642c79b6aec110dae51d097c69231c2e',
      })
      console.log(tx)
    }, 5000)
    return () => clearInterval(id)
  }
}
