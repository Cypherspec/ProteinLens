import { useMemo, useState } from "react";
import type { PdbStructure } from "@/lib/bio/pdb";
import type { RcsbEntry } from "@/lib/bio/rcsb";
import type { UniprotFull, PaeMatrix, AlphafoldPrediction, SimilarProtein, UniprotPdbXref } from "@/lib/bio/alphafold";
import { ramachandran } from "@/lib/bio/pdb";
import { scanMotifs } from "@/lib/bio/motifs";
import { predictMutation, type MutationConsequence } from "@/lib/bio/mutation";
import { GLOSSARY } from "@/lib/bio/glossary";
import { ModelConfidencePanel } from "./ModelConfidencePanel";
import { PaeHeatmap } from "./PaeHeatmap";
import { IdentityCards } from "./IdentityCards";

interface Props {
  structure: PdbStructure;
  selectedChain: string;
  entry?: RcsbEntry;
  uniprot?: UniprotFull | null;
  pae?: PaeMatrix | null;
  prediction?: AlphafoldPrediction | null;
  similar?: SimilarProtein[];
  pdbXrefs?: UniprotPdbXref[];
  isAlphafold: boolean;
  plddtScores?: number[];
  mutations: { chain: string; resSeq: number; wt: string; mut: string }[];
  onRemoveMutation: (i: number) => void;
  onClearMutations: () => void;
  onZoomResidue: (chain: string, resSeq: number) => void;
  onZoomRange: (chain: string, start: number, end: number) => void;
  onLoadAccession: (acc: string) => void;
}

type Tab = "summary" | "domains" | "annotations" | "similar" | "mutations" | "validation" | "ramachandran" | "glossary";

export function BottomTabs(props: Props) {
  const { structure, selectedChain, entry, uniprot, pae, similar, pdbXrefs, isAlphafold, plddtScores, mutations,
    onRemoveMutation, onClearMutations, onZoomResidue, onZoomRange, onLoadAccession } = props;
  const [tab, setTab] = useState<Tab>(isAlphafold ? "summary" : "mutations");
  const chain = structure.chains.find((c) => c.id === selectedChain) ?? structure.chains[0];

  const tabs: [Tab, string][] = isAlphafold
    ? [
        ["summary", "Summary & Confidence"],
        ["domains", "Domains"],
        ["annotations", "Annotations"],
        ["similar", "Similar Proteins"],
        ["mutations", `Mutations · ${mutations.length}`],
        ["ramachandran", "Ramachandran"],
        ["glossary", "Glossary"],
      ]
    : [
        ["mutations", `Mutations · ${mutations.length}`],
        ["domains", "Motifs & Domains"],
        ["annotations", "Annotations"],
        ["validation", "Validation"],
        ["ramachandran", "Ramachandran"],
        ["glossary", "Glossary"],
      ];

  return (
    <div className="warm-card overflow-hidden">
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border bg-surface/30 overflow-x-auto">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              tab === id ? "bg-primary text-primary-foreground" : "text-taupe hover:bg-card"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="p-5">
        {tab === "summary" && (
          <div className="space-y-5">
            <IdentityCards uniprot={uniprot} pdbXrefs={pdbXrefs} fallbackName={entry?.title} fallbackOrganism={entry?.organisms?.[0]} isAlphafold={isAlphafold} experimentalEntry={entry} />
            {plddtScores && plddtScores.length > 0 && <ModelConfidencePanel scores={plddtScores} />}
            {pae && <div className="warm-card p-5"><PaeHeatmap pae={pae} onZoomPair={(i, j) => onZoomRange(chain.id, Math.min(i, j), Math.max(i, j))} /></div>}
          </div>
        )}
        {tab === "domains" && <DomainsPanel uniprot={uniprot} chain={chain} onZoom={onZoomResidue} onZoomRange={(s, e) => onZoomRange(chain.id, s, e)} />}
        {tab === "annotations" && <AnnotationsPanel uniprot={uniprot} chain={chain} onZoom={onZoomResidue} />}
        {tab === "similar" && <SimilarPanel similar={similar} onLoad={onLoadAccession} />}
        {tab === "mutations" && <MutationPanel mutations={mutations} onRemove={onRemoveMutation} onClear={onClearMutations} onZoom={onZoomResidue} />}
        {tab === "validation" && <ValidationPanel entry={entry} structure={structure} />}
        {tab === "ramachandran" && <RamachandranPanel structure={structure} onZoom={onZoomResidue} />}
        {tab === "glossary" && <GlossaryPanel />}
      </div>
    </div>
  );
}

