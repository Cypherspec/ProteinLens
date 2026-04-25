import { useState } from "react";
import type { UniprotFull } from "@/lib/bio/alphafold";

interface Props {
  uniprot: UniprotFull;
}

interface Fact {
  key: string;
  label: string;
  value: string;
  detail: string;
  accent?: string;
}

const PE_DETAIL: Record<string, string> = {
  "Evidence at protein level": "Direct experimental evidence — protein has been observed (e.g. mass spec, antibody, crystal).",
  "Evidence at transcript level": "mRNA observed but not the protein itself yet.",
  "Inferred from homology": "Protein presence inferred from related, well-characterized proteins.",
  "Predicted": "Predicted by sequence analysis only — no experimental evidence yet.",
  "Uncertain": "Existence is uncertain or doubtful.",
};

export function QuickFactsStrip({ uniprot }: Props) {
  const [open, setOpen] = useState<string | null>(null);

  const facts: Fact[] = [];
  facts.push({
    key: "review",
    label: uniprot.reviewed ? "Reviewed" : "Unreviewed",
    value: uniprot.reviewed ? "Swiss-Prot" : "TrEMBL",
    detail: uniprot.reviewed
      ? "Swiss-Prot entry — manually annotated and curated by UniProt experts."
      : "TrEMBL entry — automatically annotated, awaiting manual review.",
    accent: uniprot.reviewed ? "var(--color-sage)" : "var(--color-honey)",
  });

  if (uniprot.proteinExistence) {
    facts.push({
      key: "pe",
      label: "Existence",
      value: uniprot.proteinExistence,
      detail: PE_DETAIL[uniprot.proteinExistence] ?? "Evidence level for the protein's existence.",
    });
  }
  if (uniprot.sequenceLength) {
    facts.push({
      key: "len",
      label: "Length",
      value: `${uniprot.sequenceLength} aa`,
      detail: `Sequence is ${uniprot.sequenceLength} amino acid residues long.`,
    });
  }
  if (uniprot.sequenceMass) {
    facts.push({
      key: "mass",
      label: "Mass",
      value: `${(uniprot.sequenceMass / 1000).toFixed(1)} kDa`,
      detail: `Computed monoisotopic mass: ${uniprot.sequenceMass.toLocaleString()} Da.`,
    });
  }
  if (uniprot.isoformCount && uniprot.isoformCount > 1) {
    facts.push({
      key: "iso",
      label: "Isoforms",
      value: String(uniprot.isoformCount),
      detail: `${uniprot.isoformCount} sequence isoforms produced from this gene by alternative splicing or initiation.`,
    });
  }
  if (uniprot.ptmTypes.length > 0) {
    facts.push({
      key: "ptm",
      label: "PTMs",
      value: `${uniprot.ptmTypes.length} type${uniprot.ptmTypes.length > 1 ? "s" : ""}`,
      detail: `Post-translational modifications: ${uniprot.ptmTypes.join(", ")}.`,
    });
  }
  if (uniprot.diseases && uniprot.diseases.length > 0) {
    facts.push({
      key: "dz",
      label: "Disease",
      value: `${uniprot.diseases.length} associated`,
      detail: uniprot.diseases.slice(0, 3).map((d) => d.description).join(" · "),
      accent: "var(--color-terracotta)",
    });
  }

  if (facts.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
        {facts.map((f) => (
          <button
            key={f.key}
            onClick={() => setOpen(open === f.key ? null : f.key)}
            className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] border transition-all font-medium ${
              open === f.key
                ? "bg-card border-sandalwood text-foreground shadow-warm-sm"
                : "bg-surface/60 border-border text-foreground/85 hover:bg-card hover:border-border-strong"
            }`}
            style={f.accent ? { borderLeftColor: f.accent, borderLeftWidth: 2 } : undefined}
          >
            <span className="text-faded uppercase text-[9px] tracking-wider font-mono">{f.label}</span>
            <span className="font-display italic">{f.value}</span>
          </button>
        ))}
      </div>
      {open && (
        <div className="rounded-xl bg-surface/70 border border-border px-3 py-2.5 fade-up">
          <p className="text-xs text-foreground/85 leading-relaxed">
            {facts.find((f) => f.key === open)?.detail}
          </p>
        </div>
      )}
    </div>
  );
}
