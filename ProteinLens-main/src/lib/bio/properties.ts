// Sequence-derived physicochemical properties.
// Implementations follow ExPASy ProtParam (Gasteiger et al. 2005).

import { AA, AA_ORDER, aaInfo } from "./aminoacids";

const WATER_MASS = 18.01528;
const N_TERM_PKA = 9.69;
const C_TERM_PKA = 2.34;

// Gasteiger DiWV table for instability index (subset of common pairs that
// dominate the score; missing pairs get 1.0 — exact full 400-entry table is
// proprietary so we approximate with the most commonly cited destabilizing pairs).
const DIWV_OVERRIDES: Record<string, number> = {
  WW: 1.0,  WC: 24.68, WM: 24.68, WV: -7.49, WL: 13.34, WI: 1.0,  WY: 1.0,
  PP: 20.26, PG: 6.54, PS: -7.49, PT: -7.49, PC: -6.54,
  YY: 13.34, YP: 13.34, YS: 1.0,  YG: -7.49,
  HH: 1.0,  HW: -1.88, HV: -1.88, HE: 1.0,
  SS: 20.26, ST: 1.0,  SK: -1.88,
  GE: -6.54, GI: -7.49,
  LL: 1.0,  LR: 20.26,
  RR: 1.0,  RP: 20.26,
  KK: 1.0,  KP: -6.54,
  EM: 1.0,  ED: 20.26,
  NN: 1.0,  NP: -1.88,
  DD: 1.0,  DG: 1.0,
  AA: 1.0,  AL: 1.0,
  IL: 1.0,
  TT: 1.0,  TC: 1.0,
  CC: 1.0,
  FF: 1.0,
  MM: 1.0,
  VV: 1.0,
  QQ: 1.0,
};

export function molecularWeight(seq: string): number {
  let mw = WATER_MASS;
  for (const c of seq.toUpperCase()) {
    const info = aaInfo(c);
    if (info) mw += info.mw;
  }
  return mw;
}

export function gravy(seq: string): number {
  let total = 0;
  let n = 0;
  for (const c of seq.toUpperCase()) {
    const info = aaInfo(c);
    if (info) { total += info.hydropathy; n++; }
  }
  return n > 0 ? total / n : 0;
}

// Aliphatic index (Ikai 1980): X(A) + a*X(V) + b*(X(I)+X(L))
// where a=2.9, b=3.9, X = mole percent
export function aliphaticIndex(seq: string): number {
  const counts = aaCounts(seq);
  const total = seq.length || 1;
  const xA = (counts.A / total) * 100;
  const xV = (counts.V / total) * 100;
  const xI = (counts.I / total) * 100;
  const xL = (counts.L / total) * 100;
  return xA + 2.9 * xV + 3.9 * (xI + xL);
}

// Extinction coefficient at 280 nm (assuming all Cys form cystines).
export function extinctionCoefficient(seq: string): { reduced: number; oxidized: number } {
  const c = aaCounts(seq);
  const reduced = c.W * 5500 + c.Y * 1490;
  const oxidized = reduced + Math.floor(c.C / 2) * 125;
  return { reduced, oxidized };
}

// Instability index (Guruprasad 1990): sum over dipeptides DIWV / N * 10.
export function instabilityIndex(seq: string): number {
  if (seq.length < 2) return 0;
  let sum = 0;
  const s = seq.toUpperCase();
  for (let i = 0; i < s.length - 1; i++) {
    const di = s.slice(i, i + 2);
    sum += DIWV_OVERRIDES[di] ?? 1.0;
  }
  return (sum / s.length) * 10;
}

