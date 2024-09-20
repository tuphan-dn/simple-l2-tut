import { Level } from 'level'
import { keccak256 } from 'ethereum-cryptography/keccak'
import { concatBytes } from 'ethereum-cryptography/utils'

import { PORT } from './config'

export const buf2bin = (buffer: Uint8Array) => {
  return BigInt('0x' + Buffer.from(buffer).toString('hex'))
    .toString(2)
    .padStart(buffer.length * 8, '0')
    .split('')
    .map((e) => e === '1')
}

const hash = ({ left, right }: { left?: Uint8Array; right?: Uint8Array }) => {
  if (left) {
    if (right) return keccak256(concatBytes(left, right))
    else return keccak256(left)
  } else {
    if (right) return keccak256(right)
    else return undefined
  }
}

const state = new Level<boolean[], Uint8Array>(`data/${PORT}/state-trie`, {
  keyEncoding: 'buffer',
  valueEncoding: 'buffer',
})

export const put = async (
  key: boolean[],
  value?: Uint8Array,
): Promise<void> => {
  if (!value) await state.del(key)
  else state.put(key, value)
  if (!key.length) return
  const [bit, ...rest] = key
  const sibling = await get([!bit, ...rest])
  const parent = !bit
    ? hash({ left: value, right: sibling })
    : hash({ left: sibling, right: value })
  return await put(rest, parent)
}

export const get = async (key: boolean[]) => {
  try {
    const re = await state.get(key)
    return Uint8Array.from(re)
  } catch (er: any) {
    if (er.code !== 'LEVEL_NOT_FOUND') throw er
    return undefined
  }
}

export const root = async () => {
  return await get([])
}

export const prove = async (
  key: boolean[],
): Promise<Array<Uint8Array | undefined>> => {
  const relatives = async (
    key: boolean[],
  ): Promise<Array<Uint8Array | undefined>> => {
    if (!key.length) return []
    const [bit, ...rest] = key
    return [await get([!bit, ...rest]), ...(await relatives(rest))]
  }
  const value = await get(key)
  return [value, ...(await relatives(key))]
}

export const verify = async (
  key: boolean[],
  proof: Array<Uint8Array | undefined>,
): Promise<boolean> => {
  if (key.length + 1 !== proof.length || !proof.length) return false
  if (proof.length === 1)
    return proof[0]?.toString() === (await root())?.toString()
  const bit = key.shift()
  const a = proof.shift()
  const b = proof.shift()
  const p = hash({ left: !bit ? a : b, right: !bit ? b : a })
  return verify(key, [p, ...proof])
}
