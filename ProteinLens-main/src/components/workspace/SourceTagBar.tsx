import { Copy, Download } from "lucide-react";
import { toast } from "sonner";

interface Props {
  mode: "alphafold" | "experimental";
  identifier: string;        // e.g. AF-A0A2K6V5L6-F1-v6 or 4HHB
  dataset: string;           // e.g. AlphaFold / Google DeepMind dataset, RCSB PDB
  downloadUrl?: string;
  organism?: string;
  monomerLabel?: string;     // e.g. "Monomer", "Tetramer"
}

export function SourceTagBar({ mode, identifier, dataset, downloadUrl, organism, monomerLabel }: Props) {
  const isAf = mode === "alphafold";
  const accentVar = isAf ? "var(--color-sandalwood)" : "var(--color-sage)";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(identifier);
      toast.success(`Copied ${identifier}`);
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 px-5 py-2 bg-surface/60 border-b border-border overflow-x-auto">
      <div className="flex items-center gap-2 text-[11px] font-mono">
        <Pill accent={accentVar}>{monomerLabel ?? "Monomer"}</Pill>
        <Sep />
        <Pill accent={accentVar} prominent>{identifier}</Pill>
        <Sep />
        <Pill muted>{dataset}</Pill>
        {organism && (
          <>
            <Sep />
            <Pill muted italic>{organism}</Pill>
          </>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={copy}
          className="p-1.5 rounded-full text-taupe hover:bg-card hover:text-foreground transition-all"
          title="Copy identifier"
        >
          <Copy className="size-3.5" />
        </button>
        {downloadUrl && (
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-full text-taupe hover:bg-card hover:text-foreground transition-all"
            title="Download structure"
          >
            <Download className="size-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

function Pill({ children, accent, prominent, muted, italic }: { children: React.ReactNode; accent?: string; prominent?: boolean; muted?: boolean; italic?: boolean }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full border ${italic ? "italic" : ""} ${
        prominent
          ? "bg-card text-foreground border-border-strong"
          : muted
          ? "bg-transparent text-taupe border-border"
          : "bg-card text-foreground border-border"
      }`}
      style={accent && !muted ? { borderLeftColor: accent, borderLeftWidth: 2 } : undefined}
    >
      {children}
    </span>
  );
}

function Sep() {
  return <span className="text-faded">·</span>;
}
