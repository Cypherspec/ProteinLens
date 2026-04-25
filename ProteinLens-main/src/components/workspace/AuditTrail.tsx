import { ExternalLink } from "lucide-react";
import type { AlphafoldPrediction } from "@/lib/bio/alphafold";

interface Props {
  prediction: AlphafoldPrediction;
}

export function AuditTrail({ prediction }: Props) {
  return (
    <div className="warm-card p-4 space-y-3">
      <p className="label-eyebrow">Audit trail</p>
      <dl className="space-y-1.5 text-xs">
        <Row label="Model created" value={prediction.modelCreatedDate ?? "—"} />
        <Row label="Sequence version" value={prediction.sequenceVersionDate ?? "—"} />
        <Row label="AlphaFold version" value={`v${prediction.latestVersion ?? 4}`} />
        {prediction.modelEntityId && <Row label="Entry ID" value={prediction.modelEntityId} mono />}
      </dl>
      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border">
        <LinkPill href={prediction.alphafoldEntryUrl} label="AlphaFold DB" />
        <LinkPill href={`https://www.uniprot.org/uniprotkb/${prediction.uniprotAccession}/entry`} label="UniProt" />
      </div>
      <p className="text-[10px] text-faded leading-snug pt-1">
        Citation: <a href="https://doi.org/10.1038/s41586-021-03819-2" target="_blank" rel="noopener noreferrer" className="hover:text-sage underline-offset-2 hover:underline">Jumper et al., 2021 · Nature</a>
      </p>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-faded uppercase tracking-wider text-[9px] font-mono">{label}</dt>
      <dd className={`text-foreground/90 ${mono ? "font-mono text-[10px]" : ""} truncate`}>{value}</dd>
    </div>
  );
}

function LinkPill({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] bg-surface text-foreground/85 hover:bg-card hover:text-foreground border border-border transition-all"
    >
      {label}
      <ExternalLink className="size-2.5" />
    </a>
  );
}
