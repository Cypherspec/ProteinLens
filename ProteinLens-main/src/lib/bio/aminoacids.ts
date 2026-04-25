// Amino acid reference data — properties, BLOSUM62, hydropathy, masses.
// All values are widely-published constants (Kyte-Doolittle 1982,
// BLOSUM62 from Henikoff 1992, monoisotopic masses from Unimod).

export type AAClass = "hydrophobic" | "polar" | "positive" | "negative" | "special" | "aromatic";

export interface AAInfo {
  one: string;
  three: string;
  name: string;
  class: AAClass;
  hydropathy: number;       // Kyte-Doolittle
  mw: number;               // average mass (residue, in Da; minus water)
  pkaSide?: number;         // side-chain pKa
  charge: number;           // formal at pH 7.4
  helixPropensity: number;  // Chou-Fasman P_alpha
  sheetPropensity: number;  // P_beta
  turnPropensity: number;   // P_turn
  flexibility: number;      // 0..1
  ext280: number;           // ε280 contribution per residue (M^-1 cm^-1) for Trp, Tyr, Cys
  instabilityWeight: number; // simplified self-weight from Guruprasad index
}

const _AA: Record<string, AAInfo> = {
  A: { one: "A", three: "ALA", name: "Alanine",       class: "hydrophobic", hydropathy:  1.8, mw:  71.08, charge: 0,  helixPropensity: 1.42, sheetPropensity: 0.83, turnPropensity: 0.66, flexibility: 0.36, ext280: 0,    instabilityWeight: 1.0 },
  R: { one: "R", three: "ARG", name: "Arginine",      class: "positive",    hydropathy: -4.5, mw: 156.19, pkaSide: 12.48, charge: 1, helixPropensity: 0.98, sheetPropensity: 0.93, turnPropensity: 0.95, flexibility: 0.53, ext280: 0,    instabilityWeight: 1.0 },
  N: { one: "N", three: "ASN", name: "Asparagine",    class: "polar",       hydropathy: -3.5, mw: 114.10, charge: 0,  helixPropensity: 0.67, sheetPropensity: 0.89, turnPropensity: 1.56, flexibility: 0.46, ext280: 0,    instabilityWeight: 1.0 },
  D: { one: "D", three: "ASP", name: "Aspartate",     class: "negative",    hydropathy: -3.5, mw: 115.09, pkaSide:  3.65, charge: -1, helixPropensity: 1.01, sheetPropensity: 0.54, turnPropensity: 1.46, flexibility: 0.51, ext280: 0,    instabilityWeight: 1.0 },
  C: { one: "C", three: "CYS", name: "Cysteine",      class: "special",     hydropathy:  2.5, mw: 103.14, pkaSide:  8.33, charge: 0, helixPropensity: 0.70, sheetPropensity: 1.19, turnPropensity: 1.19, flexibility: 0.35, ext280: 125,  instabilityWeight: 1.0 },
  E: { one: "E", three: "GLU", name: "Glutamate",     class: "negative",    hydropathy: -3.5, mw: 129.12, pkaSide:  4.25, charge: -1, helixPropensity: 1.51, sheetPropensity: 0.37, turnPropensity: 0.74, flexibility: 0.50, ext280: 0,    instabilityWeight: 1.0 },
  Q: { one: "Q", three: "GLN", name: "Glutamine",     class: "polar",       hydropathy: -3.5, mw: 128.13, charge: 0,  helixPropensity: 1.11, sheetPropensity: 1.10, turnPropensity: 0.98, flexibility: 0.49, ext280: 0,    instabilityWeight: 1.0 },
  G: { one: "G", three: "GLY", name: "Glycine",       class: "special",     hydropathy: -0.4, mw:  57.05, charge: 0,  helixPropensity: 0.57, sheetPropensity: 0.75, turnPropensity: 1.56, flexibility: 0.54, ext280: 0,    instabilityWeight: 1.0 },
  H: { one: "H", three: "HIS", name: "Histidine",     class: "positive",    hydropathy: -3.2, mw: 137.14, pkaSide:  6.00, charge: 0.1, helixPropensity: 1.00, sheetPropensity: 0.87, turnPropensity: 0.95, flexibility: 0.32, ext280: 0,    instabilityWeight: 1.0 },
  I: { one: "I", three: "ILE", name: "Isoleucine",    class: "hydrophobic", hydropathy:  4.5, mw: 113.16, charge: 0,  helixPropensity: 1.08, sheetPropensity: 1.60, turnPropensity: 0.47, flexibility: 0.46, ext280: 0,    instabilityWeight: 1.0 },
  L: { one: "L", three: "LEU", name: "Leucine",       class: "hydrophobic", hydropathy:  3.8, mw: 113.16, charge: 0,  helixPropensity: 1.21, sheetPropensity: 1.30, turnPropensity: 0.59, flexibility: 0.37, ext280: 0,    instabilityWeight: 1.0 },
  K: { one: "K", three: "LYS", name: "Lysine",        class: "positive",    hydropathy: -3.9, mw: 128.17, pkaSide: 10.53, charge: 1, helixPropensity: 1.16, sheetPropensity: 0.74, turnPropensity: 1.01, flexibility: 0.47, ext280: 0,    instabilityWeight: 1.0 },
  M: { one: "M", three: "MET", name: "Methionine",    class: "hydrophobic", hydropathy:  1.9, mw: 131.20, charge: 0,  helixPropensity: 1.45, sheetPropensity: 1.05, turnPropensity: 0.60, flexibility: 0.30, ext280: 0,    instabilityWeight: 1.0 },
  F: { one: "F", three: "PHE", name: "Phenylalanine", class: "aromatic",    hydropathy:  2.8, mw: 147.18, charge: 0,  helixPropensity: 1.13, sheetPropensity: 1.38, turnPropensity: 0.60, flexibility: 0.31, ext280: 0,    instabilityWeight: 1.0 },
  P: { one: "P", three: "PRO", name: "Proline",       class: "special",     hydropathy: -1.6, mw:  97.12, charge: 0,  helixPropensity: 0.57, sheetPropensity: 0.55, turnPropensity: 1.52, flexibility: 0.51, ext280: 0,    instabilityWeight: 1.0 },
  S: { one: "S", three: "SER", name: "Serine",        class: "polar",       hydropathy: -0.8, mw:  87.08, charge: 0,  helixPropensity: 0.77, sheetPropensity: 0.75, turnPropensity: 1.43, flexibility: 0.51, ext280: 0,    instabilityWeight: 1.0 },
  T: { one: "T", three: "THR", name: "Threonine",     class: "polar",       hydropathy: -0.7, mw: 101.10, charge: 0,  helixPropensity: 0.83, sheetPropensity: 1.19, turnPropensity: 0.96, flexibility: 0.44, ext280: 0,    instabilityWeight: 1.0 },
  W: { one: "W", three: "TRP", name: "Tryptophan",    class: "aromatic",    hydropathy: -0.9, mw: 186.21, charge: 0,  helixPropensity: 1.08, sheetPropensity: 1.37, turnPropensity: 0.96, flexibility: 0.31, ext280: 5500, instabilityWeight: 1.0 },
  Y: { one: "Y", three: "TYR", name: "Tyrosine",      class: "aromatic",    hydropathy: -1.3, mw: 163.18, pkaSide: 10.07, charge: 0, helixPropensity: 0.69, sheetPropensity: 1.47, turnPropensity: 1.14, flexibility: 0.42, ext280: 1490, instabilityWeight: 1.0 },
  V: { one: "V", three: "VAL", name: "Valine",        class: "hydrophobic", hydropathy:  4.2, mw:  99.13, charge: 0,  helixPropensity: 1.06, sheetPropensity: 1.70, turnPropensity: 0.50, flexibility: 0.39, ext280: 0,    instabilityWeight: 1.0 },
};

