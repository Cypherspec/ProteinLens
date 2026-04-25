import { useMemo, useState } from "react";
import type { PdbStructure, PdbChain } from "@/lib/bio/pdb";
import { aaInfo, AA_CLASS_COLOR } from "@/lib/bio/aminoacids";
import { hydropathyWindow } from "@/lib/bio/properties";
import { conservationProfile } from "@/lib/bio/conservation";
import { scanMotifs, type MotifHit } from "@/lib/bio/motifs";

interface Props {
  structure: PdbStructure;
  selectedChain: string;
  hoveredResidue?: { chain: string; resSeq: number } | null;
  onHover?: (h: { chain: string; resSeq: number } | null) => void;
  onSelect?: (h: { chain: string; resSeq: number }) => void;
  mutationResidues: { chain: string; resSeq: number; mut: string }[];
}

const TRACK_TOGGLES = [
  { id: "ruler",   label: "Ruler" },
  { id: "ss",      label: "Secondary structure" },
  { id: "bfactor", label: "B-factor" },
  { id: "occ",     label: "Occupancy" },
  { id: "hydro",   label: "Hydropathy" },
  { id: "cons",    label: "Conservation" },
  { id: "buried",  label: "Buried (CA-proxy)" },
  { id: "motifs",  label: "Motifs & PTMs" },
  { id: "ligands", label: "Ligand contacts" },
  { id: "muts",    label: "Mutations" },
] as const;

type TrackId = (typeof TRACK_TOGGLES)[number]["id"];

