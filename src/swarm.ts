import { createLibp2p, type Libp2p } from 'libp2p'
import { type PubSub, type PrivateKey } from '@libp2p/interface'
import { tcp } from '@libp2p/tcp'
import { yamux } from '@chainsafe/libp2p-yamux'
import { noise } from '@chainsafe/libp2p-noise'
import {
  type Identify,
  identify,
  type IdentifyPush,
  identifyPush,
} from '@libp2p/identify'
import { gossipsub, type GossipsubEvents } from '@chainsafe/libp2p-gossipsub'
import { type KadDHT, kadDHT, passthroughMapper } from '@libp2p/kad-dht'
import { bootstrap } from '@libp2p/bootstrap'

import { PORT } from './config'

export type SwarmProps = Libp2p<{
  identify: Identify
  identifyPush: IdentifyPush
  pubsub: PubSub<GossipsubEvents>
  dht: KadDHT
}>

export default class Swarm {
  constructor(public readonly swarm: SwarmProps) {
    // Start
    this.swarm.addEventListener('start', () => {
      swarm.getMultiaddrs().forEach((addr) => {
        console.log('✅ The node is listening on', addr.toString())
      })
    })
    // Discovery
    this.swarm.addEventListener('peer:connect', ({ detail: peer }) => {
      console.log('🔗 Connected to', peer.toString())
    })
    this.swarm.addEventListener('peer:discovery', async ({ detail }) => {
      console.log('🔍 Discovered:', detail.id.toString())
    })
    this.swarm.addEventListener('peer:identify', ({ detail }) => {
      console.log('👤 Identify new peer', detail.peerId.toString())
    })
    this.swarm.addEventListener('peer:disconnect', ({ detail }) => {
      console.log('💔 Disconnected to', detail.toString())
    })
    // Stop
    this.swarm.addEventListener('stop', () => {
      console.log('⛔️ The node is terminated')
    })
  }

  static new = async <E extends PrivateKey>(privateKey: E) => {
    const swarm = await createLibp2p({
      start: false,
      privateKey,
      addresses: {
        listen: [`/ip4/0.0.0.0/tcp/${PORT}`],
      },
      transports: [tcp()],
      streamMuxers: [yamux()],
      connectionEncrypters: [noise()],
      peerDiscovery: [
        bootstrap({
          list: [
            '/ip4/13.238.141.54/tcp/8000/p2p/16Uiu2HAmPJ7rawvyJm9BavwwfSCR9sp4e6PnjmnFTygZFooPBnX1',
          ],
        }),
      ],
      services: {
        identify: identify(),
        identifyPush: identifyPush(),
        pubsub: gossipsub(),
        dht: kadDHT({
          clientMode: false,
          peerInfoMapper: passthroughMapper, // TODO: accept staker address only
        }),
      },
    })
    return new Swarm(swarm)
  }
}
