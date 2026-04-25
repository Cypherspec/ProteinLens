import { useMemo } from "react";
import {
  PLDDT_TIER_COLOR,
  PLDDT_TIER_LABEL,
  PLDDT_TIER_RANGE,
  plddtDistribution,
  plddtQualityLabel,
  type PlddtTier,
} from "@/lib/bio/alphafold";
import { AnimatedNumber } from "./AnimatedNumber";

interface Props {
  scores: number[];
  compact?: boolean;
}

const TIERS: PlddtTier[] = ["very-high", "high", "low", "very-low"];

export function ModelConfidencePanel({ scores, compact }: Props) {
  const stats = useMemo(() => {
    if (scores.length === 0) return null;
    const sum = scores.reduce((a, b) => a + b, 0);
    const avg = sum / scores.length;
    const dist = plddtDistribution(scores);
    return { avg, dist };
  }, [scores]);

  if (!stats) return null;
  const qualityColor = PLDDT_TIER_COLOR[plddtTierFromAvg(stats.avg)];

  return (
    <div className={`warm-card p-4 space-y-4 ${compact ? "" : "lift-on-hover"}`}>
      <div className="flex items-baseline justify-between">
        <p className="label-eyebrow">Model Confidence</p>
        <span className="text-[10px] font-mono text-faded">pLDDT</span>
      </div>

      {/* Hero average */}
      <div className="flex items-baseline gap-3">
        <p className="font-display text-5xl leading-none" style={{ color: qualityColor }}>
          <AnimatedNumber value={stats.avg} decimals={1} />
        </p>
        <div>
          <p className="font-display italic text-base" style={{ color: qualityColor }}>
            {plddtQualityLabel(stats.avg)}
          </p>
          <p className="text-[10px] text-faded font-mono uppercase tracking-wider">avg over {scores.length} residues</p>
        </div>
      </div>

      {/* Stacked distribution bar */}
      <div>
        <div className="flex h-3 rounded-full overflow-hidden border border-border">
          {TIERS.map((t) => (
            <div
              key={t}
              className="transition-all duration-1000"
              style={{ width: `${stats.dist[t]}%`, background: PLDDT_TIER_COLOR[t] }}
              title={`${PLDDT_TIER_LABEL[t]}: ${stats.dist[t].toFixed(1)}%`}
            />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-2.5 text-[10px]">
          {TIERS.map((t) => (
            <div key={t} className="flex items-center gap-1.5">
              <span className="size-2 rounded-sm shrink-0" style={{ background: PLDDT_TIER_COLOR[t] }} />
              <span className="text-foreground/85 font-mono">{stats.dist[t].toFixed(0)}%</span>
              <span className="text-faded truncate">{PLDDT_TIER_LABEL[t]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Legend block */}
      {!compact && (
        <div className="space-y-1.5 pt-2 border-t border-border">
          <p className="label-eyebrow">Legend</p>
          {TIERS.map((t) => (
            <div key={t} className="flex items-center gap-2 text-[11px]">
              <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: PLDDT_TIER_COLOR[t] }} />
              <span className="text-foreground/85">{PLDDT_TIER_LABEL[t]}</span>
              <span className="text-faded font-mono ml-auto">{PLDDT_TIER_RANGE[t]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function plddtTierFromAvg(avg: number): PlddtTier {
  if (avg >= 90) return "very-high";
  if (avg >= 70) return "high";
  if (avg >= 50) return "low";
  return "very-low";
}