export function SequenceViewer({ structure, selectedChain, hoveredResidue, onHover, onSelect, mutationResidues }: Props) {
  const chain = structure.chains.find((c) => c.id === selectedChain) ?? structure.chains[0];
  const [zoom, setZoom] = useState(14); // px per residue
  const [enabledTracks, setEnabledTracks] = useState<Record<TrackId, boolean>>({
    ruler: true, ss: true, bfactor: true, occ: false, hydro: true, cons: true, buried: false, motifs: true, ligands: true, muts: true,
  });

  const data = useMemo(() => buildTrackData(chain, structure, mutationResidues), [chain, structure, mutationResidues]);

  const toggle = (id: TrackId) => setEnabledTracks((s) => ({ ...s, [id]: !s[id] }));

  const seqWidth = chain.sequence.length * zoom;

  return (
    <div className="warm-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-baseline gap-3">
          <h3 className="font-display text-xl text-foreground">Sequence atlas</h3>
          <span className="label-eyebrow">{chain.id} · {chain.sequence.length} residues</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="label-eyebrow">Zoom</span>
          <input
            type="range"
            min={6}
            max={28}
            value={zoom}
            onChange={(e) => setZoom(parseInt(e.target.value, 10))}
            className="w-32 accent-primary"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {TRACK_TOGGLES.map((t) => (
          <button
            key={t.id}
            onClick={() => toggle(t.id)}
            className={`px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-medium transition-all duration-200 ${
              enabledTracks[t.id]
                ? "bg-primary text-primary-foreground"
                : "bg-surface text-taupe hover:bg-accent"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto pb-2">
        <div style={{ width: Math.max(seqWidth + 8, 600) }} className="space-y-1.5">
          {/* Ruler */}
          {enabledTracks.ruler && (
            <div className="relative h-4 text-[9px] font-mono text-faded">
              {Array.from({ length: Math.ceil(chain.sequence.length / 10) + 1 }).map((_, i) => (
                <div key={i} className="absolute" style={{ left: i * 10 * zoom, transform: "translateX(-50%)" }}>
                  {(i * 10) || 1}
                </div>
              ))}
            </div>
          )}

          {/* Secondary structure */}
          {enabledTracks.ss && (
            <div className="relative h-4">
              {chain.residues.map((r, idx) => {
                const color = r.ss === "H" ? "#7D9B76" : r.ss === "E" ? "#B5845A" : "transparent";
                const h = r.ss === "H" ? 12 : r.ss === "E" ? 8 : 2;
                return (
                  <div
                    key={idx}
                    className="absolute top-1/2 -translate-y-1/2 rounded-sm"
                    style={{
                      left: idx * zoom,
                      width: zoom - 1,
                      height: h,
                      background: r.ss === "C" ? "var(--color-faded)" : color,
                      opacity: r.ss === "C" ? 0.4 : 1,
                    }}
                    title={`${r.resName} ${r.resSeq} · ${r.ss === "H" ? "Helix" : r.ss === "E" ? "Strand" : "Loop"}`}
                  />
                );
              })}
            </div>
          )}

          {/* Sequence row */}
          <div className="relative" style={{ height: zoom + 6 }}>
            {chain.residues.map((r, idx) => {
              const info = aaInfo(r.oneLetter);
              const cls = info?.class ?? "polar";
              const isHover = hoveredResidue?.chain === chain.id && hoveredResidue?.resSeq === r.resSeq;
              const isMut = mutationResidues.some((m) => m.chain === chain.id && m.resSeq === r.resSeq);
              return (
                <div
                  key={idx}
                  onMouseEnter={() => onHover?.({ chain: chain.id, resSeq: r.resSeq })}
                  onMouseLeave={() => onHover?.(null)}
                  onClick={() => onSelect?.({ chain: chain.id, resSeq: r.resSeq })}
                  className="absolute cursor-pointer flex items-center justify-center font-mono font-medium rounded-[3px] transition-all duration-150"
                  style={{
                    left: idx * zoom,
                    width: zoom - 1,
                    height: zoom + 4,
                    fontSize: Math.max(8, zoom - 6),
                    background: isMut ? "#C4614A" : AA_CLASS_COLOR[cls],
                    color: isMut ? "#FAF7F2" : "#2C2416",
                    opacity: isHover ? 1 : 0.85,
                    transform: isHover ? "scale(1.15)" : "scale(1)",
                    zIndex: isHover ? 5 : 1,
                  }}
                  title={`${r.resName} ${r.resSeq}${isMut ? " (mutated)" : ""}`}
                >
                  {zoom > 9 ? r.oneLetter : ""}
                </div>
              );
            })}
          </div>

          {/* Hydropathy wave */}
          {enabledTracks.hydro && (
            <div className="relative h-7 mt-1">
              <HydropathyWave seq={chain.sequence} zoom={zoom} />
            </div>
          )}

          {/* B-factor bars */}
          {enabledTracks.bfactor && (
            <div className="relative h-6 mt-1">
              <BFactorBars residues={chain.residues} zoom={zoom} />
            </div>
          )}

          {/* Occupancy */}
          {enabledTracks.occ && (
            <div className="relative h-3 mt-1">
              {chain.residues.map((r, idx) => (
                <div
                  key={idx}
                  className="absolute bottom-0"
                  style={{
                    left: idx * zoom,
                    width: zoom - 1,
                    height: `${(r.occupancyMean || 0) * 100}%`,
                    background: "var(--color-sage)",
                    opacity: 0.75,
                  }}
                />
              ))}
            </div>
          )}

          {/* Conservation */}
          {enabledTracks.cons && (
            <div className="relative h-4 mt-1">
              {data.conservation.map((v, idx) => (
                <div
                  key={idx}
                  className="absolute bottom-0"
                  style={{
                    left: idx * zoom,
                    width: zoom - 1,
                    height: `${v * 100}%`,
                    background: `color-mix(in oklab, var(--color-sage-deep) ${v * 100}%, var(--color-faded))`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Buried */}
          {enabledTracks.buried && (
            <div className="relative h-3 mt-1">
              {chain.residues.map((r, idx) => {
                const exp = data.exposure.get(`${chain.id}|${r.resSeq}`) ?? 0.5;
                return (
                  <div
                    key={idx}
                    className="absolute bottom-0"
                    style={{
                      left: idx * zoom,
                      width: zoom - 1,
                      height: "100%",
                      background: `color-mix(in oklab, var(--color-sandalwood-deep) ${(1 - exp) * 100}%, transparent)`,
                    }}
                  />
                );
              })}
            </div>
          )}

          {/* Motifs */}
          {enabledTracks.motifs && (
            <MotifTrack hits={data.motifs} zoom={zoom} length={chain.sequence.length} />
          )}

          {/* Ligand contacts */}
          {enabledTracks.ligands && data.ligandContacts.size > 0 && (
            <div className="space-y-1 pt-1">
              {Array.from(data.ligandContacts.entries()).map(([het, set]) => (
                <div key={het} className="relative h-3 group">
                  <div className="absolute -left-2 -top-3 text-[9px] font-mono text-taupe">{het}</div>
                  {chain.residues.map((r, idx) => set.has(r.resSeq) ? (
                    <div
                      key={idx}
                      className="absolute top-0"
                      style={{
                        left: idx * zoom,
                        width: zoom - 1,
                        height: "100%",
                        background: "var(--color-honey)",
                        borderRadius: 2,
                      }}
                      title={`${r.resName}${r.resSeq} contacts ${het}`}
                    />
                  ) : null)}
                </div>
              ))}
            </div>
          )}

          {/* Mutations */}
          {enabledTracks.muts && (
            <div className="relative h-3 mt-1">
              {chain.residues.map((r, idx) => {
                const m = mutationResidues.find((mu) => mu.chain === chain.id && mu.resSeq === r.resSeq);
                if (!m) return null;
                return (
                  <div
                    key={idx}
                    className="absolute bottom-0 heartbeat rounded-sm"
                    style={{
                      left: idx * zoom,
                      width: zoom - 1,
                      height: "100%",
                      background: "#C4614A",
                    }}
                    title={`${r.oneLetter}${r.resSeq}${m.mut}`}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function buildTrackData(chain: PdbChain, structure: PdbStructure, _muts: { chain: string; resSeq: number; mut: string }[]) {
  const conservation = conservationProfile(chain.sequence);
  const motifs = scanMotifs(chain.sequence);
  const exposure = new Map<string, number>();
  // Quick CA neighbor count
  const cas: { res: number; x: number; y: number; z: number }[] = [];
  for (const r of chain.residues) {
    const ca = r.atoms.find((a) => a.atomName === "CA");
    if (ca) cas.push({ res: r.resSeq, x: ca.x, y: ca.y, z: ca.z });
  }
  for (let i = 0; i < cas.length; i++) {
    let n = 0;
    for (let j = 0; j < cas.length; j++) {
      if (i === j) continue;
      const dx = cas[i].x - cas[j].x, dy = cas[i].y - cas[j].y, dz = cas[i].z - cas[j].z;
      if (dx * dx + dy * dy + dz * dz <= 100) n++;
    }
    exposure.set(`${chain.id}|${cas[i].res}`, Math.max(0, 1 - n / 18));
  }

  // Ligand contacts
  const ligandContacts = new Map<string, Set<number>>();
  for (const het of structure.heterogens) {
    const set = new Set<number>();
    for (const r of chain.residues) {
      const ca = r.atoms.find((a) => a.atomName === "CA");
      if (!ca) continue;
      for (const ha of het.atoms) {
        const dx = ca.x - ha.x, dy = ca.y - ha.y, dz = ca.z - ha.z;
        if (dx * dx + dy * dy + dz * dz <= 36) { set.add(r.resSeq); break; }
      }
    }
    if (set.size > 0) ligandContacts.set(het.hetID, set);
  }

  return { conservation, motifs, exposure, ligandContacts };
}

function HydropathyWave({ seq, zoom }: { seq: string; zoom: number }) {
  const win = useMemo(() => hydropathyWindow(seq, 9), [seq]);
  const w = seq.length * zoom;
  const h = 26;
  const pts = win.map((v, i) => {
    const x = i * zoom + zoom / 2;
    const y = h / 2 - (v / 4.5) * (h / 2 - 1);
    return `${x},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg width={w} height={h} className="block">
      <line x1={0} x2={w} y1={h / 2} y2={h / 2} stroke="var(--color-border-strong)" strokeDasharray="2 3" />
      <polyline fill="none" stroke="var(--color-sandalwood)" strokeWidth={1.5} points={pts} />
    </svg>
  );
}

function BFactorBars({ residues, zoom }: { residues: PdbChain["residues"]; zoom: number }) {
  const max = Math.max(...residues.map((r) => r.bFactorMean), 1);
  return (
    <>
      {residues.map((r, idx) => (
        <div
          key={idx}
          className="absolute bottom-0"
          style={{
            left: idx * zoom,
            width: zoom - 1,
            height: `${(r.bFactorMean / max) * 100}%`,
            background: "var(--color-sandalwood)",
            opacity: 0.7,
          }}
        />
      ))}
    </>
  );
}

function MotifTrack({ hits, zoom, length }: { hits: MotifHit[]; zoom: number; length: number }) {
  // Lay out into rows (greedy) to avoid overlap
  const rows: MotifHit[][] = [];
  for (const h of hits) {
    let placed = false;
    for (const row of rows) {
      if (row[row.length - 1].end < h.start) { row.push(h); placed = true; break; }
    }
    if (!placed) rows.push([h]);
  }
  return (
    <div className="space-y-0.5 pt-1" style={{ width: length * zoom }}>
      {rows.slice(0, 4).map((row, ri) => (
        <div key={ri} className="relative h-3">
          {row.map((h, hi) => (
            <div
              key={hi}
              className="absolute top-0 rounded-sm cursor-help"
              style={{
                left: (h.start - 1) * zoom,
                width: (h.end - h.start + 1) * zoom,
                height: "100%",
                background: h.color,
                opacity: 0.85,
              }}
              title={`${h.name} · ${h.start}–${h.end}\n${h.description}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
