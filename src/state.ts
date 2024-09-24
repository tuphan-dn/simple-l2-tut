import { Level } from 'level'

import { PORT } from './config'
import Trie from './trie'

export const stateTrie = new Trie(
  new Level<boolean[], Uint8Array>(`data/${PORT}/state-trie`, {
    keyEncoding: 'buffer',
    valueEncoding: 'buffer',
  }),
)
