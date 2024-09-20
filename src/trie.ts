import { type Level } from 'level'
import { keccak256 } from 'ethereum-cryptography/keccak'
import { concatBytes } from 'ethereum-cryptography/utils'

export const buf2bin = (buffer: Uint8Array) => {
  return BigInt('0x' + Buffer.from(buffer).toString('hex'))
    .toString(2)
    .padStart(buffer.length * 8, '0')
    .split('')
    .map((e) => e === '1')
}

export const hash = ({
  left,
  right,
}: {
  left?: Uint8Array
  right?: Uint8Array
}) => {
  if (left) {
    if (right) return keccak256(concatBytes(left, right))
    else return keccak256(left)
  } else {
    if (right) return keccak256(right)
    else return undefined
  }
}

export default class Trie {
  constructor(public readonly state: Level<boolean[], Uint8Array>) {}

  put = async (key: boolean[], value?: Uint8Array): Promise<void> => {
    if (!value) await this.state.del(key)
    else this.state.put(key, value)
    if (!key.length) return
    const [bit, ...rest] = key
    const sibling = await this.get([!bit, ...rest])
    const parent = !bit
      ? hash({ left: value, right: sibling })
      : hash({ left: sibling, right: value })
    return await this.put(rest, parent)
  }

  get = async (key: boolean[]) => {
    try {
      const re = await this.state.get(key)
      return Uint8Array.from(re)
    } catch (er: any) {
      if (er.code !== 'LEVEL_NOT_FOUND') throw er
      return undefined
    }
  }

  root = async () => {
    return await this.get([])
  }

  prove = async (key: boolean[]): Promise<Array<Uint8Array | undefined>> => {
    const relatives = async (
      key: boolean[],
    ): Promise<Array<Uint8Array | undefined>> => {
      if (!key.length) return []
      const [bit, ...rest] = key
      return [await this.get([!bit, ...rest]), ...(await relatives(rest))]
    }
    const value = await this.get(key)
    return [value, ...(await relatives(key))]
  }

  verify = async (
    key: boolean[],
    proof: Array<Uint8Array | undefined>,
  ): Promise<boolean> => {
    if (key.length + 1 !== proof.length || !proof.length) return false
    if (proof.length === 1)
      return proof[0]?.toString() === (await this.root())?.toString()
    const bit = key.shift()
    const a = proof.shift()
    const b = proof.shift()
    const p = hash({ left: !bit ? a : b, right: !bit ? b : a })
    return this.verify(key, [p, ...proof])
  }
}
