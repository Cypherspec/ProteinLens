import { useState, useEffect } from "react";
import type { PdbStructure } from "@/lib/bio/pdb";
import { chainColor } from "@/lib/bio/colors";
import { getHistory, type HistoryEntry } from "@/lib/bio/state";

export type LoadMode = "pdb" | "alphafold";

interface Props {
  pdbId: string;
  loadMode: LoadMode;
  structure: PdbStructure | null;
  selectedChain: string;
  hiddenChains: Set<string>;
  showLigands: boolean;
  onLoad: (id: string, mode: LoadMode) => void;
  onSelectChain: (id: string) => void;
  onToggleChain: (id: string) => void;
  onToggleLigands: () => void;
  onZoomLigand: (het: import("@/lib/bio/pdb").PdbHeterogen) => void;
  onAddMutation: (chain: string, resSeq: number, mut: string) => void;
}

const PDB_EXAMPLES = ["4HHB", "1MBO", "1LYZ", "1MSO", "1EMA", "1CGD"];
const AF_EXAMPLES = ["P69905", "P00533", "Q5VSL9", "P53_HUMAN", "P04637", "P38398"];

export function LeftSidebar(props: Props) {
  const [mode, setMode] = useState<LoadMode>(props.loadMode);
  const [input, setInput] = useState(props.pdbId);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [mutChain, setMutChain] = useState("A");
  const [mutResi, setMutResi] = useState("");
  const [mutTo, setMutTo] = useState("A");

  useEffect(() => setMode(props.loadMode), [props.loadMode]);
  useEffect(() => {
    const display = props.loadMode === "alphafold" && props.pdbId.startsWith("AF_")
      ? props.pdbId.slice(3)
      : props.pdbId;
    setInput(display);
  }, [props.pdbId, props.loadMode]);

  useEffect(() => {
    const update = () => setHistory(getHistory());
    update();
    window.addEventListener("storage", update);
    return () => window.removeEventListener("storage", update);
  }, [props.pdbId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = input.trim();
    if (!id) return;
    props.onLoad(id, mode);
  };

  const submitMutation = (e: React.FormEvent) => {
    e.preventDefault();
    const r = parseInt(mutResi, 10);
    if (!r || !mutTo) return;
    props.onAddMutation(mutChain, r, mutTo.toUpperCase());
    setMutResi("");
  };

  const examples = mode === "pdb" ? PDB_EXAMPLES : AF_EXAMPLES;
  const placeholder = mode === "pdb" ? "4HHB" : "P69905";

  return (
    <aside className="w-[280px] shrink-0 h-full overflow-y-auto bg-sidebar linen-texture border-r border-sidebar-border">
      <div className="p-5 space-y-6">
        {/* Mode toggle */}
        <section>
          <p className="label-eyebrow mb-2">Data source</p>
          <div className="grid grid-cols-2 gap-1 p-1 rounded-full bg-surface border border-border">
            <button
              onClick={() => setMode("pdb")}
              className={`px-2 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                mode === "pdb" ? "bg-card text-foreground shadow-warm-sm" : "text-taupe hover:text-foreground"
              }`}
            >
              PDB Structure
            </button>
            <button
              onClick={() => setMode("alphafold")}
              className={`px-2 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                mode === "alphafold" ? "bg-card text-foreground shadow-warm-sm" : "text-taupe hover:text-foreground"
              }`}
            >
              AlphaFold
            </button>
          </div>
          <p className="mt-2 text-[10px] text-faded leading-snug">
            {mode === "pdb"
              ? "Experimentally determined structures from RCSB PDB."
              : "AI-predicted models from AlphaFold DB · DeepMind."}
          </p>
        </section>

        {/* Load */}
        <section>
          <form onSubmit={handleSubmit} className="space-y-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "").slice(0, 16))}
              placeholder={placeholder}
              className="w-full px-3 py-2 rounded-lg bg-input text-sm font-mono text-foreground border-0 border-b-2 border-transparent focus:border-primary outline-none transition-all duration-300"
            />
            <button
              type="submit"
              className="w-full px-3 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-sage-deep transition-all duration-300 hover:scale-[1.01]"
            >
              Load {mode === "pdb" ? "PDB" : "Prediction"}
            </button>
          </form>
          <div className="grid grid-cols-3 gap-1 mt-3">
            {examples.map((id) => (
              <button
                key={id}
                onClick={() => props.onLoad(id, mode)}
                className="px-1.5 py-1 rounded-md text-[10px] font-mono bg-card text-taupe hover:bg-accent hover:text-foreground transition-all duration-200 truncate"
              >
                {id}
              </button>
            ))}
          </div>
        </section>

        <Hairline />

        {/* Chains */}
        {props.structure && (
          <section>
            <SectionTitle icon="helix" label={`Chains · ${props.structure.chains.length}`} />
            <div className="space-y-1">
              {props.structure.chains.map((c) => {
                const hidden = props.hiddenChains.has(c.id);
                const selected = props.selectedChain === c.id;
                return (
                  <div
                    key={c.id}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-all duration-200 ${
                      selected ? "bg-card shadow-warm-sm" : "hover:bg-card/50"
                    }`}
                  >
                    <button
                      onClick={() => props.onToggleChain(c.id)}
                      className="size-3 rounded-full border border-border-strong shrink-0 transition-all"
                      style={{ background: hidden ? "transparent" : chainColor(c.id) }}
                      title={hidden ? "Show chain" : "Hide chain"}
                    />
                    <button
                      onClick={() => props.onSelectChain(c.id)}
                      className="flex-1 flex items-baseline justify-between text-left"
                    >
                      <span className={`font-mono text-sm ${hidden ? "text-faded" : "text-foreground"}`}>{c.id}</span>
                      <span className="text-[10px] text-faded">{c.sequence.length}aa</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {props.structure && props.structure.heterogens.length > 0 && (
          <>
            <Hairline />
            <section>
              <div className="flex items-center justify-between mb-2">
                <SectionTitle icon="dot" label={`Ligands · ${props.structure.heterogens.length}`} compact />
                <button
                  onClick={props.onToggleLigands}
                  className={`px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider transition-all ${
                    props.showLigands ? "bg-primary text-primary-foreground" : "bg-surface text-taupe"
                  }`}
                >
                  {props.showLigands ? "Shown" : "Hidden"}
                </button>
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {props.structure.heterogens.map((h) => (
                  <button
                    key={`${h.chainID}${h.resSeq}${h.hetID}`}
                    onClick={() => props.onZoomLigand(h)}
                    className="w-full flex items-baseline justify-between px-2 py-1.5 rounded-md hover:bg-card text-left transition-all duration-200"
                  >
                    <span className="font-mono text-xs text-foreground">{h.hetID}</span>
                    <span className="text-[9px] text-faded font-mono">{h.formula} · {h.atoms.length}a</span>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        <Hairline />

        {/* Mutation highlighter */}
        {props.structure && (
          <section>
            <SectionTitle icon="link" label="Mutation site" />
            <form onSubmit={submitMutation} className="grid grid-cols-[40px_1fr_40px_auto] gap-1.5 items-center">
              <select
                value={mutChain}
                onChange={(e) => setMutChain(e.target.value)}
                className="px-1.5 py-1 rounded-md bg-input text-xs font-mono"
              >
                {props.structure.chains.map((c) => <option key={c.id} value={c.id}>{c.id}</option>)}
              </select>
              <input
                value={mutResi}
                onChange={(e) => setMutResi(e.target.value.replace(/\D/g, ""))}
                placeholder="resi"
                className="px-2 py-1 rounded-md bg-input text-xs font-mono"
              />
              <select
                value={mutTo}
                onChange={(e) => setMutTo(e.target.value)}
                className="px-1.5 py-1 rounded-md bg-input text-xs font-mono"
              >
                {"ACDEFGHIKLMNPQRSTVWY".split("").map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              <button type="submit" className="px-2 py-1 rounded-full bg-terracotta text-white text-xs">+</button>
            </form>
          </section>
        )}

        {history.length > 0 && (
          <>
            <Hairline />
            <section>
              <SectionTitle icon="leaf" label="Recent" />
              <div className="space-y-1">
                {history.slice(0, 6).map((h) => (
                  <button
                    key={h.pdbId}
                    onClick={() => {
                      const id = h.pdbId.startsWith("AF_") ? h.pdbId.slice(3) : h.pdbId;
                      const m: LoadMode = h.pdbId.startsWith("AF_") ? "alphafold" : "pdb";
                      props.onLoad(id, m);
                    }}
                    className="w-full flex items-baseline justify-between px-2 py-1.5 rounded-md hover:bg-card text-left transition-all"
                  >
                    <span className="font-mono text-xs text-foreground">{h.pdbId}</span>
                    <span className="text-[9px] text-faded truncate ml-2">{h.organism ?? h.name?.slice(0, 16)}</span>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </aside>
  );
}

function Hairline() {
  return <div className="hairline" />;
}

function SectionTitle({ icon, label, compact }: { icon: "leaf" | "helix" | "dot" | "link"; label: string; compact?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${compact ? "" : "mb-3"}`}>
      <BotanicalIcon name={icon} />
      <span className="label-eyebrow">{label}</span>
    </div>
  );
}

function BotanicalIcon({ name }: { name: "leaf" | "helix" | "dot" | "link" }) {
  const stroke = "var(--color-sandalwood)";
  if (name === "leaf") {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M2 12 C 2 5, 8 2, 12 2 C 12 8, 8 12, 2 12 Z" stroke={stroke} strokeWidth="1" fill="none" />
        <path d="M2 12 L 10 4" stroke={stroke} strokeWidth="0.8" />
      </svg>
    );
  }
  if (name === "helix") {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M2 4 Q 7 1, 12 4 Q 7 7, 2 4 Q 7 1, 12 4" stroke={stroke} strokeWidth="0.9" fill="none" />
        <path d="M2 10 Q 7 7, 12 10 Q 7 13, 2 10" stroke={stroke} strokeWidth="0.9" fill="none" />
      </svg>
    );
  }
  if (name === "dot") {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="4" cy="7" r="2" fill={stroke} />
        <circle cx="10" cy="4" r="1.4" fill={stroke} opacity="0.7" />
        <circle cx="10" cy="10" r="1.4" fill={stroke} opacity="0.7" />
        <line x1="4" y1="7" x2="10" y2="4" stroke={stroke} strokeWidth="0.6" />
        <line x1="4" y1="7" x2="10" y2="10" stroke={stroke} strokeWidth="0.6" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="4" cy="7" r="2.5" stroke={stroke} strokeWidth="1" fill="none" />
      <circle cx="10" cy="7" r="2.5" stroke={stroke} strokeWidth="1" fill="none" />
    </svg>
  );
}
