import 'dotenv/config'
import { z } from 'zod'

const config = z
  .object({
    PRIVATE_KEY: z.string().default(''),
    PORT: z.coerce.number().default(8000),
  })
  .parse(process.env)

export const { PRIVATE_KEY, PORT } = config
