// Per-residue conservation heuristic. With no MSA available, approximate
// "evolutionary conservation" using BLOSUM62 self-score as a proxy for
// substitution tolerance (more positive = less tolerant of substitution =
// more conserved on average).

import { blosum62 } from "./aminoacids";

export function conservationProfile(seq: string): number[] {
  const s = seq.toUpperCase();
  return s.split("").map((aa) => {
    const self = blosum62(aa, aa);
    // Normalize roughly to 0..1 (BLOSUM62 self-scores range 4..11)
    return Math.max(0, Math.min(1, (self - 3) / 8));
  });
}

export function topConserved(profile: number[], n = 10): number[] {
  const indices = profile
    .map((v, i) => [v, i] as const)
    .sort((a, b) => b[0] - a[0])
    .slice(0, n)
    .map(([, i]) => i + 1);
  return indices.sort((a, b) => a - b);
}
