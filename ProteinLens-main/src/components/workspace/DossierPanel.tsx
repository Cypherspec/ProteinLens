import { useMemo } from "react";
import type { PdbStructure } from "@/lib/bio/pdb";
import type { RcsbEntry, RcsbPolymerEntity, UniprotAnnotations } from "@/lib/bio/rcsb";
import { structureSummary } from "@/lib/bio/pdb";
import {
  molecularWeight, gravy, aliphaticIndex, instabilityIndex, isoelectricPoint,
  extinctionCoefficient, netCharge, aaPercent, predictProteinClass, predictLocalization,
} from "@/lib/bio/properties";
import { aaInfo } from "@/lib/bio/aminoacids";
import { KNOWN_PROTEINS } from "@/lib/bio/dossier";
import { AnimatedNumber } from "./AnimatedNumber";

interface Props {
  pdbId: string;
  structure: PdbStructure;
  entry?: RcsbEntry;
  entity?: RcsbPolymerEntity | null;
  uniprot?: UniprotAnnotations | null;
  selectedChain: string;
}

export function DossierPanel({ pdbId, structure, entry, entity, uniprot, selectedChain }: Props) {
  const chain = structure.chains.find((c) => c.id === selectedChain) ?? structure.chains[0];
  const summary = useMemo(() => structureSummary(structure), [structure]);
  const seq = chain?.sequence ?? "";

  const props = useMemo(() => {
    if (!seq) return null;
    return {
      mw: molecularWeight(seq),
      gravy: gravy(seq),
      aliphatic: aliphaticIndex(seq),
      instability: instabilityIndex(seq),
      pI: isoelectricPoint(seq),
      ext: extinctionCoefficient(seq),
      chargeAt74: netCharge(seq, 7.4),
      composition: aaPercent(seq),
      predicted: predictProteinClass(seq),
      localization: predictLocalization(seq),
    };
  }, [seq]);

  const dossier = KNOWN_PROTEINS[pdbId.toUpperCase()];
  const name = entity?.description ?? entry?.title ?? dossier?.name ?? pdbId;
  const organism = entity?.organism ?? dossier?.organism ?? entry?.organisms?.[0];

  return (
    <div className="space-y-6 stagger">
      {/* Hero */}
      <div>
        <p className="label-eyebrow mb-2">PDB · {pdbId}</p>
        <h2 className="display-italic text-3xl text-foreground leading-tight">{name}</h2>
        {organism && (
          <span className="inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-[11px] bg-accent text-taupe italic">
            {organism}
          </span>
        )}
        {entity?.geneName && (
          <p className="mt-2 text-xs text-faded font-mono">gene · {entity.geneName}</p>
        )}
      </div>

      <div className="hairline" />

      {/* Metrics — 2 col, varied rhythm */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-5">
        <Metric label="Resolution" value={entry?.resolution} suffix=" Å" decimals={2} />
        <Metric label="Method" text={entry?.experimentalMethod?.replace("X-RAY DIFFRACTION", "X-ray").slice(0, 18) ?? "—"} />
        <Metric label="Chains" value={summary.chainCount} />
        <Metric label="Atoms" value={summary.atomCount} />
        <Metric label="MW (kDa)" value={(entry?.molecularWeight ?? props?.mw ?? 0) / 1000} decimals={1} />
        <Metric label="Released" text={entry?.releasedDate ?? "—"} />
      </div>

      <div className="hairline" />

      {/* Secondary structure bar */}
      <div>
        <p className="label-eyebrow mb-2">Secondary structure</p>
        <div className="flex h-3 rounded-full overflow-hidden border border-border">
          <div className="transition-all duration-1000" style={{ width: `${summary.helixPct}%`, background: "#7D9B76" }} />
          <div className="transition-all duration-1000" style={{ width: `${summary.sheetPct}%`, background: "#B5845A" }} />
          <div className="transition-all duration-1000" style={{ width: `${summary.loopPct}%`,  background: "#A89880" }} />
        </div>
        <div className="grid grid-cols-3 gap-2 mt-2 text-[10px] uppercase tracking-wider text-faded">
          <span>Helix · {summary.helixPct.toFixed(0)}%</span>
          <span>Sheet · {summary.sheetPct.toFixed(0)}%</span>
          <span>Loop · {summary.loopPct.toFixed(0)}%</span>
        </div>
      </div>

      {props && (
        <>
          <div className="hairline" />

          {/* Biological intelligence */}
          <div className="space-y-4">
            <p className="label-eyebrow">Biological Intelligence — chain {chain.id}</p>

            {/* pI scale */}
            <PIScale value={props.pI} />

            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <Metric label="GRAVY" value={props.gravy} decimals={2} />
              <Metric label="Aliphatic idx" value={props.aliphatic} decimals={1} />
              <Metric label="Instability" value={props.instability} decimals={1} suffix={props.instability < 40 ? " · stable" : " · unstable"} />
              <Metric label="ε₂₈₀ (M⁻¹cm⁻¹)" value={props.ext.oxidized} />
              <Metric label="Charge @ 7.4" value={props.chargeAt74} decimals={1} />
              <Metric label="Length" value={seq.length} suffix=" aa" />
            </div>

            {/* Composition donut */}
            <CompositionStrip composition={props.composition} />
          </div>

          <div className="hairline" />

          {/* Function intelligence */}
          <div className="space-y-3">
            <p className="label-eyebrow">Function Intelligence</p>
            <PredictionCard label="Predicted class" value={props.predicted.label} confidence={props.predicted.confidence} note={props.predicted.reason} />
            <PredictionCard label="Localization" value={props.localization.label} confidence={props.localization.confidence} note={props.localization.signals.join(" · ") || "no specific signal"} />
          </div>
        </>
      )}

      {uniprot?.function && (
        <>
          <div className="hairline" />
          <div>
            <p className="label-eyebrow mb-2">Function (UniProt {uniprot.accession})</p>
            <p className="text-sm text-foreground/85 leading-relaxed">{uniprot.function}</p>
          </div>
        </>
      )}

      {uniprot && uniprot.goTerms && uniprot.goTerms.length > 0 && (
        <div>
          <p className="label-eyebrow mb-2">Gene ontology</p>
          <div className="flex flex-wrap gap-1.5">
            {uniprot.goTerms.slice(0, 10).map((g) => (
              <span key={g.id} className="px-2 py-0.5 text-[10px] rounded-full bg-surface text-taupe border border-border">
                {g.term}
              </span>
            ))}
          </div>
        </div>
      )}

      {dossier && (
        <>
          <div className="hairline" />
          <div className="rounded-2xl bg-surface border-l-2 border-sage p-4">
            <p className="label-eyebrow mb-2">Field note</p>
            <p className="display-italic text-base text-foreground leading-snug">{dossier.context}</p>
            <p className="mt-3 text-xs text-taupe">{dossier.whyItMatters}</p>
            {dossier.nobel && <p className="mt-2 text-[10px] uppercase tracking-wider text-honey">★ {dossier.nobel}</p>}
          </div>
        </>
      )}
    </div>
  );
}

function Metric({ label, value, text, decimals = 0, suffix = "" }: { label: string; value?: number; text?: string; decimals?: number; suffix?: string }) {
  return (
    <div>
      <p className="label-eyebrow mb-1">{label}</p>
      <p className="font-display text-2xl text-foreground leading-none">
        {typeof value === "number" && Number.isFinite(value) ? (
          <>
            <AnimatedNumber value={value} decimals={decimals} />
            {suffix}
          </>
        ) : (
          <span className="text-foreground/80">{text ?? "—"}</span>
        )}
      </p>
    </div>
  );
}

function PIScale({ value }: { value: number }) {
  const pct = (value / 14) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="label-eyebrow">Isoelectric point</span>
        <span className="font-display text-lg text-foreground">{value.toFixed(2)}</span>
      </div>
      <div className="relative h-2 rounded-full bg-gradient-to-r from-terracotta via-linen to-sage">
        <div className="absolute -top-1 size-4 rounded-full bg-foreground border-2 border-card transition-all duration-700" style={{ left: `${pct}%`, transform: "translateX(-50%)" }} />
      </div>
      <div className="flex justify-between text-[9px] text-faded mt-1 font-mono">
        <span>0</span><span>7</span><span>14</span>
      </div>
    </div>
  );
}

