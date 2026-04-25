// AlphaFold DB + UniProt extended fetchers.
// All endpoints are public, CORS-enabled.

export interface AlphafoldPrediction {
  uniprotAccession: string;
  uniprotId?: string;
  organismScientificName?: string;
  uniprotDescription?: string;
  uniprotSequence?: string;
  pdbUrl: string;
  cifUrl?: string;
  paeUrl?: string;
  paeImageUrl?: string;
  modelCreatedDate?: string;
  sequenceVersionDate?: string;
  latestVersion?: number;
  modelEntityId?: string;
  fragment?: number;
  gene?: string;
  taxId?: number;
  alphafoldEntryUrl: string;
}

interface AfPredictionResponse {
  entryId?: string;
  uniprotAccession?: string;
  uniprotId?: string;
  uniprotDescription?: string;
  uniprotSequence?: string;
  organismScientificName?: string;
  taxId?: number;
  gene?: string;
  modelCreatedDate?: string;
  sequenceVersionDate?: string;
  latestVersion?: number;
  allVersions?: number[];
  pdbUrl?: string;
  cifUrl?: string;
  paeImageUrl?: string;
  paeDocUrl?: string;
  fragmentEnd?: number;
}

const AF_API = "https://alphafold.ebi.ac.uk/api/prediction";

export async function fetchAlphafoldPrediction(uniprotId: string): Promise<AlphafoldPrediction> {
  const acc = uniprotId.trim().toUpperCase();
  const r = await fetch(`${AF_API}/${acc}`);
  if (!r.ok) throw new Error(`AlphaFold prediction not found for ${acc}`);
  const arr = (await r.json()) as AfPredictionResponse[];
  if (!arr || arr.length === 0) throw new Error(`Empty AlphaFold response for ${acc}`);
  const e = arr[0];
  const version = e.latestVersion ?? 4;
  return {
    uniprotAccession: e.uniprotAccession ?? acc,
    uniprotId: e.uniprotId,
    organismScientificName: e.organismScientificName,
    uniprotDescription: e.uniprotDescription,
    uniprotSequence: e.uniprotSequence,
    pdbUrl: e.pdbUrl ?? `https://alphafold.ebi.ac.uk/files/AF-${acc}-F1-model_v${version}.pdb`,
    cifUrl: e.cifUrl,
    paeUrl: e.paeDocUrl ?? `https://alphafold.ebi.ac.uk/files/AF-${acc}-F1-predicted_aligned_error_v${version}.json`,
    paeImageUrl: e.paeImageUrl,
    modelCreatedDate: e.modelCreatedDate,
    sequenceVersionDate: e.sequenceVersionDate,
    latestVersion: version,
    modelEntityId: e.entryId,
    gene: e.gene,
    taxId: e.taxId,
    alphafoldEntryUrl: `https://alphafold.ebi.ac.uk/entry/${acc}`,
  };
}

export async function fetchAlphafoldPdb(prediction: AlphafoldPrediction): Promise<string> {
  const r = await fetch(prediction.pdbUrl);
  if (!r.ok) throw new Error(`AlphaFold PDB fetch failed: ${r.status}`);
  return r.text();
}

// ---------------- PAE matrix ----------------

export interface PaeMatrix {
  size: number;
  data: number[][]; // [i][j] expected error in Å
  max: number;
}

interface PaeJsonV4 {
  predicted_aligned_error?: number[][];
  pae?: number[][];
  max_predicted_aligned_error?: number;
  // legacy v1
  residue1?: number[];
  residue2?: number[];
  distance?: number[];
}

export async function fetchPaeMatrix(prediction: AlphafoldPrediction): Promise<PaeMatrix | null> {
  if (!prediction.paeUrl) return null;
  try {
    const r = await fetch(prediction.paeUrl);
    if (!r.ok) return null;
    const j = (await r.json()) as PaeJsonV4 | PaeJsonV4[];
    const obj = Array.isArray(j) ? j[0] : j;
    const matrix = obj.predicted_aligned_error ?? obj.pae;
    if (matrix && Array.isArray(matrix) && matrix.length > 0) {
      return {
        size: matrix.length,
        data: matrix as number[][],
        max: obj.max_predicted_aligned_error ?? 30,
      };
    }
    // legacy sparse format
    if (obj.residue1 && obj.residue2 && obj.distance) {
      const n = Math.max(...obj.residue1, ...obj.residue2);
      const data: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
      for (let k = 0; k < obj.distance.length; k++) {
        const i = obj.residue1[k] - 1;
        const j = obj.residue2[k] - 1;
        data[i][j] = obj.distance[k];
      }
      return { size: n, data, max: obj.max_predicted_aligned_error ?? 30 };
    }
    return null;
  } catch {
    return null;
  }
}

// ---------------- pLDDT helpers ----------------

export type PlddtTier = "very-high" | "high" | "low" | "very-low";

export function plddtTier(score: number): PlddtTier {
  if (score >= 90) return "very-high";
  if (score >= 70) return "high";
  if (score >= 50) return "low";
  return "very-low";
}

