// Lightweight PDB parser — extracts residues, chains, secondary structure,
// HETATM ligands, B-factors, and per-atom records sufficient for our analyses.
// Not a replacement for a full PDB parser — but enough for visual + analytical work.

import { THREE_TO_ONE } from "./aminoacids";

export interface PdbAtom {
  serial: number;
  atomName: string;
  altLoc: string;
  resName: string;
  chainID: string;
  resSeq: number;
  iCode: string;
  x: number; y: number; z: number;
  occupancy: number;
  bFactor: number;
  element: string;
  isHetatm: boolean;
}

export interface PdbResidue {
  chainID: string;
  resSeq: number;
  resName: string;
  oneLetter: string;
  ss: "H" | "E" | "C";       // helix, sheet, coil
  bFactorMean: number;
  occupancyMean: number;
  atoms: PdbAtom[];
  isHetatm: boolean;
}

export interface PdbChain {
  id: string;
  residues: PdbResidue[];
  sequence: string;
}

export interface PdbHeterogen {
  hetID: string;
  chainID: string;
  resSeq: number;
  atoms: PdbAtom[];
  centroid: { x: number; y: number; z: number };
  formula: string;
}

export interface PdbStructure {
  header?: string;
  title?: string;
  classification?: string;
  resolution?: number;
  experimentalMethod?: string;
  chains: PdbChain[];
  heterogens: PdbHeterogen[];
  atoms: PdbAtom[];
  modelCount: number;
}

function parseFloatSafe(s: string): number {
  const v = parseFloat(s);
  return Number.isFinite(v) ? v : 0;
}
function parseIntSafe(s: string): number {
  const v = parseInt(s, 10);
  return Number.isFinite(v) ? v : 0;
}

