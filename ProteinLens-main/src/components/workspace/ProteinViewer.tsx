import { useEffect, useRef, useState, useCallback } from "react";
import type { ThreeDmol } from "@/types/3dmol";
import type { PdbStructure } from "@/lib/bio/pdb";
import { chainColor, bFactorColor, hydrophobicityColor, pLDDTColor } from "@/lib/bio/colors";
import { conservationProfile } from "@/lib/bio/conservation";
import { aaInfo, AA_CLASS_COLOR } from "@/lib/bio/aminoacids";

export type DisplayStyle = "cartoon" | "stick" | "sphere" | "surface" | "line";
export type ColorMode =
  | "chain"
  | "ss"
  | "hydrophobicity"
  | "bfactor"
  | "element"
  | "conservation"
  | "plddt";

export interface ViewerSelection {
  chain: string;
  resSeq: number;
  resName: string;
  oneLetter: string;
  ss: string;
  bFactor: number;
  occupancy: number;
}

interface Props {
  pdbText: string | null;
  structure: PdbStructure | null;
  display: DisplayStyle;
  colorMode: ColorMode;
  spinning: boolean;
  showSurface: boolean;
  showLigands: boolean;
  hiddenChains: Set<string>;
  highlightResidues: { chain: string; resSeq: number }[];
  mutationResidues: { chain: string; resSeq: number }[];
  isAlphafold: boolean;
  onSelect?: (sel: ViewerSelection) => void;
  onHover?: (sel: ViewerSelection | null) => void;
}

export function ProteinViewer(props: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<ThreeDmol.Viewer | null>(null);
  const [ready, setReady] = useState(false);
  const [libraryReady, setLibraryReady] = useState(false);

  // Wait for 3Dmol script
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.$3Dmol) { setLibraryReady(true); return; }
    const interval = setInterval(() => {
      if (window.$3Dmol) { setLibraryReady(true); clearInterval(interval); }
    }, 80);
    return () => clearInterval(interval);
  }, []);

  // Initialize viewer once library + container ready
  useEffect(() => {
    if (!libraryReady || !containerRef.current || viewerRef.current) return;
    const $3Dmol = window.$3Dmol!;
    const v = $3Dmol.createViewer(containerRef.current, {
      backgroundColor: 0x1c1a16,
      backgroundAlpha: 1,
      antialias: true,
      cartoonQuality: 10,
    });
    viewerRef.current = v;
    setReady(true);

    const handleResize = () => v.resize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [libraryReady]);

  // Load model when pdb text changes
  useEffect(() => {
    const v = viewerRef.current;
    if (!v || !ready || !props.pdbText) return;
    v.removeAllModels();
    v.removeAllSurfaces();
    v.removeAllLabels();
    v.removeAllShapes();
    v.addModel(props.pdbText, "pdb");
    applyStyle(v, props);
    v.zoomTo();
    v.render();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.pdbText, ready]);

  // Re-style on display/color changes
  useEffect(() => {
    const v = viewerRef.current;
    if (!v || !ready || !props.pdbText) return;
    v.removeAllSurfaces();
    v.removeAllShapes();
    applyStyle(v, props);
    v.render();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.display, props.colorMode, props.showSurface, props.showLigands, props.hiddenChains, props.highlightResidues, props.mutationResidues, props.isAlphafold]);

  // Spin
  useEffect(() => {
    const v = viewerRef.current;
    if (!v || !ready) return;
    v.spin(props.spinning ? "y" : false);
  }, [props.spinning, ready]);

  // Hover handler
  useEffect(() => {
    const v = viewerRef.current;
    if (!v || !ready || !props.structure) return;
    v.setHoverable(
      {},
      true,
      (atom) => {
        if (!atom) return;
        const chain = String(atom.chain ?? "");
        const resi = Number(atom.resi ?? 0);
        const res = props.structure!.chains.find((c) => c.id === chain)?.residues.find((r) => r.resSeq === resi);
        if (!res) return;
        const sel: ViewerSelection = {
          chain,
          resSeq: resi,
          resName: res.resName,
          oneLetter: res.oneLetter,
          ss: res.ss,
          bFactor: res.bFactorMean,
          occupancy: res.occupancyMean,
        };
        props.onHover?.(sel);
      },
      () => props.onHover?.(null)
    );
    v.setClickable({}, true, (atom) => {
      if (!atom) return;
      const chain = String(atom.chain ?? "");
      const resi = Number(atom.resi ?? 0);
      const res = props.structure!.chains.find((c) => c.id === chain)?.residues.find((r) => r.resSeq === resi);
      if (!res) return;
      const sel: ViewerSelection = {
        chain,
        resSeq: resi,
        resName: res.resName,
        oneLetter: res.oneLetter,
        ss: res.ss,
        bFactor: res.bFactorMean,
        occupancy: res.occupancyMean,
      };
      props.onSelect?.(sel);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, props.structure]);

  const handleZoomFit = useCallback(() => {
    viewerRef.current?.zoomTo(undefined, 600);
    viewerRef.current?.render();
  }, []);

  // Expose imperative handle via ref methods on container
  useEffect(() => {
    if (!containerRef.current) return;
    (containerRef.current as HTMLDivElement & { __zoomFit?: () => void }).__zoomFit = handleZoomFit;
  }, [handleZoomFit]);

  return (
    <div className="relative size-full">
      <div ref={containerRef} className="absolute inset-0 soil-grid" />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-2 text-sm text-canvas-foreground/70">
            <span className="size-2 rounded-full bg-sage pulse-dot" />
            <span className="font-mono tracking-wide uppercase text-xs">Loading viewer</span>
          </div>
        </div>
      )}
    </div>
  );
}

