// Curated dossier for famous proteins — used as a fallback / enrichment when
// RCSB / UniProt annotations are sparse, and to power the "Fun Facts" card.

export interface ProteinDossier {
  pdbId: string;
  name: string;
  gene?: string;
  organism?: string;
  discovery?: string;
  nobel?: string;
  function: string;
  context: string;
  whyItMatters: string;
  highlights: string[];
}

export const KNOWN_PROTEINS: Record<string, ProteinDossier> = {
  "4HHB": {
    pdbId: "4HHB",
    name: "Hemoglobin (deoxy form)",
    gene: "HBA1 / HBB",
    organism: "Homo sapiens",
    discovery: "First atomic structure solved by Max Perutz (1959, refined 1968).",
    nobel: "Nobel Prize in Chemistry 1962 — Perutz & Kendrew.",
    function: "Tetrameric oxygen transport protein in red blood cells. Each subunit contains a heme iron that binds O₂ reversibly.",
    context: "Hemoglobin's allosteric T↔R transition is the textbook example of cooperative binding — a touchstone for all protein biophysics.",
    whyItMatters: "Mutations in β-globin cause sickle-cell disease (HbS, E6V) and thalassemias — the first molecular diseases ever defined.",
    highlights: ["Heme prosthetic group", "α₂β₂ tetramer", "Cooperative O₂ binding (Hill coefficient ≈ 2.8)", "Bohr effect (pH-linked O₂ release)"],
  },
  "1MSO": {
    pdbId: "1MSO",
    name: "Insulin (human, T6 hexamer)",
    gene: "INS",
    organism: "Homo sapiens",
    discovery: "Sequenced by Frederick Sanger (1955); first crystal structure by Dorothy Hodgkin (1969).",
    nobel: "Nobel Prizes — Sanger 1958, Hodgkin 1964.",
    function: "Peptide hormone regulating glucose uptake; secreted by pancreatic β-cells in response to elevated blood glucose.",
    context: "Two chains (A 21 aa, B 30 aa) joined by three disulfide bonds. Stored as a Zn²⁺-coordinated hexamer in secretory granules.",
    whyItMatters: "First protein produced recombinantly (Genentech, 1978). Daily therapy for ~9 million people with type-1 diabetes.",
    highlights: ["Two disulfide-linked chains", "Zn²⁺-stabilized hexamer", "Furin-cleaved from proinsulin", "First recombinant therapeutic protein"],
  },
  "1LYZ": {
    pdbId: "1LYZ",
    name: "Hen egg-white lysozyme",
    gene: "LYZ",
    organism: "Gallus gallus",
    discovery: "Discovered by Alexander Fleming (1922) when nasal mucus dissolved bacteria; first enzyme structure by David Phillips (1965).",
    nobel: "Cited in Phillips' Royal Society lecture as the first enzyme mechanism elucidated structurally.",
    function: "Glycoside hydrolase that cleaves β-(1→4) bonds between N-acetylmuramic acid and N-acetylglucosamine in bacterial peptidoglycan.",
    context: "129-residue single chain with four disulfide bonds. The Glu35/Asp52 catalytic dyad established the substrate-distortion mechanism.",
    whyItMatters: "Workhorse of structural biology — the first enzyme whose 3D structure revealed how catalysis works.",
    highlights: ["Glu35 / Asp52 catalytic dyad", "α + β fold with deep cleft", "Antibacterial in tears, saliva, egg white", "Substrate-distortion catalysis"],
  },
  "1CGD": {
    pdbId: "1CGD",
    name: "Collagen-like peptide",
    organism: "Synthetic / Homo sapiens analog",
    function: "Triple-helical structural protein — the most abundant protein in the human body (≈30% of total protein mass).",
    context: "Characteristic Gly-X-Y repeat (X often Pro, Y often hydroxyproline) packs three left-handed PPII helices into a right-handed superhelix.",
    whyItMatters: "Forms tendons, skin, bone matrix, blood-vessel walls. Mutations cause osteogenesis imperfecta and Ehlers-Danlos syndrome.",
    highlights: ["Gly-X-Y repeat", "Triple helix", "Hydroxyproline stabilization", "Most abundant protein in animals"],
  },
  "1MBO": {
    pdbId: "1MBO",
    name: "Myoglobin (oxy form, sperm whale)",
    gene: "MB",
    organism: "Physeter catodon",
    discovery: "First protein structure ever solved — John Kendrew, 1958, at 6 Å resolution; refined to 1.4 Å.",
    nobel: "Nobel Prize in Chemistry 1962 — Kendrew & Perutz.",
    function: "Oxygen-storage protein in muscle — binds O₂ via a heme iron and releases it during high oxygen demand.",
    context: "Eight α-helices (A–H) form a globin fold cradling a single heme group. Sperm-whale myoglobin tolerates hypoxia during deep dives.",
    whyItMatters: "The molecule that started structural biology — its electron density map was the first to show a protein in atomic detail.",
    highlights: ["First protein structure solved", "Globin fold (8 α-helices)", "Single heme — non-cooperative O₂ binding", "Stores O₂ in muscle"],
  },
  "1EMA": {
    pdbId: "1EMA",
    name: "Green Fluorescent Protein (GFP)",
    gene: "gfp",
    organism: "Aequorea victoria",
    discovery: "Cloned by Douglas Prasher (1992); engineered as a tracer by Martin Chalfie & Roger Tsien (1994).",
    nobel: "Nobel Prize in Chemistry 2008 — Shimomura, Chalfie, Tsien.",
    function: "Auto-catalytic fluorophore — its chromophore (Ser65-Tyr66-Gly67) cyclizes spontaneously inside an 11-strand β-barrel.",
    context: "Excited at ~395/475 nm, emits at 509 nm. The β-barrel shields the chromophore so fluorescence requires no cofactors.",
    whyItMatters: "Revolutionized cell biology — every fluorescent reporter, biosensor, and optogenetic tool descends from GFP.",
    highlights: ["β-can / barrel fold", "Auto-catalytic chromophore (Ser-Tyr-Gly)", "Bright at 509 nm", "Foundation of modern live-cell imaging"],
  },
};
