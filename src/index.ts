import { keys } from '@libp2p/crypto'
import { bytesToHex, hexToBytes } from 'ethereum-cryptography/utils'

import { PRIVATE_KEY } from './config'
import Swarm from './swarm'
import Bridge from './bridge'

async function main() {
  // Swarm
  const privkey = keys.privateKeyFromRaw(hexToBytes(PRIVATE_KEY))
  const { swarm } = await Swarm.new(privkey)
  await swarm.services.dht.setMode('server')
  await swarm.start()
  const topic = 'consensus'
  swarm.services.pubsub.subscribe(topic)
  swarm.services.pubsub.addEventListener('message', async ({ detail }) => {
    console.info('Message:', detail.topic, bytesToHex(detail.data))
  })
  // Bridge
  const bridge = new Bridge('0x10C3Cd012657a3DC886c203B9d7363A33BA73AAA')
  bridge.watch()
}
main()
