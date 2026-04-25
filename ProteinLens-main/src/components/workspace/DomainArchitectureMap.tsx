import { useMemo, useState } from "react";
import type { UniprotFeature } from "@/lib/bio/alphafold";

interface Props {
  totalLength: number;
  features?: UniprotFeature[];
  plddtScores?: number[]; // for disordered region detection
  onZoom?: (start: number, end: number) => void;
}

const PALETTE = ["#7D9B76", "#B5845A", "#C4A882", "#5C8C6A", "#9B7853", "#C49A3A", "#8DAF86"];

export function DomainArchitectureMap({ totalLength, features, plddtScores, onZoom }: Props) {
  const domains = useMemo(() => {
    const list = (features ?? []).filter((f) => f.category === "domain" || f.category === "region");
    return list.slice(0, 24);
  }, [features]);

  const disorderedRanges = useMemo(() => {
    if (!plddtScores) return [];
    const ranges: { start: number; end: number }[] = [];
    let cur: { start: number; end: number } | null = null;
    for (let i = 0; i < plddtScores.length; i++) {
      if (plddtScores[i] < 50) {
        if (!cur) cur = { start: i + 1, end: i + 1 };
        else cur.end = i + 1;
      } else {
        if (cur && cur.end - cur.start >= 4) ranges.push(cur);
        cur = null;
      }
    }
    if (cur && cur.end - cur.start >= 4) ranges.push(cur);
    return ranges;
  }, [plddtScores]);

  const [hover, setHover] = useState<UniprotFeature | null>(null);

  if (totalLength <= 0) return null;

  return (
    <div className="warm-card p-4 space-y-3">
      <div className="flex items-baseline justify-between">
        <p className="label-eyebrow">Domain architecture</p>
        <span className="text-[10px] text-faded font-mono">1 – {totalLength}</span>
      </div>

      <div className="relative h-10">
        {/* Backbone */}
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1.5 rounded-full bg-surface border border-border" />

        {/* Disordered dashed segments */}
        {disorderedRanges.map((r, i) => {
          const left = ((r.start - 1) / totalLength) * 100;
          const width = ((r.end - r.start + 1) / totalLength) * 100;
          return (
            <div
              key={`d-${i}`}
              className="absolute top-1/2 -translate-y-1/2 h-0.5"
              style={{
                left: `${left}%`,
                width: `${width}%`,
                backgroundImage: "repeating-linear-gradient(90deg, var(--color-faded) 0 4px, transparent 4px 8px)",
              }}
              title={`Likely disordered: ${r.start}–${r.end}`}
            />
          );
        })}

        {/* Domain blocks */}
        {domains.map((d, i) => {
          const left = ((d.start - 1) / totalLength) * 100;
          const width = ((d.end - d.start + 1) / totalLength) * 100;
          const color = PALETTE[i % PALETTE.length];
          const minLabelPct = 8;
          return (
            <button
              key={`${d.start}-${d.end}-${i}`}
              onClick={() => onZoom?.(d.start, d.end)}
              onMouseEnter={() => setHover(d)}
              onMouseLeave={() => setHover(null)}
              className="absolute top-1/2 -translate-y-1/2 h-7 rounded-md flex items-center justify-center text-[10px] font-medium px-1.5 transition-all hover:scale-y-110 hover:shadow-warm-lg overflow-hidden"
              style={{
                left: `${left}%`,
                width: `${width}%`,
                background: color,
                color: "#2C2416",
                minWidth: 4,
              }}
              title={`${d.type}: ${d.description ?? ""} · ${d.start}–${d.end}`}
            >
              {width > minLabelPct && (
                <span className="truncate">{(d.description ?? d.type).slice(0, 22)}</span>
              )}
            </button>
          );
        })}
      </div>

      {hover && (
        <div className="rounded-lg bg-surface px-3 py-2 fade-up">
          <p className="text-xs text-foreground/90">
            <span className="font-mono text-taupe">{hover.start}–{hover.end}</span> · <span className="font-display italic">{hover.type}</span>
            {hover.description && <span className="text-foreground/70"> — {hover.description}</span>}
          </p>
        </div>
      )}

      {domains.length === 0 && (!disorderedRanges || disorderedRanges.length === 0) && (
        <p className="text-xs text-faded italic">No annotated domains. Load a UniProt-linked structure for richer architecture.</p>
      )}
    </div>
  );
}
