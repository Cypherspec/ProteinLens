// RCSB PDB and AlphaFold data fetchers.
// All endpoints are public CORS-enabled — no proxy needed.

export interface RcsbEntry {
  pdbId: string;
  title: string;
  classification?: string;
  resolution?: number;
  experimentalMethod?: string;
  releasedDate?: string;
  depositedDate?: string;
  authors?: string[];
  citation?: { title: string; journal: string; year: number; doi?: string; authors: string[] };
  organisms?: string[];
  molecularWeight?: number;
  rFree?: number;
  rWork?: number;
  clashscore?: number;
  ramaOutliersPct?: number;
  rotamerOutliersPct?: number;
  rsrzOutliersPct?: number;
  uniprotAccession?: string;
}

const RCSB_BASE = "https://data.rcsb.org/rest/v1/core";
const PDB_FILES = "https://files.rcsb.org/download";

export async function fetchPdbFile(pdbId: string): Promise<string> {
  const id = pdbId.trim().toUpperCase();
  if (id.startsWith("AF_")) {
    const acc = id.slice(3);
    const url = `https://alphafold.ebi.ac.uk/files/AF-${acc}-F1-model_v4.pdb`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`AlphaFold ${acc} not found`);
    return r.text();
  }
  const r = await fetch(`${PDB_FILES}/${id}.pdb`);
  if (!r.ok) throw new Error(`PDB ${id} not found`);
  return r.text();
}

interface RcsbCoreEntryResponse {
  rcsb_id?: string;
  struct?: { title?: string; pdbx_descriptor?: string };
  struct_keywords?: { pdbx_keywords?: string };
  rcsb_entry_info?: {
    resolution_combined?: number[];
    experimental_method?: string;
    molecular_weight?: number;
    deposited_atom_count?: number;
    deposited_polymer_monomer_count?: number;
    polymer_entity_count_protein?: number;
    nonpolymer_entity_count?: number;
  };
  rcsb_accession_info?: {
    initial_release_date?: string;
    deposit_date?: string;
  };
  exptl?: { method?: string }[];
  refine?: { ls_R_factor_R_free?: number; ls_R_factor_R_work?: number }[];
  audit_author?: { name: string }[];
  citation?: { title?: string; journal_abbrev?: string; year?: number; pdbx_database_id_DOI?: string; rcsb_authors?: string[] }[];
  pdbx_vrpt_summary?: {
    clashscore?: number;
    percent_ramachandran_outliers?: number;
    percent_rotamer_outliers?: number;
    percent_RSRZ_outliers?: number;
  };
}

export async function fetchEntryMetadata(pdbId: string): Promise<RcsbEntry> {
  const id = pdbId.trim().toUpperCase();
  if (id.startsWith("AF_")) {
    return {
      pdbId: id,
      title: `AlphaFold model — ${id.slice(3)}`,
      experimentalMethod: "PREDICTED (AlphaFold v4)",
      releasedDate: undefined,
      organisms: [],
    };
  }
  const r = await fetch(`${RCSB_BASE}/entry/${id}`);
  if (!r.ok) throw new Error(`Metadata not available for ${id}`);
  const j = (await r.json()) as RcsbCoreEntryResponse;

  return {
    pdbId: id,
    title: j.struct?.title ?? j.struct?.pdbx_descriptor ?? id,
    classification: j.struct_keywords?.pdbx_keywords,
    resolution: j.rcsb_entry_info?.resolution_combined?.[0],
    experimentalMethod: j.exptl?.[0]?.method ?? j.rcsb_entry_info?.experimental_method,
    releasedDate: j.rcsb_accession_info?.initial_release_date?.slice(0, 10),
    depositedDate: j.rcsb_accession_info?.deposit_date?.slice(0, 10),
    authors: j.audit_author?.map((a) => a.name),
    citation: j.citation?.[0]
      ? {
          title: j.citation[0].title ?? "",
          journal: j.citation[0].journal_abbrev ?? "",
          year: j.citation[0].year ?? 0,
          doi: j.citation[0].pdbx_database_id_DOI,
          authors: j.citation[0].rcsb_authors ?? [],
        }
      : undefined,
    molecularWeight: j.rcsb_entry_info?.molecular_weight,
    rFree: j.refine?.[0]?.ls_R_factor_R_free,
    rWork: j.refine?.[0]?.ls_R_factor_R_work,
    clashscore: j.pdbx_vrpt_summary?.clashscore,
    ramaOutliersPct: j.pdbx_vrpt_summary?.percent_ramachandran_outliers,
    rotamerOutliersPct: j.pdbx_vrpt_summary?.percent_rotamer_outliers,
    rsrzOutliersPct: j.pdbx_vrpt_summary?.percent_RSRZ_outliers,
  };
}

