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
import { mdns } from '@libp2p/mdns'
import { gossipsub, type GossipsubEvents } from '@chainsafe/libp2p-gossipsub'

export type SwarmProps = Libp2p<{
  identify: Identify
  identifyPush: IdentifyPush
  pubsub: PubSub<GossipsubEvents>
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
    this.swarm.addEventListener('peer:discovery', ({ detail }) => {
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
      console.log('⛔️ The MPC server is terminated')
    })
  }

  static new = async <E extends PrivateKey>(privateKey: E) => {
    const swarm = await createLibp2p({
      start: false,
      privateKey,
      addresses: {
        listen: ['/ip4/0.0.0.0/tcp/8000', '/ip6/::/tcp/8000'],
      },
      transports: [tcp()],
      streamMuxers: [yamux()],
      connectionEncrypters: [noise()],
      peerDiscovery: [mdns()],
      services: {
        identify: identify(),
        identifyPush: identifyPush(),
        pubsub: gossipsub(),
      },
    })
    return new Swarm(swarm)
  }
}