export const PLDDT_TIER_LABEL: Record<PlddtTier, string> = {
  "very-high": "Very High",
  "high": "High",
  "low": "Low",
  "very-low": "Very Low",
};

export const PLDDT_TIER_COLOR: Record<PlddtTier, string> = {
  "very-high": "#5C8C6A",
  "high": "#7D9B76",
  "low": "#C49A3A",
  "very-low": "#C4614A",
};

export const PLDDT_TIER_RANGE: Record<PlddtTier, string> = {
  "very-high": "pLDDT > 90",
  "high": "90 > pLDDT > 70",
  "low": "70 > pLDDT > 50",
  "very-low": "pLDDT < 50",
};

export function plddtQualityLabel(avg: number): string {
  return PLDDT_TIER_LABEL[plddtTier(avg)];
}

export function plddtDistribution(scores: number[]): Record<PlddtTier, number> {
  const counts: Record<PlddtTier, number> = { "very-high": 0, "high": 0, "low": 0, "very-low": 0 };
  for (const s of scores) counts[plddtTier(s)]++;
  const total = scores.length || 1;
  return {
    "very-high": (counts["very-high"] / total) * 100,
    "high": (counts["high"] / total) * 100,
    "low": (counts["low"] / total) * 100,
    "very-low": (counts["very-low"] / total) * 100,
  };
}

// ---------------- UniProt extended ----------------

export interface UniprotFeature {
  type: string;        // e.g. "Domain", "Active site", "Binding site"
  category: "domain" | "active-site" | "binding-site" | "ptm" | "variant" | "mutagenesis" | "region" | "other";
  description?: string;
  start: number;
  end: number;
  evidenceCount?: number;
}

export interface UniprotFull {
  accession: string;
  uniprotId?: string;
  proteinName?: string;
  alternativeNames?: string[];
  geneName?: string;
  organism?: string;
  organismCommon?: string;
  taxId?: number;
  reviewed: boolean;
  proteinExistence?: string;
  sequenceLength?: number;
  sequenceMass?: number;
  sequence?: string;
  isoformCount?: number;
  function?: string;
  catalyticActivity?: string[];
  subcellular?: string[];
  pathways?: string[];
  diseases?: { id: string; description: string }[];
  ptmTypes: string[];
  features: UniprotFeature[];
  goTerms: { id: string; term: string; aspect: string }[];
  similarProteins?: string[]; // accession list (cluster member ids if available)
  citationDoi?: string;
}

interface UniprotJson {
  primaryAccession?: string;
  uniProtkbId?: string;
  entryType?: string; // "UniProtKB reviewed (Swiss-Prot)" or unreviewed
  proteinDescription?: {
    recommendedName?: { fullName?: { value?: string } };
    alternativeNames?: { fullName?: { value?: string } }[];
  };
  genes?: { geneName?: { value?: string } }[];
  organism?: { scientificName?: string; commonName?: string; taxonId?: number };
  proteinExistence?: string;
  sequence?: { length?: number; molWeight?: number; value?: string };
  comments?: {
    commentType?: string;
    texts?: { value?: string }[];
    reaction?: { name?: string };
    subcellularLocations?: { location?: { value?: string } }[];
    disease?: { diseaseId?: string; description?: string };
    isoforms?: unknown[];
  }[];
  features?: {
    type?: string;
    description?: string;
    location?: { start?: { value?: number }; end?: { value?: number } };
    evidences?: unknown[];
  }[];
  uniProtKBCrossReferences?: {
    database?: string;
    id?: string;
    properties?: { key?: string; value?: string }[];
  }[];
}

function categorizeFeature(type: string): UniprotFeature["category"] {
  const t = type.toLowerCase();
  if (t.includes("domain") || t.includes("region") || t.includes("repeat") || t.includes("motif") || t.includes("zinc finger")) return "domain";
  if (t === "active site") return "active-site";
  if (t === "binding site" || t === "site") return "binding-site";
  if (t === "modified residue" || t === "glycosylation" || t === "lipidation" || t === "disulfide bond" || t === "cross-link") return "ptm";
  if (t === "natural variant") return "variant";
  if (t === "mutagenesis") return "mutagenesis";
  return "other";
}

