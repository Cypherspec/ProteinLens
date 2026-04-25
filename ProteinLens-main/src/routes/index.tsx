import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { toast } from "sonner";

import { fetchPdbFile, fetchEntryMetadata, fetchPolymerEntity, fetchUniprot } from "@/lib/bio/rcsb";
import { parsePdb, type PdbStructure, type PdbHeterogen } from "@/lib/bio/pdb";
import { pushHistory } from "@/lib/bio/state";

import { ProteinViewer, type DisplayStyle, type ColorMode, type ViewerSelection } from "@/components/workspace/ProteinViewer";
import { LeftSidebar } from "@/components/workspace/LeftSidebar";
import { DossierPanel } from "@/components/workspace/DossierPanel";
import { SequenceViewer } from "@/components/workspace/SequenceViewer";
import { BottomTabs } from "@/components/workspace/BottomTabs";

const searchSchema = z.object({
  pdb: fallback(z.string(), "4HHB").default("4HHB"),
});

export const Route = createFileRoute("/")({
  validateSearch: zodValidator(searchSchema),
  component: Workspace,
});

function Workspace() {
  const { pdb } = Route.useSearch();
  const navigate = Route.useNavigate();

  const pdbId = pdb.toUpperCase();
  const isAlphafold = pdbId.startsWith("AF_");

  const [dark, setDark] = useState<boolean>(false);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const [display, setDisplay] = useState<DisplayStyle>("cartoon");
  const [colorMode, setColorMode] = useState<ColorMode>("ss");
  const [spinning, setSpinning] = useState(false);
  const [showSurface, setShowSurface] = useState(false);
  const [showLigands, setShowLigands] = useState(true);
  const [hiddenChains, setHiddenChains] = useState<Set<string>>(new Set());
  const [selectedChain, setSelectedChain] = useState("A");
  const [highlightResidues, setHighlightResidues] = useState<{ chain: string; resSeq: number }[]>([]);
  const [hoveredResidue, setHoveredResidue] = useState<{ chain: string; resSeq: number } | null>(null);
  const [hoverInfo, setHoverInfo] = useState<ViewerSelection | null>(null);
  const [mutations, setMutations] = useState<{ chain: string; resSeq: number; wt: string; mut: string }[]>([]);

  useEffect(() => {
    if (isAlphafold) setColorMode("plddt");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAlphafold]);

  const pdbQuery = useQuery({
    queryKey: ["pdb", pdbId],
    queryFn: () => fetchPdbFile(pdbId),
    staleTime: 30 * 60 * 1000,
  });

  const entryQuery = useQuery({
    queryKey: ["entry", pdbId],
    queryFn: () => fetchEntryMetadata(pdbId),
    enabled: !!pdbId && !isAlphafold,
    staleTime: 30 * 60 * 1000,
  });

  const entityQuery = useQuery({
    queryKey: ["entity", pdbId],
    queryFn: () => fetchPolymerEntity(pdbId, "1"),
    enabled: !!pdbId && !isAlphafold,
    staleTime: 30 * 60 * 1000,
  });

  const uniprotQuery = useQuery({
    queryKey: ["uniprot", entityQuery.data?.uniprotAccession ?? ""],
    queryFn: () => fetchUniprot(entityQuery.data!.uniprotAccession!),
    enabled: !!entityQuery.data?.uniprotAccession,
    staleTime: 30 * 60 * 1000,
  });

  const structure: PdbStructure | null = useMemo(
    () => (pdbQuery.data ? parsePdb(pdbQuery.data) : null),
    [pdbQuery.data]
  );

  useEffect(() => {
    if (!structure) return;
    if (!structure.chains.find((c) => c.id === selectedChain)) {
      setSelectedChain(structure.chains[0]?.id ?? "A");
    }
    setHiddenChains(new Set());
    setHighlightResidues([]);
    setMutations([]);
    pushHistory({
      pdbId,
      name: entryQuery.data?.title ?? entityQuery.data?.description ?? pdbId,
      organism: entityQuery.data?.organism ?? entryQuery.data?.organisms?.[0],
      loadedAt: Date.now(),
    });
    toast.success(`Loaded ${pdbId}`, { description: structure.chains.length + " chains · " + structure.atoms.length + " atoms" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structure]);

  useEffect(() => {
    if (pdbQuery.error) toast.error(`Failed to load ${pdbId}`, { description: (pdbQuery.error as Error).message });
  }, [pdbQuery.error, pdbId]);

  const handleLoad = (id: string) => {
    navigate({ search: (s: { pdb: string }) => ({ ...s, pdb: id.toUpperCase() }) });
  };

  const handleToggleChain = (id: string) => {
    setHiddenChains((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const handleZoomLigand = (h: PdbHeterogen) => {
    toast.info(`${h.hetID} · ${h.formula}`, { description: `Chain ${h.chainID} · ${h.atoms.length} atoms` });
  };

  const handleAddMutation = (chain: string, resSeq: number, mut: string) => {
    if (!structure) return;
    const ch = structure.chains.find((c) => c.id === chain);
    const res = ch?.residues.find((r) => r.resSeq === resSeq);
    if (!res) {
      toast.error(`Residue ${chain}:${resSeq} not found`);
      return;
    }
    setMutations((m) => [...m.filter((x) => !(x.chain === chain && x.resSeq === resSeq)), {
      chain, resSeq, wt: res.oneLetter, mut,
    }]);
    toast.success(`Mutation ${res.oneLetter}${resSeq}${mut} recorded`);
  };

  const handleSelect = (sel: ViewerSelection) => {
    setHighlightResidues([{ chain: sel.chain, resSeq: sel.resSeq }]);
    setSelectedChain(sel.chain);
  };

  const handleZoomResidue = (chain: string, resSeq: number) => {
    setHighlightResidues([{ chain, resSeq }]);
    setSelectedChain(chain);
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {pdbQuery.isFetching && (
        <div className="fixed top-0 left-0 right-0 h-0.5 z-50 progress-sweep bg-surface" />
      )}

      <header className="h-14 shrink-0 flex items-center justify-between px-5 bg-surface border-b border-border">
        <div className="flex items-baseline gap-3">
          <div className="flex items-center gap-2">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="11" cy="11" r="9" stroke="var(--color-sandalwood)" strokeWidth="1.2" />
              <path d="M3 11 Q 7 5, 11 11 Q 15 17, 19 11" stroke="var(--color-sage)" strokeWidth="1.4" fill="none" />
              <circle cx="11" cy="11" r="2" fill="var(--color-sage-deep)" />
            </svg>
            <span className="font-display italic text-lg text-foreground">ProteinLens</span>
          </div>
          <span className="text-xs text-faded hidden md:inline">a field guide for protein structure</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="frosted-pill px-3 py-1 text-xs font-mono text-foreground">
            {isAlphafold ? `AF · ${pdbId.slice(3)}` : `PDB · ${pdbId}`}
          </span>
          <button
            onClick={() => setDark((d) => !d)}
            className="px-3 py-1.5 rounded-full text-xs bg-card border border-border hover:bg-accent transition-all duration-300"
          >
            {dark ? "☀ Light" : "☾ Dark"}
          </button>
          <a
            href={`https://www.rcsb.org/structure/${pdbId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-taupe hover:text-foreground transition-colors"
          >
            RCSB ↗
          </a>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <LeftSidebar
          pdbId={pdbId}
          structure={structure}
          selectedChain={selectedChain}
          hiddenChains={hiddenChains}
          showLigands={showLigands}
          onLoad={handleLoad}
          onSelectChain={setSelectedChain}
          onToggleChain={handleToggleChain}
          onToggleLigands={() => setShowLigands((s) => !s)}
          onZoomLigand={handleZoomLigand}
          onAddMutation={handleAddMutation}
        />

        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="relative flex-1 min-h-[420px] bg-canvas" data-canvas-host>
            <ProteinViewer
              pdbText={pdbQuery.data ?? null}
              structure={structure}
              display={display}
              colorMode={colorMode}
              spinning={spinning}
              showSurface={showSurface}
              showLigands={showLigands}
              hiddenChains={hiddenChains}
              highlightResidues={highlightResidues}
              mutationResidues={mutations.map((m) => ({ chain: m.chain, resSeq: m.resSeq }))}
              isAlphafold={isAlphafold}
              onSelect={handleSelect}
              onHover={(s) => {
                setHoverInfo(s);
                setHoveredResidue(s ? { chain: s.chain, resSeq: s.resSeq } : null);
              }}
            />

            {hoverInfo && (
              <div className="pointer-events-none absolute top-4 left-4 max-w-xs rounded-xl bg-card border border-border-strong border-l-2 border-l-sage px-3 py-2 shadow-warm-lg">
                <p className="font-display text-base text-foreground">
                  {hoverInfo.resName} <span className="text-taupe text-sm font-mono">({hoverInfo.oneLetter})</span> · {hoverInfo.resSeq}
                </p>
                <p className="text-[10px] text-faded font-mono mt-0.5">
                  chain {hoverInfo.chain} · {hoverInfo.ss === "H" ? "helix" : hoverInfo.ss === "E" ? "sheet" : "loop"} · b {hoverInfo.bFactor.toFixed(1)}
                </p>
              </div>
            )}

            {pdbQuery.isLoading && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="flex flex-col items-center gap-3">
                  <div className="flex gap-1">
                    <span className="size-1.5 rounded-full bg-sandalwood pulse-dot" />
                    <span className="size-1.5 rounded-full bg-sandalwood pulse-dot" style={{ animationDelay: "0.2s" }} />
                    <span className="size-1.5 rounded-full bg-sandalwood pulse-dot" style={{ animationDelay: "0.4s" }} />
                  </div>
                  <span className="font-mono text-xs uppercase tracking-wider text-canvas-foreground/70">Fetching {pdbId}</span>
                </div>
              </div>
            )}

            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 frosted-pill flex items-center gap-1 px-2 py-1.5 flex-wrap max-w-[95%]">
              {(["cartoon", "stick", "sphere", "surface", "line"] as DisplayStyle[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setDisplay(s)}
                  className={`px-3 py-1 rounded-full text-[11px] font-medium capitalize transition-all duration-300 ${
                    display === s ? "bg-primary text-primary-foreground" : "text-taupe hover:bg-accent"
                  }`}
                >
                  {s}
                </button>
              ))}
              <span className="w-px h-4 bg-border mx-1" />
              <select
                value={colorMode}
                onChange={(e) => setColorMode(e.target.value as ColorMode)}
                className="px-2 py-1 rounded-full text-[11px] bg-transparent text-foreground outline-none cursor-pointer"
              >
                <option value="ss">color · structure</option>
                <option value="chain">color · chain</option>
                <option value="hydrophobicity">color · hydropathy</option>
                <option value="bfactor">color · B-factor</option>
                <option value="conservation">color · conservation</option>
                <option value="element">color · element</option>
                <option value="plddt">color · pLDDT</option>
              </select>
              <span className="w-px h-4 bg-border mx-1" />
              <button
                onClick={() => setSpinning((s) => !s)}
                className={`px-2.5 py-1 rounded-full text-[11px] transition-all ${spinning ? "bg-primary text-primary-foreground" : "text-taupe hover:bg-accent"}`}
                title="Spin"
              >
                ↻
              </button>
              <button
                onClick={() => setShowSurface((s) => !s)}
                className={`px-2.5 py-1 rounded-full text-[11px] transition-all ${showSurface ? "bg-primary text-primary-foreground" : "text-taupe hover:bg-accent"}`}
                title="Surface"
              >
                ◯
              </button>
            </div>
          </div>

          <div className="overflow-y-auto bg-background border-t border-border">
            <div className="p-5 space-y-5">
              {structure ? (
                <>
                  <SequenceViewer
                    structure={structure}
                    selectedChain={selectedChain}
                    hoveredResidue={hoveredResidue}
                    onHover={setHoveredResidue}
                    onSelect={(h) => {
                      setHighlightResidues([h]);
                      setSelectedChain(h.chain);
                    }}
                    mutationResidues={mutations}
                  />
                  <BottomTabs
                    structure={structure}
                    selectedChain={selectedChain}
                    entry={entryQuery.data}
                    mutations={mutations}
                    onRemoveMutation={(i) => setMutations((m) => m.filter((_, idx) => idx !== i))}
                    onClearMutations={() => setMutations([])}
                    onZoomResidue={handleZoomResidue}
                  />
                </>
              ) : (
                <div className="warm-card p-8 text-center">
                  <div className="shimmer h-3 rounded-full max-w-xs mx-auto" />
                </div>
              )}
            </div>
          </div>
        </main>

        <aside className="w-[320px] shrink-0 h-full overflow-y-auto bg-sidebar linen-texture border-l border-sidebar-border p-5">
          {structure ? (
            <DossierPanel
              pdbId={pdbId}
              structure={structure}
              entry={entryQuery.data}
              entity={entityQuery.data}
              uniprot={uniprotQuery.data}
              selectedChain={selectedChain}
            />
          ) : (
            <div className="space-y-4 stagger">
              <div className="shimmer h-4 rounded-full" />
              <div className="shimmer h-12 rounded-xl" />
              <div className="shimmer h-32 rounded-xl" />
              <div className="shimmer h-24 rounded-xl" />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
