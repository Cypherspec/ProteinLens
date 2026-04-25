interface Props {
  mode: "alphafold" | "experimental";
  method?: string;
  resolution?: number;
}

export function AlphafoldBanner({ mode, method, resolution }: Props) {
  if (mode === "alphafold") {
    return (
      <div className="flex items-start gap-2 px-4 py-2 rounded-xl bg-surface border-l-2 border-sandalwood text-xs text-foreground/85">
        <span className="text-sandalwood text-base leading-none mt-0.5">⚠</span>
        <p className="leading-relaxed">
          <span className="font-medium text-foreground">Predicted structure</span> — not experimentally determined. Confidence varies by region; consult the pLDDT legend before drawing biological conclusions.
        </p>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2 px-4 py-2 rounded-xl bg-surface border-l-2 border-sage text-xs text-foreground/85">
      <span className="text-sage text-base leading-none mt-0.5">✓</span>
      <p className="leading-relaxed">
        <span className="font-medium text-foreground">Experimentally determined</span>
        {method && ` by ${method.replace("X-RAY DIFFRACTION", "X-ray diffraction")}`}
        {resolution !== undefined && ` at ${resolution.toFixed(2)} Å resolution`}.
      </p>
    </div>
  );
}
