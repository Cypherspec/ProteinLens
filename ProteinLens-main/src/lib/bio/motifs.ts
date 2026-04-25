// Motif and PTM site scanner. Returns ranges with class & description.

export interface MotifHit {
  id: string;
  name: string;
  start: number;       // 1-indexed inclusive
  end: number;         // 1-indexed inclusive
  type: "motif" | "ptm" | "signal" | "active" | "structural";
  color: string;       // CSS var
  description: string;
}

interface RuleDef {
  id: string;
  name: string;
  type: MotifHit["type"];
  color: string;
  description: string;
  pattern: RegExp;       // global flag required
}

const RULES: RuleDef[] = [
  { id: "rgd",    name: "RGD cell attachment",    type: "motif",      color: "var(--color-success)",     description: "Integrin-binding tripeptide; mediates cell adhesion to fibronectin/vitronectin.", pattern: /RGD/g },
  { id: "nls",    name: "Nuclear localization",   type: "signal",     color: "var(--color-terracotta)",  description: "Classical monopartite NLS — directs nuclear import.",                              pattern: /[KR][KR]X[KR]/g },
  { id: "nls2",   name: "Nuclear localization (bipartite)", type: "signal", color: "var(--color-terracotta)", description: "Bipartite NLS recognized by importin-α.",                                            pattern: /[KR]{2}[A-Z]{10,12}[KR]{3}/g },
  { id: "nes",    name: "Nuclear export",         type: "signal",     color: "var(--color-honey)",       description: "Leucine-rich nuclear export signal.",                                                pattern: /L[A-Z]{2,3}L[A-Z]{2,3}LXL/g },
  { id: "ngly",   name: "N-glycosylation",        type: "ptm",        color: "var(--color-linen)",       description: "Asn-X-Ser/Thr — substrate for oligosaccharyl transferase.",                          pattern: /N[^P][ST]/g },
  { id: "phos",   name: "Phosphorylation site",   type: "ptm",        color: "var(--color-honey)",       description: "Predicted Ser/Thr/Tyr phosphorylation site.",                                        pattern: /[ST][A-Z][A-Z][DE]/g },
  { id: "myr",    name: "Myristoylation",         type: "ptm",        color: "var(--color-sandalwood)",  description: "N-terminal Gly required for N-myristoyl transferase.",                                pattern: /^MG[^EDRKHPFYW][^EDRKHPFYW][STAGCN][^P]/g },
  { id: "kdel",   name: "ER retention (KDEL)",    type: "signal",     color: "var(--color-sage-deep)",   description: "C-terminal ER retention signal.",                                                    pattern: /[KH]DEL$/g },
  { id: "skl",    name: "Peroxisomal (SKL)",      type: "signal",     color: "var(--color-sage)",        description: "C-terminal type-1 peroxisomal targeting signal.",                                    pattern: /[SAC][KRH][LM]$/g },
  { id: "zinc",   name: "Zinc finger (C2H2)",     type: "structural", color: "var(--color-honey)",       description: "Classical Cys2-His2 zinc-binding domain.",                                            pattern: /C[A-Z]{2,4}C[A-Z]{3}[YFL][A-Z]{8}H[A-Z]{3,5}H/g },
  { id: "cxxc",   name: "Disulfide / metal CxxC", type: "structural", color: "var(--color-warning)",     description: "Vicinal cysteine pair — disulfide or metal coordination.",                            pattern: /C[A-Z]{2}C/g },
  { id: "leuzip", name: "Leucine zipper",         type: "structural", color: "var(--color-sandalwood-deep)", description: "Heptad leucine repeat — coiled-coil dimerization.",                            pattern: /L[A-Z]{6}L[A-Z]{6}L[A-Z]{6}L/g },
  { id: "wd40",   name: "WD40-like",              type: "structural", color: "var(--color-linen)",       description: "Trp-Asp dipeptide — β-propeller signature.",                                          pattern: /WD[A-Z]{20,40}WD/g },
  { id: "catSer", name: "Catalytic Ser-His-Asp",  type: "active",     color: "var(--color-terracotta)",  description: "Serine protease catalytic triad signature (approximate).",                            pattern: /G[DN]SG[GASC]P/g },
  { id: "ploop",  name: "P-loop / Walker A",      type: "active",     color: "var(--color-terracotta)",  description: "ATP/GTP-binding Walker A motif (G-x(4)-GK-[ST]).",                                    pattern: /G[A-Z]{4}GK[ST]/g },
  { id: "walkerB", name: "Walker B",              type: "active",     color: "var(--color-terracotta)",  description: "Mg-coordinating aspartate of ATPase Walker B motif.",                                pattern: /[ILV]{4}D[ED]/g },
  { id: "deadbox", name: "DEAD-box helicase",     type: "active",     color: "var(--color-terracotta)",  description: "ATP-dependent RNA helicase signature.",                                              pattern: /DEAD/g },
  { id: "egf",    name: "EGF-like",               type: "structural", color: "var(--color-warning)",     description: "Six-cysteine pattern of EGF-like domain.",                                          pattern: /C[A-Z]{3,12}C[A-Z]{3,12}C[A-Z]{1,8}C[A-Z]C[A-Z]{8,16}C/g },
  { id: "rgg",    name: "RGG box",                type: "motif",      color: "var(--color-sage)",        description: "RNA-binding RGG repeats.",                                                          pattern: /(RGG){2,}/g },
  { id: "pest",   name: "PEST sequence",          type: "ptm",        color: "var(--color-sandalwood)",  description: "Pro/Glu/Ser/Thr-rich proteasomal degradation signal.",                              pattern: /[PEST]{8,}/g },
];

export function scanMotifs(seq: string): MotifHit[] {
  const hits: MotifHit[] = [];
  const s = seq.toUpperCase();
  for (const rule of RULES) {
    rule.pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = rule.pattern.exec(s)) !== null) {
      const start = m.index + 1;
      const end = m.index + m[0].length;
      hits.push({
        id: rule.id + "_" + start,
        name: rule.name,
        start,
        end,
        type: rule.type,
        color: rule.color,
        description: rule.description,
      });
      if (m.index === rule.pattern.lastIndex) rule.pattern.lastIndex++;
    }
  }
  return hits.sort((a, b) => a.start - b.start);
}
