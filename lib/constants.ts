export const CATEGORIES = [
  { name: "Paper & Board", color: "#0f6e6b" },
  { name: "Ink & Toner", color: "#1d4e89" },
  { name: "Plates", color: "#8a5a00" },
  { name: "Press Chemicals", color: "#6b3f69" },
  { name: "Finishing", color: "#3f5c45" },
  { name: "Packaging", color: "#8c3a3a" },
  { name: "Machine Parts", color: "#3d4a5c" },
] as const;

export const CATEGORY_NAMES: string[] = CATEGORIES.map((category) => category.name);

export const UNITS = [
  "Ream",
  "Sheet",
  "Packet",
  "Can",
  "Kg",
  "Litre",
  "Roll",
  "Piece",
  "Meter",
  "Box",
  "Set",
  "Cartridge",
] as const;

export const LOCATIONS = [
  "Rack A1",
  "Rack A2",
  "Rack A3",
  "Warehouse",
  "Ink Store",
  "Plate Rack",
  "Chemical Cage",
  "Finishing Bay",
  "Dispatch",
  "Parts Room",
] as const;

export const REASONS = [
  "Production",
  "Wastage",
  "Sample / proof",
  "Return to stock",
  "Physical count",
  "Other",
] as const;

export function categoryColor(name: string) {
  return CATEGORIES.find((category) => category.name === name)?.color ?? "#5c5346";
}