export interface RcsbPolymerEntity {
  organism?: string;
  geneName?: string;
  uniprotAccession?: string;
  description?: string;
}

interface RcsbPolymerEntityResponse {
  entity_src_gen?: { pdbx_gene_src_scientific_name?: string; pdbx_gene_src_gene?: string }[];
  rcsb_entity_source_organism?: { scientific_name?: string; ncbi_scientific_name?: string }[];
  rcsb_polymer_entity?: { pdbx_description?: string };
  rcsb_polymer_entity_container_identifiers?: {
    reference_sequence_identifiers?: { database_accession?: string; database_name?: string }[];
  };
}

export async function fetchPolymerEntity(pdbId: string, entityId = "1"): Promise<RcsbPolymerEntity | null> {
  const id = pdbId.trim().toUpperCase();
  if (id.startsWith("AF_")) return null;
  try {
    const r = await fetch(`${RCSB_BASE}/polymer_entity/${id}/${entityId}`);
    if (!r.ok) return null;
    const j = (await r.json()) as RcsbPolymerEntityResponse;
    const refs = j.rcsb_polymer_entity_container_identifiers?.reference_sequence_identifiers;
    const uniprot = refs?.find((x) => x.database_name === "UniProt")?.database_accession;
    return {
      organism:
        j.rcsb_entity_source_organism?.[0]?.scientific_name ??
        j.rcsb_entity_source_organism?.[0]?.ncbi_scientific_name ??
        j.entity_src_gen?.[0]?.pdbx_gene_src_scientific_name,
      geneName: j.entity_src_gen?.[0]?.pdbx_gene_src_gene,
      description: j.rcsb_polymer_entity?.pdbx_description,
      uniprotAccession: uniprot,
    };
  } catch {
    return null;
  }
}

export interface UniprotAnnotations {
  accession: string;
  proteinName?: string;
  function?: string;
  catalyticActivity?: string[];
  subcellular?: string[];
  pathways?: string[];
  diseases?: string[];
  goTerms?: { id: string; term: string; aspect: string }[];
}

interface UniprotResponse {
  primaryAccession?: string;
  proteinDescription?: { recommendedName?: { fullName?: { value?: string } } };
  comments?: {
    commentType?: string;
    texts?: { value?: string }[];
    reaction?: { name?: string };
    subcellularLocations?: { location?: { value?: string } }[];
    disease?: { diseaseId?: string; description?: string };
  }[];
  uniProtKBCrossReferences?: { database?: string; id?: string; properties?: { key?: string; value?: string }[] }[];
}

export async function fetchUniprot(accession: string): Promise<UniprotAnnotations | null> {
  try {
    const r = await fetch(`https://rest.uniprot.org/uniprotkb/${accession}.json`);
    if (!r.ok) return null;
    const j = (await r.json()) as UniprotResponse;
    const out: UniprotAnnotations = {
      accession,
      proteinName: j.proteinDescription?.recommendedName?.fullName?.value,
      catalyticActivity: [],
      subcellular: [],
      pathways: [],
      diseases: [],
      goTerms: [],
    };
    for (const c of j.comments ?? []) {
      if (c.commentType === "FUNCTION" && c.texts?.[0]?.value) {
        out.function = c.texts[0].value;
      } else if (c.commentType === "CATALYTIC ACTIVITY" && c.reaction?.name) {
        out.catalyticActivity!.push(c.reaction.name);
      } else if (c.commentType === "SUBCELLULAR LOCATION") {
        for (const loc of c.subcellularLocations ?? []) {
          if (loc.location?.value) out.subcellular!.push(loc.location.value);
        }
      } else if (c.commentType === "PATHWAY" && c.texts?.[0]?.value) {
        out.pathways!.push(c.texts[0].value);
      } else if (c.commentType === "DISEASE" && c.disease?.description) {
        out.diseases!.push(`${c.disease.diseaseId ?? ""}: ${c.disease.description}`);
      }
    }
    for (const x of j.uniProtKBCrossReferences ?? []) {
      if (x.database === "GO") {
        const term = x.properties?.find((p) => p.key === "GoTerm")?.value;
        if (term && x.id) {
          const aspect = term.startsWith("F:") ? "Molecular Function"
            : term.startsWith("P:") ? "Biological Process"
            : term.startsWith("C:") ? "Cellular Component" : "GO";
          out.goTerms!.push({ id: x.id, term: term.slice(2), aspect });
        }
      }
    }
    return out;
  } catch {
    return null;
  }
}
