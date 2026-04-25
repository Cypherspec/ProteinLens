// Color palette helpers for chains, secondary structure, and warm tones.

const CHAIN_PALETTE = [
  "#7D9B76", // sage
  "#B5845A", // sandalwood
  "#C4A882", // linen
  "#A89880", // faded
  "#C49A3A", // honey
  "#5C8C6A", // forest
  "#8DAF86", // sage-light
  "#9B7853", // wood
  "#C4614A", // terracotta
  "#7A6A52", // taupe
  "#D4B896", // cream
  "#6B7F5C", // moss
];

export function chainColor(id: string): string {
  if (!id) return CHAIN_PALETTE[0];
  const code = id.charCodeAt(0) - "A".charCodeAt(0);
  return CHAIN_PALETTE[((code % CHAIN_PALETTE.length) + CHAIN_PALETTE.length) % CHAIN_PALETTE.length];
}

export const SS_COLORS = {
  H: "#7D9B76", // sage
  E: "#B5845A", // sandalwood
  C: "#A89880", // faded
};

export const PHYSICOCHEMICAL_COLOR: Record<string, string> = {
  hydrophobic: "#B5845A",
  polar:       "#7D9B76",
  positive:    "#C49A3A",
  negative:    "#C4614A",
  special:     "#C4A882",
  aromatic:    "#5C8C6A",
};

export function pLDDTColor(score: number): string {
  // Standard AlphaFold legend remapped to warm palette.
  if (score >= 90) return "#5C8C6A";   // very high
  if (score >= 70) return "#7D9B76";   // confident
  if (score >= 50) return "#C49A3A";   // low
  return "#C4614A";                    // very low
}

export function bFactorColor(b: number, min: number, max: number): string {
  // Warm gradient: sage (rigid) → linen → terracotta (flexible)
  const t = max > min ? (b - min) / (max - min) : 0.5;
  const stops: [number, string][] = [
    [0,    "#7D9B76"],
    [0.5,  "#C4A882"],
    [1,    "#C4614A"],
  ];
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [t0, c0] = stops[i - 1];
      const [t1, c1] = stops[i];
      return mix(c0, c1, (t - t0) / (t1 - t0));
    }
  }
  return stops[stops.length - 1][1];
}

export function hydrophobicityColor(h: number): string {
  // -4.5 hydrophilic → 4.5 hydrophobic
  const t = Math.max(0, Math.min(1, (h + 4.5) / 9));
  return mix("#7D9B76", "#B5845A", t);
}

function mix(a: string, b: string, t: number): string {
  const ah = parseInt(a.slice(1), 16);
  const bh = parseInt(b.slice(1), 16);
  const ar = (ah >> 16) & 255, ag = (ah >> 8) & 255, ab = ah & 255;
  const br = (bh >> 16) & 255, bg = (bh >> 8) & 255, bb = bh & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return "#" + ((r << 16) | (g << 8) | bl).toString(16).padStart(6, "0");
}