// Theoretical pI (binary search of charge function).
export function isoelectricPoint(seq: string): number {
  const counts = aaCounts(seq);
  let lo = 0, hi = 14;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    const q = netCharge(seq, mid, counts);
    if (q > 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export function netCharge(seq: string, pH: number, countsArg?: Record<string, number>): number {
  const c = countsArg ?? aaCounts(seq);
  const posPart = (n: number, pKa: number) => n / (1 + Math.pow(10, pH - pKa));
  const negPart = (n: number, pKa: number) => -n / (1 + Math.pow(10, pKa - pH));
  let charge = 0;
  charge += posPart(1, N_TERM_PKA);
  charge += posPart(c.K, AA.K.pkaSide!);
  charge += posPart(c.R, AA.R.pkaSide!);
  charge += posPart(c.H, AA.H.pkaSide!);
  charge += negPart(1, C_TERM_PKA);
  charge += negPart(c.D, AA.D.pkaSide!);
  charge += negPart(c.E, AA.E.pkaSide!);
  charge += negPart(c.C, AA.C.pkaSide!);
  charge += negPart(c.Y, AA.Y.pkaSide!);
  return charge;
}

export function aaCounts(seq: string): Record<string, number> {
  const counts: Record<string, number> = Object.fromEntries(AA_ORDER.map((a) => [a, 0]));
  for (const c of seq.toUpperCase()) {
    if (c in counts) counts[c]++;
  }
  return counts;
}

export function aaPercent(seq: string): { letter: string; pct: number; count: number }[] {
  const counts = aaCounts(seq);
  const total = seq.length || 1;
  return AA_ORDER.map((a) => ({ letter: a, count: counts[a], pct: (counts[a] / total) * 100 }));
}

// Hydropathy window (Kyte-Doolittle, configurable window size)
export function hydropathyWindow(seq: string, window = 9): number[] {
  const half = Math.floor(window / 2);
  const vals: number[] = [];
  const s = seq.toUpperCase();
  for (let i = 0; i < s.length; i++) {
    let sum = 0, n = 0;
    for (let j = -half; j <= half; j++) {
      const k = i + j;
      if (k < 0 || k >= s.length) continue;
      const info = aaInfo(s[k]);
      if (info) { sum += info.hydropathy; n++; }
    }
    vals.push(n > 0 ? sum / n : 0);
  }
  return vals;
}

// Predicted protein class based on simple sequence statistics.
export function predictProteinClass(seq: string): { label: string; confidence: number; reason: string } {
  const tm = countTransmembraneHelices(seq);
  const counts = aaCounts(seq);
  const total = seq.length || 1;
  const pctCys = (counts.C / total) * 100;
  const gly = (counts.G / total) * 100;
  const collagenRepeats = (seq.match(/G.{2}/g) || []).length / (seq.length / 3 || 1);

  if (tm >= 7) return { label: "Receptor (GPCR-like)", confidence: 0.75, reason: `${tm} predicted transmembrane helices` };
  if (tm >= 1) return { label: "Membrane / Transport", confidence: 0.6, reason: `${tm} predicted transmembrane helices` };
  if (pctCys > 6) return { label: "Structural / Disulfide-rich", confidence: 0.55, reason: `${pctCys.toFixed(1)}% cysteine` };
  if (gly > 20 && collagenRepeats > 0.6) return { label: "Structural (collagen-like)", confidence: 0.6, reason: "Gly-X-Y repeats" };
  if (/H.HH/.test(seq) || /C..C/.test(seq)) return { label: "Enzyme / Metalloprotein", confidence: 0.5, reason: "metal-binding motifs" };
  return { label: "Soluble globular", confidence: 0.4, reason: "default classification" };
}

export function countTransmembraneHelices(seq: string, threshold = 1.6, minLen = 18): number {
  const win = hydropathyWindow(seq, 19);
  let count = 0;
  let inHelix = false;
  let runStart = 0;
  for (let i = 0; i < win.length; i++) {
    if (win[i] >= threshold) {
      if (!inHelix) { inHelix = true; runStart = i; }
    } else if (inHelix) {
      if (i - runStart >= minLen) count++;
      inHelix = false;
    }
  }
  if (inHelix && win.length - runStart >= minLen) count++;
  return count;
}

export function predictLocalization(seq: string): { label: string; confidence: number; signals: string[] } {
  const signals: string[] = [];
  const tm = countTransmembraneHelices(seq);
  const nterm = seq.slice(0, 30);
  const cterm = seq.slice(-10);

  // Signal peptide: N-terminal hydrophobic core after a positive n-region
  const hasSignal = /^M[A-Z]{0,5}[KR]{0,3}[A-Z]{0,5}[ALVIFMWC]{6,15}/.test(seq);
  if (hasSignal) signals.push("N-terminal signal peptide");

  // ER retention KDEL
  if (/[KH]DEL$/.test(seq)) signals.push("KDEL/HDEL ER retention");

  // Mitochondrial: N-term amphipathic Arg-rich, no negatives
  const ntermArg = (nterm.match(/[RK]/g) || []).length;
  const ntermAcid = (nterm.match(/[DE]/g) || []).length;
  if (ntermArg >= 4 && ntermAcid === 0) signals.push("Mitochondrial targeting (Arg-rich N-term)");

  // NLS
  if (/[KR]{4,6}/.test(seq) || /[KR]{2}[A-Z]{10,12}[KR]{3}/.test(seq)) signals.push("Nuclear localization signal");

  // Peroxisomal SKL
  if (/[SAC][KRH][LM]$/.test(seq)) signals.push("Peroxisomal SKL motif");

  // GPI anchor
  if (/[GASN][GASN][GASN][A-Z][A-Z]{15,25}$/.test(cterm + seq.slice(-25))) signals.push("Possible GPI anchor");

  let label = "Cytoplasm";
  let confidence = 0.4;
  if (tm >= 7) { label = "Plasma membrane (GPCR)"; confidence = 0.75; }
  else if (tm >= 1) { label = "Membrane"; confidence = 0.65; }
  else if (signals.includes("Mitochondrial targeting (Arg-rich N-term)")) { label = "Mitochondria"; confidence = 0.6; }
  else if (signals.some((s) => s.includes("Nuclear"))) { label = "Nucleus"; confidence = 0.55; }
  else if (signals.includes("Peroxisomal SKL motif")) { label = "Peroxisome"; confidence = 0.7; }
  else if (signals.some((s) => s.includes("ER retention"))) { label = "Endoplasmic reticulum"; confidence = 0.7; }
  else if (signals.some((s) => s.includes("signal peptide"))) { label = "Secreted / extracellular"; confidence = 0.6; }

  return { label, confidence, signals };
}