function CompositionStrip({ composition }: { composition: { letter: string; pct: number; count: number }[] }) {
  const grouped: Record<string, number> = { hydrophobic: 0, polar: 0, positive: 0, negative: 0, special: 0, aromatic: 0 };
  for (const c of composition) {
    const cls = aaInfo(c.letter)?.class;
    if (cls) grouped[cls] += c.pct;
  }
  const order: (keyof typeof grouped)[] = ["hydrophobic", "polar", "positive", "negative", "aromatic", "special"];
  const colors: Record<string, string> = {
    hydrophobic: "#B5845A", polar: "#7D9B76", positive: "#C49A3A", negative: "#C4614A", aromatic: "#5C8C6A", special: "#C4A882",
  };
  return (
    <div>
      <p className="label-eyebrow mb-1.5">Composition</p>
      <div className="flex h-2 rounded-full overflow-hidden">
        {order.map((k) => (
          <div key={k} className="transition-all duration-1000" style={{ width: `${grouped[k]}%`, background: colors[k] }} title={`${k} ${grouped[k].toFixed(0)}%`} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-x-2 gap-y-1 mt-2 text-[9px] text-faded">
        {order.map((k) => (
          <div key={k} className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full" style={{ background: colors[k] }} />
            <span className="capitalize">{k} {grouped[k].toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PredictionCard({ label, value, confidence, note }: { label: string; value: string; confidence: number; note: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface/40 px-3 py-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="label-eyebrow">{label}</span>
        <span className="text-[10px] font-mono text-taupe">{(confidence * 100).toFixed(0)}% conf.</span>
      </div>
      <p className="font-display text-base text-foreground mt-0.5">{value}</p>
      <p className="text-[10px] text-faded mt-1 leading-snug">{note}</p>
    </div>
  );
}
