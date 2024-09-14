import { createLibp2p } from 'libp2p'
import config from './config'

export default class Swarm {
  new = async () => {
    const behavior = {}
    const swarm = await createLibp2p(behavior)
  }
}

console.log(config.PRIVATE_KEY)
