import { keys, randomBytes } from '@libp2p/crypto'

import { PRIVATE_KEY } from './config'
import Swarm from './swarm'
import { state } from './state'
import Bridge from './bridge'
import { buf2bin } from './trie'

async function main() {
  const privkey = keys.privateKeyFromRaw(Buffer.from(PRIVATE_KEY, 'hex'))
  const { swarm } = await Swarm.new(privkey)
  await swarm.services.dht.setMode('server')
  await swarm.start()
  // Bridge
  const bridge = new Bridge('0xeC07A06dF0d4b4a8C857D6f12AEBD71f1bd45294')

  const topic = 'randao'
  swarm.services.pubsub.subscribe(topic)
  swarm.services.pubsub.addEventListener('message', async ({ detail }) => {
    console.log(
      'Message:',
      detail.topic,
      Buffer.from(detail.data).toString('hex'),
    )
  })

  const key = buf2bin(randomBytes(32))
  const value = randomBytes(32)
  await state.put(key, value)
  const proof = await state.prove(key)
  const ok = await state.verify(key, proof)
  console.log(ok)
  bridge.watch()

  // setInterval(async () => {
  //   const ok = swarm.services.pubsub.getSubscribers(topic).length
  //   if (ok) swarm.services.pubsub.publish(topic, randomBytes(32))
  // }, Math.ceil(10000 * Math.random()))
}
main()