export const AA = _AA;
export const AA_ORDER = "ACDEFGHIKLMNPQRSTVWY".split("");

export const THREE_TO_ONE: Record<string, string> = Object.fromEntries(
  Object.values(AA).map((a) => [a.three, a.one])
);
THREE_TO_ONE["MSE"] = "M"; // selenomethionine
THREE_TO_ONE["SEC"] = "C";
THREE_TO_ONE["PYL"] = "K";

export const ONE_TO_THREE: Record<string, string> = Object.fromEntries(
  Object.values(AA).map((a) => [a.one, a.three])
);

export function aaInfo(letter: string): AAInfo | undefined {
  return AA[letter.toUpperCase()];
}

export function classOf(letter: string): AAClass | "unknown" {
  return AA[letter.toUpperCase()]?.class ?? "unknown";
}

// Warm palette colors per AA class — used in sequence viewer
export const AA_CLASS_COLOR: Record<AAClass, string> = {
  hydrophobic: "var(--color-sandalwood)",
  polar:       "var(--color-sage)",
  positive:    "var(--color-honey)",
  negative:    "var(--color-terracotta)",
  special:     "var(--color-linen)",
  aromatic:    "var(--color-sage-deep)",
};

// =================== BLOSUM62 ===================
// Standard NCBI BLOSUM62 matrix. Indexed by AA letter.
const BLOSUM62_RAW = `
   A  R  N  D  C  Q  E  G  H  I  L  K  M  F  P  S  T  W  Y  V
A  4 -1 -2 -2  0 -1 -1  0 -2 -1 -1 -1 -1 -2 -1  1  0 -3 -2  0
R -1  5  0 -2 -3  1  0 -2  0 -3 -2  2 -1 -3 -2 -1 -1 -3 -2 -3
N -2  0  6  1 -3  0  0  0  1 -3 -3  0 -2 -3 -2  1  0 -4 -2 -3
D -2 -2  1  6 -3  0  2 -1 -1 -3 -4 -1 -3 -3 -1  0 -1 -4 -3 -3
C  0 -3 -3 -3  9 -3 -4 -3 -3 -1 -1 -3 -1 -2 -3 -1 -1 -2 -2 -1
Q -1  1  0  0 -3  5  2 -2  0 -3 -2  1  0 -3 -1  0 -1 -2 -1 -2
E -1  0  0  2 -4  2  5 -2  0 -3 -3  1 -2 -3 -1  0 -1 -3 -2 -2
G  0 -2  0 -1 -3 -2 -2  6 -2 -4 -4 -2 -3 -3 -2  0 -2 -2 -3 -3
H -2  0  1 -1 -3  0  0 -2  8 -3 -3 -1 -2 -1 -2 -1 -2 -2  2 -3
I -1 -3 -3 -3 -1 -3 -3 -4 -3  4  2 -3  1  0 -3 -2 -1 -3 -1  3
L -1 -2 -3 -4 -1 -2 -3 -4 -3  2  4 -2  2  0 -3 -2 -1 -2 -1  1
K -1  2  0 -1 -3  1  1 -2 -1 -3 -2  5 -1 -3 -1  0 -1 -3 -2 -2
M -1 -1 -2 -3 -1  0 -2 -3 -2  1  2 -1  5  0 -2 -1 -1 -1 -1  1
F -2 -3 -3 -3 -2 -3 -3 -3 -1  0  0 -3  0  6 -4 -2 -2  1  3 -1
P -1 -2 -2 -1 -3 -1 -1 -2 -2 -3 -3 -1 -2 -4  7 -1 -1 -4 -3 -2
S  1 -1  1  0 -1  0  0  0 -1 -2 -2  0 -1 -2 -1  4  1 -3 -2 -2
T  0 -1  0 -1 -1 -1 -1 -2 -2 -1 -1 -1 -1 -2 -1  1  5 -2 -2  0
W -3 -3 -4 -4 -2 -2 -3 -2 -2 -3 -2 -3 -1  1 -4 -3 -2 11  2 -3
Y -2 -2 -2 -3 -2 -1 -2 -3  2 -1 -1 -2 -1  3 -3 -2 -2  2  7 -1
V  0 -3 -3 -3 -1 -2 -2 -3 -3  3  1 -2  1 -1 -2 -2  0 -3 -1  4
`.trim();

export const BLOSUM62: Record<string, Record<string, number>> = (() => {
  const lines = BLOSUM62_RAW.split("\n");
  const cols = lines[0].trim().split(/\s+/);
  const m: Record<string, Record<string, number>> = {};
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].trim().split(/\s+/);
    const row = parts[0];
    m[row] = {};
    for (let j = 0; j < cols.length; j++) {
      m[row][cols[j]] = parseInt(parts[j + 1], 10);
    }
  }
  return m;
})();

export function blosum62(a: string, b: string): number {
  return BLOSUM62[a.toUpperCase()]?.[b.toUpperCase()] ?? 0;
}