function DomainsPanel({ uniprot, chain, onZoom, onZoomRange }: { uniprot?: UniprotFull | null; chain: PdbStructure["chains"][number]; onZoom: (c: string, r: number) => void; onZoomRange: (s: number, e: number) => void }) {
  const motifHits = useMemo(() => scanMotifs(chain.sequence), [chain.sequence]);
  const domains = (uniprot?.features ?? []).filter((f) => f.category === "domain" || f.category === "region");
  if (domains.length === 0 && motifHits.length === 0) {
    return <p className="text-sm text-taupe">No annotated domains or motifs detected.</p>;
  }
  return (
    <div className="space-y-5">
      {domains.length > 0 && (
        <div>
          <h4 className="font-display text-lg mb-3">UniProt domains · {domains.length}</h4>
          <div className="grid md:grid-cols-2 gap-3">
            {domains.map((d, i) => (
              <button
                key={`${d.start}-${i}`}
                onClick={() => onZoomRange(d.start, d.end)}
                className="text-left rounded-xl border border-border bg-surface/40 p-3 lift-on-hover"
              >
                <div className="flex items-baseline justify-between mb-1">
                  <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-sandalwood/20 text-foreground">{d.start}–{d.end}</span>
                  <span className="text-[10px] text-taupe uppercase tracking-wider">{d.type}</span>
                </div>
                <p className="text-sm text-foreground/85 leading-snug">{d.description ?? d.type}</p>
              </button>
            ))}
          </div>
        </div>
      )}
      {motifHits.length > 0 && (
        <div>
          <h4 className="font-display text-lg mb-3">Sequence motifs · {motifHits.length}</h4>
          <div className="grid md:grid-cols-2 gap-3">
            {motifHits.map((h) => (
              <div key={h.id} className="rounded-xl border border-border bg-surface/40 p-3 lift-on-hover">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="font-mono text-xs px-1.5 py-0.5 rounded text-foreground" style={{ background: h.color, color: "#2C2416" }}>{h.start}–{h.end}</span>
                  <button onClick={() => onZoom(chain.id, h.start)} className="text-[10px] text-sage hover:underline">zoom</button>
                </div>
                <p className="font-display text-base text-foreground">{h.name}</p>
                <p className="text-xs text-taupe leading-snug mt-1">{h.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AnnotationsPanel({ uniprot, chain, onZoom }: { uniprot?: UniprotFull | null; chain: PdbStructure["chains"][number]; onZoom: (c: string, r: number) => void }) {
  const features = uniprot?.features ?? [];
  const grouped = useMemo(() => {
    const g: Record<string, typeof features> = {};
    for (const f of features) {
      if (f.category === "domain" || f.category === "region") continue;
      (g[f.category] = g[f.category] ?? []).push(f);
    }
    return g;
  }, [features]);
  if (!uniprot || features.length === 0) return <p className="text-sm text-taupe">No UniProt annotations available.</p>;

  const labels: Record<string, string> = {
    "active-site": "Active sites",
    "binding-site": "Binding sites",
    "ptm": "Post-translational modifications",
    "variant": "Natural variants",
    "mutagenesis": "Mutagenesis experiments",
    "other": "Other features",
  };

  return (
    <div className="space-y-5">
      {Object.entries(grouped).map(([cat, feats]) => (
        <div key={cat}>
          <h4 className="font-display text-base mb-2">{labels[cat] ?? cat} · {feats.length}</h4>
          <div className="grid md:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
            {feats.slice(0, 80).map((f, i) => (
              <button
                key={i}
                onClick={() => onZoom(chain.id, f.start)}
                className="text-left rounded-lg border border-border bg-surface/30 px-3 py-2 hover:bg-card transition-all"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-mono text-[10px] text-taupe">{f.start === f.end ? f.start : `${f.start}–${f.end}`}</span>
                  <span className="text-[9px] uppercase tracking-wider text-faded">{f.type}</span>
                </div>
                {f.description && <p className="text-xs text-foreground/85 mt-1 leading-snug">{f.description}</p>}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SimilarPanel({ similar, onLoad }: { similar?: SimilarProtein[]; onLoad: (acc: string) => void }) {
  if (!similar || similar.length === 0) return <p className="text-sm text-taupe">No similar proteins found in UniRef cluster.</p>;
  return (
    <div className="space-y-2">
      <h4 className="font-display text-lg mb-2">UniRef cluster members</h4>
      {similar.map((s) => (
        <div key={s.accession} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface/40 px-3 py-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-xs text-foreground">{s.accession}</span>
              <span className="text-[10px] text-faded">{(s.identity * 100).toFixed(0)}% identity</span>
            </div>
            <p className="text-xs text-foreground/80 truncate">{s.name ?? "—"}</p>
            {s.organism && <p className="text-[10px] text-faded italic truncate">{s.organism}</p>}
          </div>
          <button onClick={() => onLoad(s.accession)} className="shrink-0 px-3 py-1 rounded-full text-[11px] bg-primary text-primary-foreground hover:bg-sage-deep transition-all">Load</button>
        </div>
      ))}
    </div>
  );
}

function MutationPanel({ mutations, onRemove, onClear, onZoom }: {
  mutations: { chain: string; resSeq: number; wt: string; mut: string }[];
  onRemove: (i: number) => void;
  onClear: () => void;
  onZoom: (c: string, r: number) => void;
}) {
  const consequences: MutationConsequence[] = useMemo(
    () => mutations.map((m) => predictMutation({ chain: m.chain, resSeq: m.resSeq, wt: m.wt, mut: m.mut })),
    [mutations]
  );
  const cumulative = consequences.reduce((sum, c) => sum + c.severity, 0);

  if (mutations.length === 0) {
    return (
      <div className="text-center py-8 text-taupe">
        <p className="display-italic text-lg">No mutations recorded yet</p>
        <p className="text-xs mt-1">Add a mutation from the left sidebar.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-display text-lg">Mutation log</h4>
        <button onClick={onClear} className="text-xs text-terracotta hover:underline">Reset to wild-type</button>
      </div>
      <table className="w-full text-sm">
        <thead className="text-[10px] uppercase tracking-wider text-faded">
          <tr><th className="text-left py-2">Site</th><th className="text-left py-2">Sub</th><th className="text-left py-2">BLOSUM</th><th className="text-left py-2">ΔH</th><th className="text-left py-2">ΔQ</th><th className="text-left py-2">Effect</th><th className="text-left py-2">Severity</th><th></th></tr>
        </thead>
        <tbody>
          {consequences.map((c, i) => {
            const sevColor = c.severity <= 3 ? "#5C8C6A" : c.severity <= 6 ? "#C49A3A" : "#C4614A";
            return (
              <tr key={i} className="border-t border-border">
                <td className="py-2 font-mono"><button onClick={() => onZoom(c.mut.chain, c.mut.resSeq)} className="hover:underline">{c.mut.chain}:{c.mut.wt}{c.mut.resSeq}</button></td>
                <td className="py-2 font-mono">{c.mut.wt}→{c.mut.mut}</td>
                <td className="py-2 font-mono">{c.blosum}</td>
                <td className="py-2 font-mono">{c.dHydropathy.toFixed(1)}</td>
                <td className="py-2 font-mono">{c.dCharge.toFixed(1)}</td>
                <td className="py-2 text-xs">{c.ssEffect}</td>
                <td className="py-2"><div className="flex items-center gap-1.5"><div className="h-1.5 w-12 rounded-full bg-surface overflow-hidden"><div className="h-full" style={{ width: `${(c.severity / 10) * 100}%`, background: sevColor }} /></div><span className="text-xs font-mono" style={{ color: sevColor }}>{c.severity}</span></div></td>
                <td className="py-2 text-right"><button onClick={() => onRemove(i)} className="text-faded hover:text-terracotta text-xs">×</button></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mt-4 flex items-center justify-between p-3 rounded-lg bg-surface">
        <span className="label-eyebrow">Cumulative severity</span>
        <span className="font-display text-lg" style={{ color: cumulative / mutations.length > 6 ? "#C4614A" : "#7D9B76" }}>{(cumulative / mutations.length).toFixed(1)} / 10</span>
      </div>
    </div>
  );
}

function ValidationPanel({ entry, structure }: { entry?: RcsbEntry; structure: PdbStructure }) {
  const bMin = Math.min(...structure.atoms.map((a) => a.bFactor));
  const bMax = Math.max(...structure.atoms.map((a) => a.bFactor));
  const bMean = structure.atoms.reduce((s, a) => s + a.bFactor, 0) / structure.atoms.length;
  const bars: { label: string; value?: number; max: number; better: "low" | "high" }[] = [
    { label: "R-free", value: entry?.rFree, max: 0.5, better: "low" },
    { label: "R-work", value: entry?.rWork, max: 0.5, better: "low" },
    { label: "Clashscore", value: entry?.clashscore, max: 30, better: "low" },
    { label: "Rama outliers %", value: entry?.ramaOutliersPct, max: 5, better: "low" },
    { label: "Rotamer outliers %", value: entry?.rotamerOutliersPct, max: 8, better: "low" },
    { label: "RSRZ outliers %", value: entry?.rsrzOutliersPct, max: 10, better: "low" },
  ];
  return (
    <div className="space-y-5">
      <div>
        <h4 className="font-display text-lg mb-3">wwPDB validation</h4>
        {bars.every((b) => b.value === undefined) ? <p className="text-xs text-taupe">No validation report available.</p> : (
          <div className="space-y-2.5">
            {bars.map((b) => {
              if (b.value === undefined) return null;
              const t = Math.min(1, b.value / b.max);
              const good = b.better === "low" ? 1 - t : t;
              return (
                <div key={b.label}>
                  <div className="flex justify-between text-xs mb-1"><span className="text-taupe">{b.label}</span><span className="font-mono text-foreground">{b.value.toFixed(b.value < 1 ? 3 : 2)}</span></div>
                  <div className="relative h-1.5 rounded-full bg-surface overflow-hidden"><div className="h-full" style={{ width: `${t * 100}%`, background: good > 0.6 ? "#7D9B76" : good > 0.35 ? "#C49A3A" : "#C4614A" }} /></div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="hairline" />
      <div>
        <h4 className="font-display text-lg mb-3">B-factor distribution</h4>
        <div className="grid grid-cols-3 gap-4 text-sm"><div><p className="label-eyebrow">Min</p><p className="font-mono">{bMin.toFixed(1)}</p></div><div><p className="label-eyebrow">Mean</p><p className="font-mono">{bMean.toFixed(1)}</p></div><div><p className="label-eyebrow">Max</p><p className="font-mono">{bMax.toFixed(1)}</p></div></div>
      </div>
    </div>
  );
}

function RamachandranPanel({ structure, onZoom }: { structure: PdbStructure; onZoom: (c: string, r: number) => void }) {
  const points = useMemo(() => ramachandran(structure), [structure]);
  const W = 360, H = 360;
  const x = (phi: number) => ((phi + 180) / 360) * W;
  const y = (psi: number) => H - ((psi + 180) / 360) * H;
  return (
    <div className="flex flex-col md:flex-row gap-6">
      <div>
        <h4 className="font-display text-lg mb-3">Ramachandran φ/ψ</h4>
        <svg width={W} height={H} className="bg-surface rounded-xl border border-border">
          <ellipse cx={x(-60)} cy={y(-45)} rx={45} ry={35} fill="rgba(125,155,118,0.18)" />
          <ellipse cx={x(-110)} cy={y(130)} rx={55} ry={45} fill="rgba(125,155,118,0.18)" />
          <ellipse cx={x(60)} cy={y(45)} rx={35} ry={30} fill="rgba(125,155,118,0.12)" />
          <line x1={W / 2} x2={W / 2} y1={0} y2={H} stroke="var(--color-border)" />
          <line x1={0} x2={W} y1={H / 2} y2={H / 2} stroke="var(--color-border)" />
          {points.map((p, i) => (
            <circle key={i} cx={x(p.phi)} cy={y(p.psi)} r={2.2} fill={p.ss === "H" ? "#7D9B76" : p.ss === "E" ? "#B5845A" : "#A89880"} opacity={0.7} style={{ cursor: "pointer" }} onClick={() => onZoom(p.chain, p.resSeq)}><title>{p.chain}:{p.resName}{p.resSeq}</title></circle>
          ))}
        </svg>
      </div>
      <div className="flex-1 space-y-2 text-sm"><p className="text-taupe">Each dot is a residue plotted by backbone dihedrals. {points.length} residues plotted.</p></div>
    </div>
  );
}

function GlossaryPanel() {
  const [q, setQ] = useState("");
  const filtered = GLOSSARY.filter((g) => g.term.toLowerCase().includes(q.toLowerCase()) || g.definition.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search glossary…" className="w-full mb-4 px-3 py-2 rounded-lg bg-input text-sm border-0 border-b-2 border-transparent focus:border-primary outline-none" />
      <div className="grid md:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-2">
        {filtered.map((g) => (
          <div key={g.term} className="rounded-xl border border-border bg-surface/40 p-3"><p className="font-display text-base text-foreground">{g.term}</p><p className="text-xs text-taupe mt-1 leading-snug">{g.definition}</p><p className="text-[10px] text-faded mt-1.5 italic">Why it matters: {g.whyItMatters}</p></div>
        ))}
      </div>
    </div>
  );
}
