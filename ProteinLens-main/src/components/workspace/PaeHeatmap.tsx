import { useEffect, useRef, useState, useCallback } from "react";
import type { PaeMatrix } from "@/lib/bio/alphafold";

interface Props {
  pae: PaeMatrix;
  onResiduePair?: (i: number, j: number) => void;
  onZoomPair?: (i: number, j: number) => void;
}

// Color: low error (high confidence) → sage; high error → terracotta.
function paeColor(value: number, max: number): string {
  const t = Math.max(0, Math.min(1, value / max));
  // 0 → sage-deep, 0.5 → linen, 1 → terracotta
  const stops: [number, [number, number, number]][] = [
    [0,    [92, 140, 106]],   // #5C8C6A
    [0.35, [125, 155, 118]],  // #7D9B76
    [0.7,  [196, 168, 130]],  // #C4A882 linen
    [1,    [196, 97, 74]],    // #C4614A terracotta
  ];
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [t0, c0] = stops[i - 1];
      const [t1, c1] = stops[i];
      const k = (t - t0) / (t1 - t0);
      const r = Math.round(c0[0] + (c1[0] - c0[0]) * k);
      const g = Math.round(c0[1] + (c1[1] - c0[1]) * k);
      const b = Math.round(c0[2] + (c1[2] - c0[2]) * k);
      return `rgb(${r},${g},${b})`;
    }
  }
  return `rgb(196,97,74)`;
}

export function PaeHeatmap({ pae, onResiduePair, onZoomPair }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ i: number; j: number; v: number } | null>(null);
  const [crosshair, setCrosshair] = useState<{ i: number; j: number } | null>(null);
  const [size, setSize] = useState(420);

  useEffect(() => {
    const update = () => {
      const w = wrapRef.current?.clientWidth ?? 420;
      setSize(Math.min(Math.max(280, w), 520));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);

    const n = pae.size;
    // Render via ImageData for speed
    const img = ctx.createImageData(n, n);
    for (let i = 0; i < n; i++) {
      const row = pae.data[i];
      for (let j = 0; j < n; j++) {
        const c = paeColor(row[j], pae.max);
        const m = c.match(/rgb\((\d+),(\d+),(\d+)\)/);
        const idx = (i * n + j) * 4;
        img.data[idx] = m ? +m[1] : 0;
        img.data[idx + 1] = m ? +m[2] : 0;
        img.data[idx + 2] = m ? +m[3] : 0;
        img.data[idx + 3] = 255;
      }
    }
    // upscale via offscreen canvas
    const off = document.createElement("canvas");
    off.width = n; off.height = n;
    off.getContext("2d")!.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(off, 0, 0, size, size);

    // Tick marks every 50
    ctx.strokeStyle = "rgba(168, 152, 128, 0.35)";
    ctx.lineWidth = 0.5;
    ctx.fillStyle = "rgba(122, 106, 82, 0.85)";
    ctx.font = "9px 'DM Mono', monospace";
    for (let r = 50; r < n; r += 50) {
      const p = (r / n) * size;
      ctx.beginPath();
      ctx.moveTo(p, 0); ctx.lineTo(p, 4); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, p); ctx.lineTo(4, p); ctx.stroke();
      ctx.fillText(String(r), p + 2, 9);
      ctx.fillText(String(r), 2, p - 2);
    }

    // Crosshair
    if (crosshair) {
      const cx = ((crosshair.j + 0.5) / n) * size;
      const cy = ((crosshair.i + 0.5) / n) * size;
      ctx.strokeStyle = "rgba(44, 36, 22, 0.8)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(cx, 0); ctx.lineTo(cx, size);
      ctx.moveTo(0, cy); ctx.lineTo(size, cy);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#2C2416";
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [pae, size, crosshair]);

  const cellAt = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const j = Math.max(0, Math.min(pae.size - 1, Math.floor((x / size) * pae.size)));
    const i = Math.max(0, Math.min(pae.size - 1, Math.floor((y / size) * pae.size)));
    return { i, j };
  }, [pae.size, size]);

  return (
    <div ref={wrapRef} className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h4 className="font-display text-lg">Predicted Aligned Error</h4>
        <span className="text-[10px] font-mono text-faded">{pae.size} × {pae.size}</span>
      </div>
      <p className="text-xs text-taupe leading-snug">
        Expected position error in Å when residue <span className="font-mono">i</span> is the reference.
        Low error (sage) indicates well-defined relative position; high error (terracotta) indicates uncertainty.
      </p>

      <div className="relative inline-block">
        {/* Y-axis label */}
        <div
          className="absolute -left-6 top-1/2 -translate-y-1/2 -rotate-90 text-[9px] uppercase tracking-wider text-faded font-mono whitespace-nowrap"
          style={{ transformOrigin: "center" }}
        >
          Aligned residue
        </div>
        <canvas
          ref={canvasRef}
          className="rounded-lg border border-border-strong bg-surface cursor-crosshair"
          onMouseMove={(e) => {
            const { i, j } = cellAt(e);
            const v = pae.data[i]?.[j] ?? 0;
            setHover({ i, j, v });
            onResiduePair?.(i + 1, j + 1);
          }}
          onMouseLeave={() => setHover(null)}
          onClick={(e) => {
            const { i, j } = cellAt(e);
            setCrosshair({ i, j });
            onZoomPair?.(i + 1, j + 1);
          }}
        />
        {hover && (
          <div
            className="absolute pointer-events-none rounded-lg bg-card border border-border-strong px-2.5 py-1.5 shadow-warm-lg text-[10px] font-mono text-foreground"
            style={{
              left: Math.min(((hover.j + 1) / pae.size) * size + 8, size - 130),
              top: Math.min(((hover.i + 1) / pae.size) * size + 8, size - 40),
            }}
          >
            Residues {hover.i + 1}–{hover.j + 1}
            <br />
            <span className="text-taupe">~{hover.v.toFixed(1)} Å expected error</span>
          </div>
        )}
      </div>

      <p className="text-[9px] uppercase tracking-wider text-faded font-mono mt-1">Scored residue →</p>

      {/* Color scale bar */}
      <div className="pt-2">
        <div
          className="h-2 rounded-full"
          style={{
            background:
              "linear-gradient(90deg, #5C8C6A 0%, #7D9B76 35%, #C4A882 70%, #C4614A 100%)",
          }}
        />
        <div className="flex justify-between mt-1 text-[9px] font-mono text-faded">
          <span>0</span><span>5</span><span>10</span><span>15</span><span>20</span><span>25</span><span>30 Å</span>
        </div>
      </div>

      {crosshair && (
        <div className="text-[10px] font-mono text-taupe pt-1">
          Locked: residues <span className="text-foreground">{crosshair.i + 1}</span> & <span className="text-foreground">{crosshair.j + 1}</span> — expected error ~{(pae.data[crosshair.i]?.[crosshair.j] ?? 0).toFixed(1)} Å
          <button onClick={() => setCrosshair(null)} className="ml-2 text-faded hover:text-terracotta">clear</button>
        </div>
      )}
    </div>
  );
}
