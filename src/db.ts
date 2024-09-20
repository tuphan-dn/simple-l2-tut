import { Level } from 'level'
import { PORT } from './config'

export const pool = new Level<string, Buffer>(`data/${PORT}/pool`, {
  keyEncoding: 'buffer',
  valueEncoding: 'buffer',
})
