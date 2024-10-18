import { keys } from '@libp2p/crypto'
import { bytesToHex, hexToBytes } from 'ethereum-cryptography/utils'

import { PRIVATE_KEY } from './config'
import Swarm from './swarm'
import { stateTrie } from './state'
import Bridge from './bridge'
import Sequencer from './sequencer'

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
  // Init the state trie
  if (!(await stateTrie.root())) await stateTrie.reset()
  // Bridge
  const bridge = new Bridge('0x893d1B751cD4F226A4645275c085fda6Ecb9972B')
  bridge.watch()
  // Sequencer
  const sequencer = new Sequencer('0x893d1B751cD4F226A4645275c085fda6Ecb9972B')
  sequencer.start()
}
main()