function applyStyle(v: ThreeDmol.Viewer, props: Props) {
  const { display, colorMode, structure, hiddenChains, showSurface, showLigands, highlightResidues, mutationResidues, isAlphafold } = props;

  // Compute color callback
  const colorFn = makeColorFn(colorMode, structure, isAlphafold);

  // Hide hidden chains
  for (const ch of hiddenChains) {
    v.setStyle({ chain: ch }, {});
  }

  const visibleChains = structure ? structure.chains.map((c) => c.id).filter((c) => !hiddenChains.has(c)) : [];

  for (const ch of visibleChains) {
    const baseSel = { chain: ch };
    const styleSpec: ThreeDmol.StyleSpec = {};
    if (display === "cartoon") {
      styleSpec.cartoon = { color: colorFn, thickness: 0.4, arrows: true };
    } else if (display === "stick") {
      styleSpec.stick = { radius: 0.18, colorfunc: colorFn } as unknown as ThreeDmol.StyleSpec["stick"];
    } else if (display === "sphere") {
      styleSpec.sphere = { scale: 0.32, colorfunc: colorFn } as unknown as ThreeDmol.StyleSpec["sphere"];
    } else if (display === "line") {
      styleSpec.line = { linewidth: 1.5, colorfunc: colorFn } as unknown as ThreeDmol.StyleSpec["line"];
    } else if (display === "surface") {
      styleSpec.cartoon = { color: colorFn, thickness: 0.3 };
    }
    v.setStyle(baseSel, styleSpec);
  }

  // Ligands
  if (showLigands) {
    v.addStyle({ hetflag: true, resn: ["HOH", "WAT"], invert: true } as unknown as ThreeDmol.AtomSpec, {
      stick: { radius: 0.22, color: "#C49A3A" as unknown as string },
    });
  }

  // Surface mode
  if (showSurface || display === "surface") {
    const $3Dmol = window.$3Dmol!;
    v.addSurface($3Dmol.SurfaceType.MS, { opacity: 0.65, color: "#B5845A" });
  }

  // Highlight selected residues — sage halo
  for (const h of highlightResidues) {
    v.addStyle({ chain: h.chain, resi: h.resSeq } as ThreeDmol.AtomSpec, {
      stick: { radius: 0.32, color: "#7D9B76" },
    });
    // outline sphere
    v.addStyle({ chain: h.chain, resi: h.resSeq, atom: "CA" } as ThreeDmol.AtomSpec, {
      sphere: { radius: 1.1, color: "#7D9B76", opacity: 0.4 },
    });
  }

  // Mutation residues — pulsing terracotta
  for (const m of mutationResidues) {
    v.addStyle({ chain: m.chain, resi: m.resSeq } as ThreeDmol.AtomSpec, {
      stick: { radius: 0.4, color: "#C4614A" },
    });
    v.addStyle({ chain: m.chain, resi: m.resSeq, atom: "CA" } as ThreeDmol.AtomSpec, {
      sphere: { radius: 1.6, color: "#C4614A", opacity: 0.45 },
    });
  }
}

function makeColorFn(mode: ColorMode, structure: PdbStructure | null, isAlphafold: boolean): (a: ThreeDmol.AtomSpec) => string {
  if (!structure) return () => "#7D9B76";

  // Pre-compute when needed
  const conservationByChain = new Map<string, number[]>();
  if (mode === "conservation") {
    for (const c of structure.chains) conservationByChain.set(c.id, conservationProfile(c.sequence));
  }
  let bMin = Infinity, bMax = -Infinity;
  if (mode === "bfactor") {
    for (const a of structure.atoms) {
      if (a.bFactor < bMin) bMin = a.bFactor;
      if (a.bFactor > bMax) bMax = a.bFactor;
    }
    if (!Number.isFinite(bMin)) { bMin = 0; bMax = 100; }
  }

  return (a) => {
    const ch = String(a.chain ?? "A");
    const resi = Number(a.resi ?? 0);
    if (mode === "chain") return chainColor(ch);
    if (mode === "element") {
      const el = String(a.elem ?? "C");
      if (el === "C") return "#A89880";
      if (el === "N") return "#5C8C6A";
      if (el === "O") return "#C4614A";
      if (el === "S") return "#C49A3A";
      if (el === "P") return "#B5845A";
      return "#7A6A52";
    }
    if (mode === "bfactor") return bFactorColor(a.b ?? 0, bMin, bMax);
    if (mode === "plddt" || isAlphafold) return pLDDTColor(a.b ?? 50);

    const chain = structure.chains.find((c) => c.id === ch);
    const res = chain?.residues.find((r) => r.resSeq === resi);
    if (!res) return "#A89880";

    if (mode === "ss") {
      if (res.ss === "H") return "#7D9B76";
      if (res.ss === "E") return "#B5845A";
      return "#A89880";
    }
    if (mode === "hydrophobicity") {
      const info = aaInfo(res.oneLetter);
      return info ? hydrophobicityColor(info.hydropathy) : "#A89880";
    }
    if (mode === "conservation") {
      const profile = conservationByChain.get(ch);
      if (!profile) return "#A89880";
      const idx = chain!.residues.indexOf(res);
      const v = profile[idx] ?? 0.5;
      // sage at 1, faded at 0
      const r = Math.round(168 + (125 - 168) * v);
      const g = Math.round(152 + (155 - 152) * v);
      const b = Math.round(128 + (118 - 128) * v);
      return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
    }
    return AA_CLASS_COLOR[aaInfo(res.oneLetter)?.class ?? "polar"] ?? "#A89880";
  };
}
