export const PALETTE = {
  navy: "#0B2545",
  teal: "#13C4A3",
  gold: "#F4A261",
  orange: "#E76F51",
  white: "#F8F9FA",
};

export type BridgeKind =
  | "cable"
  | "haunched"
  | "girder"
  | "cantilever"
  | "arch"
  | "small";

export type BridgeInfo = {
  no: number;
  name: string;
  from: string;
  to: string;
  length: number;
  kind: BridgeKind;
  kindLabel: string;
  deckY: number;
};

// Data panjang & tipe sudah dicek, lihat NOTES.md.
export const BRIDGES: BridgeInfo[] = [
  { no: 1, name: "Tengku Fisabilillah", from: "Batam", to: "Tonton", length: 642, kind: "cable", kindLabel: "Kabel pancang", deckY: 38 },
  { no: 2, name: "Nara Singa", from: "Tonton", to: "Nipah", length: 420, kind: "haunched", kindLabel: "Kantilever", deckY: 34 },
  { no: 3, name: "Raja Ali Haji", from: "Nipah", to: "Setokok", length: 270, kind: "girder", kindLabel: "Gelagar", deckY: 24 },
  { no: 4, name: "Sultan Zainal Abidin", from: "Setokok", to: "Rempang", length: 365, kind: "cantilever", kindLabel: "Kantilever", deckY: 32 },
  { no: 5, name: "Tuanku Tambusai", from: "Rempang", to: "Galang", length: 385, kind: "arch", kindLabel: "Pelengkung", deckY: 44 },
  { no: 6, name: "Raja Kecik", from: "Galang", to: "Galang Baru", length: 180, kind: "small", kindLabel: "Jembatan terpendek", deckY: 18 },
];
