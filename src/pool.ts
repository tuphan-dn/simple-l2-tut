import { Level } from 'level'
import { PORT } from './config'

export const pool = new Level<Uint8Array, Uint8Array>(`data/${PORT}/pool`, {
  keyEncoding: 'buffer',
  valueEncoding: 'buffer',
})
