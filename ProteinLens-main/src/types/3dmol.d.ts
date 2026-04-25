// Minimal type shim for 3Dmol.js loaded via CDN <script> tag.
// Full API: https://3dmol.csb.pitt.edu/doc/

declare global {
  interface Window {
    $3Dmol?: ThreeDmol.Root;
  }
}

export namespace ThreeDmol {
  export interface AtomSpec {
    chain?: string;
    resi?: number | number[] | string;
    resn?: string | string[];
    atom?: string | string[];
    elem?: string | string[];
    hetflag?: boolean;
    bonds?: number[];
    serial?: number;
    b?: number;
    pdbline?: string;
    properties?: Record<string, unknown>;
    color?: number | string;
    style?: StyleSpec;
    [k: string]: unknown;
  }

  export interface StyleSpec {
    cartoon?: { color?: string | number | ((a: AtomSpec) => string | number); style?: string; thickness?: number; opacity?: number; arrows?: boolean };
    stick?: { radius?: number; color?: string | number; opacity?: number };
    sphere?: { radius?: number; scale?: number; color?: string | number; opacity?: number };
    line?: { linewidth?: number; color?: string | number };
    surface?: { opacity?: number; color?: string | number };
    [k: string]: unknown;
  }

  export interface SurfaceSpec {
    opacity?: number;
    color?: string | number;
    colorscheme?: unknown;
    map?: unknown;
  }

  export interface LabelSpec {
    backgroundColor?: string | number;
    backgroundOpacity?: number;
    fontColor?: string | number;
    fontSize?: number;
    borderThickness?: number;
    borderColor?: string | number;
    inFront?: boolean;
    position?: { x: number; y: number; z: number };
    showBackground?: boolean;
    alignment?: string;
  }

  export interface Viewer {
    addModel(data: string, format: string, options?: unknown): unknown;
    removeAllModels(): void;
    removeAllSurfaces(): void;
    removeAllLabels(): void;
    removeAllShapes(): void;
    setStyle(sel: AtomSpec | Record<string, unknown>, style: StyleSpec): void;
    addStyle(sel: AtomSpec | Record<string, unknown>, style: StyleSpec): void;
    addSurface(type: number, spec: SurfaceSpec, sel?: AtomSpec): unknown;
    addLabel(text: string, opts: LabelSpec): unknown;
    removeLabel(label: unknown): void;
    addLine(spec: { start: { x: number; y: number; z: number }; end: { x: number; y: number; z: number }; dashed?: boolean; color?: string | number; radius?: number }): unknown;
    addCylinder(spec: unknown): unknown;
    addSphere(spec: unknown): unknown;
    setBackgroundColor(color: number | string, alpha?: number): void;
    zoomTo(sel?: AtomSpec, duration?: number): void;
    zoom(factor: number, duration?: number): void;
    center(sel?: AtomSpec): void;
    spin(axis?: string | boolean): void;
    render(): void;
    resize(): void;
    rotate(angle: number, axis?: string): void;
    setSlab(near: number, far: number): void;
    setProjection(p: string): void;
    selectedAtoms(sel: AtomSpec): AtomSpec[];
    setHoverable(sel: AtomSpec, hoverable: boolean, onhover: (a: AtomSpec, v: Viewer, ev: unknown, c: HTMLElement) => void, onunhover: (a: AtomSpec) => void): void;
    setClickable(sel: AtomSpec, clickable: boolean, callback: (a: AtomSpec, v: Viewer, ev: unknown, c: HTMLElement) => void): void;
    enableFog(enabled: boolean): void;
    setView(view: number[]): void;
    getView(): number[];
    pngURI(): string;
    getModel(id?: number): { selectedAtoms(sel: AtomSpec): AtomSpec[] } | null;
  }

  export interface Root {
    createViewer(el: HTMLElement | string, config?: { backgroundColor?: string | number; backgroundAlpha?: number; antialias?: boolean; cartoonQuality?: number; ambientOcclusion?: boolean }): Viewer;
    SurfaceType: { VDW: number; MS: number; SAS: number; SES: number };
    elementColors: Record<string, Record<string, number>>;
  }
}

export {};
