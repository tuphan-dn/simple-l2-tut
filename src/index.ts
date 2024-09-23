import { keys } from '@libp2p/crypto'

import { PRIVATE_KEY } from './config'
import Swarm from './swarm'
import Bridge from './bridge'
import Sequencer from './sequencer'
import EVM from './evm'

async function main() {
  // Swarm
  const privkey = keys.privateKeyFromRaw(Buffer.from(PRIVATE_KEY, 'hex'))
  const { swarm } = await Swarm.new(privkey)
  await swarm.services.dht.setMode('server')
  await swarm.start()
  const topic = 'consensus'
  swarm.services.pubsub.subscribe(topic)
  swarm.services.pubsub.addEventListener('message', async ({ detail }) => {
    console.log(
      'Message:',
      detail.topic,
      Buffer.from(detail.data).toString('hex'),
    )
  })
  // Bridge
  const bridge = new Bridge('0xeC07A06dF0d4b4a8C857D6f12AEBD71f1bd45294')
  bridge.watch()
  // EVM
  const evm = new EVM('0xeC07A06dF0d4b4a8C857D6f12AEBD71f1bd45294')
  evm.sync()
  // Sequencer
  // const sequencer = new Sequencer()
  // sequencer.start()

  // setInterval(async () => {
  //   const ok = swarm.services.pubsub.getSubscribers(topic).length
  //   if (ok) swarm.services.pubsub.publish(topic, randomBytes(32))
  // }, Math.ceil(10000 * Math.random()))
}
main()
