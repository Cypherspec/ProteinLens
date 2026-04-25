// Mutation consequence prediction.

import { aaInfo, blosum62 } from "./aminoacids";

export interface MutationCall {
  chain: string;
  resSeq: number;
  wt: string;
  mut: string;
}

export interface MutationConsequence {
  mut: MutationCall;
  blosum: number;
  dHydropathy: number;
  dCharge: number;
  ssEffect: string;
  conservative: boolean;
  severity: number; // 1..10
  notes: string[];
}

export function predictMutation(call: MutationCall): MutationConsequence {
  const wt = aaInfo(call.wt);
  const mu = aaInfo(call.mut);
  const notes: string[] = [];

  if (!wt || !mu) {
    return {
      mut: call,
      blosum: 0,
      dHydropathy: 0,
      dCharge: 0,
      ssEffect: "unknown",
      conservative: false,
      severity: 5,
      notes: ["Unknown amino acid"],
    };
  }

  const score = blosum62(call.wt, call.mut);
  const dH = mu.hydropathy - wt.hydropathy;
  const dC = mu.charge - wt.charge;

  let ssEffect = "minimal";
  if (call.mut === "P") { ssEffect = "may break α-helix (proline)"; notes.push("Proline introduces a kink, often disrupting α-helices."); }
  else if (call.mut === "G") { ssEffect = "may break β-sheet (glycine)"; notes.push("Glycine has high backbone flexibility — disrupts secondary structure."); }
  else if (call.wt === "C" && call.mut !== "C") { ssEffect = "loss of disulfide"; notes.push("Cysteine loss may disrupt disulfide bond."); }
  else if (call.mut === "C" && call.wt !== "C") { ssEffect = "potential new disulfide"; notes.push("New cysteine — potential aberrant disulfide."); }

  if (Math.abs(dC) >= 1) notes.push(`Net charge change: ${dC > 0 ? "+" : ""}${dC}`);
  if (Math.abs(dH) >= 2.5) notes.push(`Significant hydropathy shift (Δ ${dH.toFixed(1)})`);

  const sameClass = wt.class === mu.class;
  const conservative = score >= 0 && sameClass;

  // Severity: combine BLOSUM (lower = worse), class change, charge & hydropathy
  let severity = 5 - score * 0.7;
  if (!sameClass) severity += 1.5;
  severity += Math.min(Math.abs(dH) * 0.4, 2);
  severity += Math.min(Math.abs(dC) * 1.2, 2);
  if (ssEffect !== "minimal") severity += 1.5;
  severity = Math.max(1, Math.min(10, Math.round(severity)));

  return { mut: call, blosum: score, dHydropathy: dH, dCharge: dC, ssEffect, conservative, severity, notes };
}
