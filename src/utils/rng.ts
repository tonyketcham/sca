export type Rng = () => number

export function createSeededRng(seed: number): Rng {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = t
    r = Math.imul(r ^ (r >>> 15), r | 1)
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

export function createSeed(): number {
  const raw = Date.now() ^ Math.floor(Math.random() * 1e9)
  return Math.abs(raw) % 1_000_000_000
}
