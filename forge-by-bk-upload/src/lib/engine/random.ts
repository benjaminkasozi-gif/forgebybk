/** Small seeded PRNG so generation is reproducible (same seed → same program). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function uid(rand: () => number = Math.random): string {
  let s = "";
  for (let i = 0; i < 12; i++) s += Math.floor(rand() * 36).toString(36);
  return s;
}

export function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : uid();
}