export function parsePdb(text: string): PdbStructure {
  const lines = text.split(/\r?\n/);
  const atoms: PdbAtom[] = [];
  let header = "";
  let title = "";
  let classification = "";
  let resolution: number | undefined;
  let experimentalMethod = "";
  let modelCount = 1;

  // Helix / sheet records
  const helixRanges: { chain: string; start: number; end: number }[] = [];
  const sheetRanges: { chain: string; start: number; end: number }[] = [];

  let modelEnded = false;

  for (const raw of lines) {
    const rec = raw.slice(0, 6).trim();
    if (rec === "HEADER") {
      classification = raw.slice(10, 50).trim();
      header = raw.slice(62, 66).trim();
    } else if (rec === "TITLE") {
      title += " " + raw.slice(10, 80).trim();
    } else if (rec === "EXPDTA") {
      experimentalMethod = raw.slice(10, 79).trim();
    } else if (rec === "REMARK") {
      const num = parseIntSafe(raw.slice(7, 10));
      if (num === 2) {
        const m = raw.match(/RESOLUTION\.\s+([0-9.]+)/);
        if (m) resolution = parseFloat(m[1]);
      }
    } else if (rec === "MODEL") {
      modelCount = Math.max(modelCount, parseIntSafe(raw.slice(10, 14)) || modelCount);
    } else if (rec === "ENDMDL") {
      modelEnded = true; // only keep first model
    } else if (rec === "HELIX") {
      const chain = raw.slice(19, 20).trim();
      const s = parseIntSafe(raw.slice(21, 25));
      const e = parseIntSafe(raw.slice(33, 37));
      if (chain && s && e) helixRanges.push({ chain, start: s, end: e });
    } else if (rec === "SHEET") {
      const chain = raw.slice(21, 22).trim();
      const s = parseIntSafe(raw.slice(22, 26));
      const e = parseIntSafe(raw.slice(33, 37));
      if (chain && s && e) sheetRanges.push({ chain, start: s, end: e });
    } else if ((rec === "ATOM" || rec === "HETATM") && !modelEnded) {
      const atom: PdbAtom = {
        serial:    parseIntSafe(raw.slice(6, 11)),
        atomName:  raw.slice(12, 16).trim(),
        altLoc:    raw.slice(16, 17).trim(),
        resName:   raw.slice(17, 20).trim(),
        chainID:   raw.slice(21, 22).trim() || "A",
        resSeq:    parseIntSafe(raw.slice(22, 26)),
        iCode:     raw.slice(26, 27).trim(),
        x:         parseFloatSafe(raw.slice(30, 38)),
        y:         parseFloatSafe(raw.slice(38, 46)),
        z:         parseFloatSafe(raw.slice(46, 54)),
        occupancy: parseFloatSafe(raw.slice(54, 60)),
        bFactor:   parseFloatSafe(raw.slice(60, 66)),
        element:   raw.slice(76, 78).trim() || raw.slice(12, 14).trim().replace(/[0-9]/g, ""),
        isHetatm:  rec === "HETATM",
      };
      atoms.push(atom);
    }
  }

  // Group residues by chain+resSeq
  type Key = string;
  const byKey: Map<Key, PdbResidue> = new Map();
  for (const a of atoms) {
    if (a.altLoc && a.altLoc !== "A" && a.altLoc !== "") continue;
    const key = `${a.chainID}|${a.resSeq}|${a.iCode}`;
    let res = byKey.get(key);
    if (!res) {
      res = {
        chainID: a.chainID,
        resSeq: a.resSeq,
        resName: a.resName,
        oneLetter: a.isHetatm ? "X" : (THREE_TO_ONE[a.resName] ?? "X"),
        ss: "C",
        bFactorMean: 0,
        occupancyMean: 0,
        atoms: [],
        isHetatm: a.isHetatm,
      };
      byKey.set(key, res);
    }
    res.atoms.push(a);
  }

  // SS assignment from HELIX/SHEET records
  for (const r of byKey.values()) {
    if (r.isHetatm) continue;
    for (const h of helixRanges) {
      if (h.chain === r.chainID && r.resSeq >= h.start && r.resSeq <= h.end) { r.ss = "H"; break; }
    }
    if (r.ss === "C") {
      for (const s of sheetRanges) {
        if (s.chain === r.chainID && r.resSeq >= s.start && r.resSeq <= s.end) { r.ss = "E"; break; }
      }
    }
    let bSum = 0, oSum = 0;
    for (const a of r.atoms) { bSum += a.bFactor; oSum += a.occupancy; }
    r.bFactorMean = r.atoms.length ? bSum / r.atoms.length : 0;
    r.occupancyMean = r.atoms.length ? oSum / r.atoms.length : 0;
  }

  // Group into chains
  const chainMap: Map<string, PdbChain> = new Map();
  const heterogens: PdbHeterogen[] = [];
  const heteroBucket: Map<string, PdbAtom[]> = new Map();

  // Sort residues by chain then resSeq
  const allRes = Array.from(byKey.values()).sort((a, b) =>
    a.chainID.localeCompare(b.chainID) || a.resSeq - b.resSeq
  );

  for (const r of allRes) {
    if (r.isHetatm) {
      const key = `${r.chainID}|${r.resSeq}|${r.resName}`;
      if (!heteroBucket.has(key)) heteroBucket.set(key, []);
      heteroBucket.get(key)!.push(...r.atoms);
      continue;
    }
    let ch = chainMap.get(r.chainID);
    if (!ch) {
      ch = { id: r.chainID, residues: [], sequence: "" };
      chainMap.set(r.chainID, ch);
    }
    ch.residues.push(r);
  }

  for (const ch of chainMap.values()) {
    ch.sequence = ch.residues.map((r) => r.oneLetter).join("");
  }

  // Build heterogens (skip water)
  for (const [key, hAtoms] of heteroBucket) {
    const [chainID, resSeqStr, hetID] = key.split("|");
    if (hetID === "HOH" || hetID === "WAT") continue;
    let cx = 0, cy = 0, cz = 0;
    const counts: Record<string, number> = {};
    for (const a of hAtoms) {
      cx += a.x; cy += a.y; cz += a.z;
      counts[a.element] = (counts[a.element] || 0) + 1;
    }
    const n = hAtoms.length || 1;
    const formula = Object.entries(counts)
      .sort()
      .map(([el, c]) => (c > 1 ? `${el}${c}` : el))
      .join("");
    heterogens.push({
      hetID,
      chainID,
      resSeq: parseInt(resSeqStr, 10),
      atoms: hAtoms,
      centroid: { x: cx / n, y: cy / n, z: cz / n },
      formula,
    });
  }

  return {
    header,
    title: title.trim().replace(/\s+/g, " "),
    classification,
    resolution,
    experimentalMethod: experimentalMethod || (resolution ? "X-RAY DIFFRACTION" : "UNKNOWN"),
    chains: Array.from(chainMap.values()),
    heterogens,
    atoms,
    modelCount,
  };
}

export function structureSummary(s: PdbStructure) {
  const chainCount = s.chains.length;
  const atomCount = s.atoms.length;
  const residueCount = s.chains.reduce((acc, c) => acc + c.residues.length, 0);
  const ligandCount = s.heterogens.length;
  // SS percentages
  let helix = 0, sheet = 0, loop = 0;
  for (const ch of s.chains) {
    for (const r of ch.residues) {
      if (r.ss === "H") helix++;
      else if (r.ss === "E") sheet++;
      else loop++;
    }
  }
  const totalSs = helix + sheet + loop || 1;
  return {
    chainCount,
    atomCount,
    residueCount,
    ligandCount,
    helixPct: (helix / totalSs) * 100,
    sheetPct: (sheet / totalSs) * 100,
    loopPct:  (loop  / totalSs) * 100,
  };
}

