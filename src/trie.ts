import { type Level } from 'level'
import { keccak256 } from 'ethereum-cryptography/keccak'
import { concatBytes, hexToBytes } from 'ethereum-cryptography/utils'
import { bytesToBigInt } from 'viem'

export const bigintToBytes = (bn: bigint) => {
  const hex = bn.toString(16).padStart(64, '0')
  return hexToBytes(hex)
}

export const bytesToBinary = (buffer: Uint8Array) => {
  return bytesToBigInt(buffer)
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
  constructor(
    public readonly state: Level<boolean[], Uint8Array>,
    public readonly init: Array<{ key: boolean[]; value: Uint8Array }> = [],
  ) {}

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

  clear = async () => {
    await this.state.clear()
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
    const [node, ...relatives] = proof
    let cache = node
    for (let i = 0; i < key.length; i++) {
      const bit = key[i]
      const left = !bit ? cache : relatives[i]
      const right = !bit ? relatives[i] : cache
      cache = hash({ left, right })
    }
    return cache?.toString() === (await this.root())?.toString()
  }

  reset = async () => {
    await this.state.clear()
    for (const { key, value } of this.init) await this.put(key, value)
  }
}