export async function fetchUniprotFull(accession: string): Promise<UniprotFull | null> {
  try {
    const r = await fetch(`https://rest.uniprot.org/uniprotkb/${accession.toUpperCase()}.json`);
    if (!r.ok) return null;
    const j = (await r.json()) as UniprotJson;

    const out: UniprotFull = {
      accession: j.primaryAccession ?? accession.toUpperCase(),
      uniprotId: j.uniProtkbId,
      proteinName: j.proteinDescription?.recommendedName?.fullName?.value,
      alternativeNames: j.proteinDescription?.alternativeNames
        ?.map((a) => a.fullName?.value)
        .filter((x): x is string => !!x),
      geneName: j.genes?.[0]?.geneName?.value,
      organism: j.organism?.scientificName,
      organismCommon: j.organism?.commonName,
      taxId: j.organism?.taxonId,
      reviewed: (j.entryType ?? "").toLowerCase().includes("reviewed") && !(j.entryType ?? "").toLowerCase().includes("unreviewed"),
      proteinExistence: j.proteinExistence,
      sequenceLength: j.sequence?.length,
      sequenceMass: j.sequence?.molWeight,
      sequence: j.sequence?.value,
      catalyticActivity: [],
      subcellular: [],
      pathways: [],
      diseases: [],
      ptmTypes: [],
      features: [],
      goTerms: [],
    };

    let isoformCount = 1;
    for (const c of j.comments ?? []) {
      if (c.commentType === "FUNCTION" && c.texts?.[0]?.value) out.function = c.texts[0].value;
      else if (c.commentType === "CATALYTIC ACTIVITY" && c.reaction?.name) out.catalyticActivity!.push(c.reaction.name);
      else if (c.commentType === "SUBCELLULAR LOCATION") {
        for (const loc of c.subcellularLocations ?? []) if (loc.location?.value) out.subcellular!.push(loc.location.value);
      } else if (c.commentType === "PATHWAY" && c.texts?.[0]?.value) out.pathways!.push(c.texts[0].value);
      else if (c.commentType === "DISEASE" && c.disease) out.diseases!.push({ id: c.disease.diseaseId ?? "", description: c.disease.description ?? "" });
      else if (c.commentType === "ALTERNATIVE PRODUCTS" && c.isoforms) isoformCount = Math.max(isoformCount, c.isoforms.length);
    }
    out.isoformCount = isoformCount;

    const ptmSet = new Set<string>();
    for (const f of j.features ?? []) {
      const type = f.type ?? "";
      const start = f.location?.start?.value;
      const end = f.location?.end?.value;
      if (start === undefined || end === undefined) continue;
      const cat = categorizeFeature(type);
      if (cat === "ptm") ptmSet.add(type);
      out.features.push({
        type,
        category: cat,
        description: f.description,
        start,
        end,
        evidenceCount: f.evidences?.length,
      });
    }
    out.ptmTypes = Array.from(ptmSet);

    for (const x of j.uniProtKBCrossReferences ?? []) {
      if (x.database === "GO") {
        const term = x.properties?.find((p) => p.key === "GoTerm")?.value;
        if (term && x.id) {
          const aspect = term.startsWith("F:") ? "Molecular Function"
            : term.startsWith("P:") ? "Biological Process"
            : term.startsWith("C:") ? "Cellular Component" : "GO";
          out.goTerms.push({ id: x.id, term: term.slice(2), aspect });
        }
      }
      if (x.database === "PDB" && x.id) {
        // collect first few PDB cross-refs for "Experimental structures" panel
        out.similarProteins = out.similarProteins; // noop placeholder
      }
    }
    return out;
  } catch {
    return null;
  }
}

export interface UniprotPdbXref {
  pdbId: string;
  method?: string;
  resolution?: string;
  chains?: string;
}

export async function fetchUniprotPdbCrossRefs(accession: string): Promise<UniprotPdbXref[]> {
  try {
    const r = await fetch(`https://rest.uniprot.org/uniprotkb/${accession.toUpperCase()}.json`);
    if (!r.ok) return [];
    const j = (await r.json()) as UniprotJson;
    const out: UniprotPdbXref[] = [];
    for (const x of j.uniProtKBCrossReferences ?? []) {
      if (x.database === "PDB" && x.id) {
        const method = x.properties?.find((p) => p.key === "Method")?.value;
        const resolution = x.properties?.find((p) => p.key === "Resolution")?.value;
        const chains = x.properties?.find((p) => p.key === "Chains")?.value;
        out.push({ pdbId: x.id, method, resolution, chains });
      }
    }
    return out;
  } catch {
    return [];
  }
}

// "Similar proteins" — UniRef cluster members
export interface SimilarProtein {
  accession: string;
  name?: string;
  organism?: string;
  identity: number; // 0..1
}

export async function fetchSimilarProteins(accession: string, identity: 50 | 90 = 50): Promise<SimilarProtein[]> {
  try {
    const cluster = `UniRef${identity}_${accession.toUpperCase()}`;
    const r = await fetch(`https://rest.uniprot.org/uniref/${cluster}.json`);
    if (!r.ok) return [];
    const j = (await r.json()) as {
      members?: { memberId?: string; organismName?: string; proteinName?: string; accessions?: string[] }[];
      representativeMember?: { memberId?: string };
    };
    const members = j.members ?? [];
    const id = identity / 100;
    return members
      .map((m) => ({
        accession: m.accessions?.[0] ?? m.memberId ?? "",
        name: m.proteinName,
        organism: m.organismName,
        identity: id,
      }))
      .filter((m) => m.accession && m.accession !== accession.toUpperCase())
      .slice(0, 12);
  } catch {
    return [];
  }
}