// Computes φ/ψ for every residue with N-CA-C neighbors.
export function ramachandran(s: PdbStructure): { chain: string; resSeq: number; resName: string; ss: string; phi: number; psi: number }[] {
  const out: { chain: string; resSeq: number; resName: string; ss: string; phi: number; psi: number }[] = [];
  for (const ch of s.chains) {
    const rs = ch.residues;
    for (let i = 1; i < rs.length - 1; i++) {
      const prev = rs[i - 1];
      const cur = rs[i];
      const next = rs[i + 1];
      const cPrev = prev.atoms.find((a) => a.atomName === "C");
      const n = cur.atoms.find((a) => a.atomName === "N");
      const ca = cur.atoms.find((a) => a.atomName === "CA");
      const c = cur.atoms.find((a) => a.atomName === "C");
      const nNext = next.atoms.find((a) => a.atomName === "N");
      if (!cPrev || !n || !ca || !c || !nNext) continue;
      const phi = dihedral(cPrev, n, ca, c);
      const psi = dihedral(n, ca, c, nNext);
      out.push({ chain: ch.id, resSeq: cur.resSeq, resName: cur.resName, ss: cur.ss, phi, psi });
    }
  }
  return out;
}

function dihedral(a: PdbAtom, b: PdbAtom, c: PdbAtom, d: PdbAtom): number {
  const v = (p: PdbAtom, q: PdbAtom) => [q.x - p.x, q.y - p.y, q.z - p.z];
  const cross = (u: number[], w: number[]) => [
    u[1] * w[2] - u[2] * w[1],
    u[2] * w[0] - u[0] * w[2],
    u[0] * w[1] - u[1] * w[0],
  ];
  const dot = (u: number[], w: number[]) => u[0] * w[0] + u[1] * w[1] + u[2] * w[2];
  const norm = (u: number[]) => Math.sqrt(dot(u, u));

  const b1 = v(a, b);
  const b2 = v(b, c);
  const b3 = v(c, d);
  const n1 = cross(b1, b2);
  const n2 = cross(b2, b3);
  const m1 = cross(n1, b2.map((x) => x / norm(b2)));
  const x = dot(n1, n2);
  const y = dot(m1, n2);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

// Approximate per-residue solvent accessibility (CA-based proxy:
// fewer Cα neighbors within 10Å = more exposed).
export function approximateSasa(s: PdbStructure): Map<string, number> {
  const out = new Map<string, number>();
  const cas: { chain: string; res: number; x: number; y: number; z: number }[] = [];
  for (const ch of s.chains) {
    for (const r of ch.residues) {
      const ca = r.atoms.find((a) => a.atomName === "CA");
      if (ca) cas.push({ chain: ch.id, res: r.resSeq, x: ca.x, y: ca.y, z: ca.z });
    }
  }
  const R2 = 10 * 10;
  for (let i = 0; i < cas.length; i++) {
    let neighbors = 0;
    for (let j = 0; j < cas.length; j++) {
      if (i === j) continue;
      const dx = cas[i].x - cas[j].x;
      const dy = cas[i].y - cas[j].y;
      const dz = cas[i].z - cas[j].z;
      if (dx * dx + dy * dy + dz * dz <= R2) neighbors++;
    }
    // 0..1 score: more neighbors = more buried → invert
    const exposure = Math.max(0, 1 - neighbors / 18);
    out.set(`${cas[i].chain}|${cas[i].res}`, exposure);
  }
  return out;
}

// Atom contacts within `dist` Å between selA and selB (returns pairs).
export function findContacts(
  s: PdbStructure,
  isA: (a: PdbAtom) => boolean,
  isB: (a: PdbAtom) => boolean,
  dist = 4.0
): { a: PdbAtom; b: PdbAtom; d: number }[] {
  const aSet = s.atoms.filter(isA);
  const bSet = s.atoms.filter(isB);
  const out: { a: PdbAtom; b: PdbAtom; d: number }[] = [];
  const d2 = dist * dist;
  for (const a of aSet) {
    for (const b of bSet) {
      const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
      const sq = dx * dx + dy * dy + dz * dz;
      if (sq <= d2) out.push({ a, b, d: Math.sqrt(sq) });
    }
  }
  return out;
}
