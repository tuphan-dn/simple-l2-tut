import { createLibp2p } from 'libp2p'

export default class Swarm {
  new = async () => {
    const behavior = {}
    const swarm = await createLibp2p(behavior)
  }
}
