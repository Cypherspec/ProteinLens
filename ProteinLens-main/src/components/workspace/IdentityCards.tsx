import { ExternalLink } from "lucide-react";
import type { UniprotFull, UniprotPdbXref } from "@/lib/bio/alphafold";
import type { RcsbEntry } from "@/lib/bio/rcsb";

interface Props {
  uniprot?: UniprotFull | null;
  pdbXrefs?: UniprotPdbXref[];
  fallbackName?: string;
  fallbackOrganism?: string;
  fallbackUniprotAccession?: string;
  isAlphafold: boolean;
  experimentalEntry?: RcsbEntry;
}

export function IdentityCards({ uniprot, pdbXrefs, fallbackName, fallbackOrganism, fallbackUniprotAccession, isAlphafold, experimentalEntry }: Props) {
  const proteinName = uniprot?.proteinName ?? fallbackName ?? "—";
  const gene = uniprot?.geneName ?? "—";
  const organism = uniprot?.organism ?? fallbackOrganism ?? "—";
  const accession = uniprot?.accession ?? fallbackUniprotAccession;

  return (
    <div className="warm-card p-5">
      <p className="label-eyebrow mb-4">Protein Identity</p>
      <div className="grid md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
        <Row label="Protein">
          <span className="font-display text-base text-foreground leading-snug">{proteinName}</span>
          {uniprot?.alternativeNames && uniprot.alternativeNames.length > 0 && (
            <p className="text-[10px] text-faded mt-1 italic">also: {uniprot.alternativeNames.slice(0, 2).join(", ")}</p>
          )}
        </Row>
        <Row label="Gene"><span className="font-mono text-foreground">{gene}</span></Row>

        <Row label="Source organism">
          <span className="italic text-foreground">{organism}</span>
          {uniprot?.organismCommon && <span className="ml-1.5 text-faded text-xs">({uniprot.organismCommon})</span>}
        </Row>
        <Row label="UniProt ID">
          {accession ? (
            <a
              href={`https://www.uniprot.org/uniprotkb/${accession}/entry`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-foreground hover:text-sage inline-flex items-center gap-1"
            >
              {accession}
              <ExternalLink className="size-3" />
            </a>
          ) : <span className="text-faded">—</span>}
        </Row>

        <div className="md:col-span-2">
          <p className="label-eyebrow mb-1.5">Biological function</p>
          {uniprot?.function ? (
            <p className="text-sm text-foreground/90 leading-relaxed">{uniprot.function}</p>
          ) : (
            <p className="text-sm text-faded italic">No UniProt function annotation available.</p>
          )}
          {uniprot?.catalyticActivity && uniprot.catalyticActivity.length > 0 && (
            <div className="mt-3 space-y-1">
              <p className="label-eyebrow">Catalytic activity</p>
              {uniprot.catalyticActivity.slice(0, 3).map((c, i) => (
                <p key={i} className="text-xs font-mono text-foreground/85 bg-surface px-2.5 py-1.5 rounded-md leading-snug">{c}</p>
              ))}
            </div>
          )}
        </div>

        <div className="md:col-span-2 pt-2 border-t border-border">
          <p className="label-eyebrow mb-1.5">Experimental structures</p>
          {isAlphafold ? (
            pdbXrefs && pdbXrefs.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {pdbXrefs.slice(0, 12).map((p) => (
                  <a
                    key={p.pdbId}
                    href={`https://www.rcsb.org/structure/${p.pdbId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-0.5 text-[11px] rounded-full bg-card border border-border hover:border-sage hover:text-sage transition-all font-mono"
                    title={`${p.method ?? ""} ${p.resolution ?? ""}`}
                  >
                    {p.pdbId}
                  </a>
                ))}
                {pdbXrefs.length > 12 && (
                  <span className="px-2 py-0.5 text-[11px] text-faded">+{pdbXrefs.length - 12} more</span>
                )}
              </div>
            ) : (
              <p className="text-xs text-faded italic">None available in the PDB</p>
            )
          ) : (
            <p className="text-xs text-foreground/85">
              {experimentalEntry?.experimentalMethod ?? "Experimental structure"} 
              {experimentalEntry?.resolution !== undefined && ` · ${experimentalEntry.resolution.toFixed(2)} Å resolution`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="label-eyebrow mb-1">{label}</p>
      <div>{children}</div>
    </div>
  );
}
