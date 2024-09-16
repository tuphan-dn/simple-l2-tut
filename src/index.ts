import { keys } from '@libp2p/crypto'

import { PRIVATE_KEY } from './config'
import Swarm from './swarm'

async function main() {
  const privkey = keys.privateKeyFromRaw(Buffer.from(PRIVATE_KEY, 'hex'))
  const swarm = await Swarm.new(privkey)
  await swarm.swarm.services.dht.setMode('server')
  await swarm.swarm.start()
}
main()
