// TEMPORARY — palette exploration for the Today page redesign.
// Delete this folder once a palette is chosen.

export type StatusKey = "atRisk" | "overdue" | "active" | "delivered";

export interface Palette {
  id: string;
  name: string;
  tagline: string;
  background: string; // page canvas
  backgroundTo: string; // second gradient stop (decorative)
  surface: string; // card surface
  border: string;
  primary: string;
  primaryHover: string;
  onPrimary: string;
  accent: string; // decorative accent / selected-pill fill
  accentText: string; // text placed on accent
  text: string;
  muted: string;
  status: Record<StatusKey, { fg: string; bg: string }>;
}

export const STATUS_LABEL: Record<StatusKey, string> = {
  atRisk: "At risk",
  overdue: "Overdue",
  active: "Active",
  delivered: "Delivered",
};

export const PALETTES: Palette[] = [
  {
    id: "lavender-linen",
    name: "Lavender Linen",
    tagline: "Lavender + warm beige",
    background: "#F5EFE6",
    backgroundTo: "#ECE6F5",
    surface: "#FFFCF8",
    border: "#E5DCCF",
    primary: "#5B4A8B",
    primaryHover: "#4A3B75",
    onPrimary: "#FFFFFF",
    accent: "#E4DAF3",
    accentText: "#3F3268",
    text: "#2B2533",
    muted: "#625A6C",
    status: {
      atRisk: { fg: "#8A4B00", bg: "#FBEAD2" },
      overdue: { fg: "#A3261F", bg: "#FAE4E1" },
      active: { fg: "#2B6A4E", bg: "#E1F0E7" },
      delivered: { fg: "#33588F", bg: "#E3EAF7" },
    },
  },
  {
    id: "plum-cream",
    name: "Plum & Cream",
    tagline: "Deep plum-indigo + cream",
    background: "#FAF6EC",
    backgroundTo: "#F0E8F0",
    surface: "#FFFFFF",
    border: "#E8DFCD",
    primary: "#3E2A5C",
    primaryHover: "#2E1F46",
    onPrimary: "#FFFFFF",
    accent: "#EBE1F1",
    accentText: "#3E2A5C",
    text: "#221B2B",
    muted: "#5D5567",
    status: {
      atRisk: { fg: "#874900", bg: "#FAE8CC" },
      overdue: { fg: "#9E211B", bg: "#F9E1DE" },
      active: { fg: "#2A644A", bg: "#DFEEE5" },
      delivered: { fg: "#30528A", bg: "#E1E8F5" },
    },
  },
  {
    id: "lilac-sage",
    name: "Lilac & Sage",
    tagline: "Soft lilac + sage",
    background: "#F2F4EE",
    backgroundTo: "#EDE9F6",
    surface: "#FFFFFF",
    border: "#DCE1D6",
    primary: "#614C9C",
    primaryHover: "#503D86",
    onPrimary: "#FFFFFF",
    accent: "#DCE8DE",
    accentText: "#3D5A45",
    text: "#20242A",
    muted: "#58606A",
    status: {
      atRisk: { fg: "#88500A", bg: "#FAEBD4" },
      overdue: { fg: "#A1281F", bg: "#F9E5E2" },
      active: { fg: "#3D6247", bg: "#E0ECE2" },
      delivered: { fg: "#3A5790", bg: "#E4EAF6" },
    },
  },
  {
    id: "lavender-slate",
    name: "Lavender & Slate",
    tagline: "Lavender + slate/charcoal (clinical)",
    background: "#F1F2F5",
    backgroundTo: "#EBE9F4",
    surface: "#FFFFFF",
    border: "#D9DCE4",
    primary: "#4F4A92",
    primaryHover: "#3F3B7B",
    onPrimary: "#FFFFFF",
    accent: "#E2E0F3",
    accentText: "#38346E",
    text: "#1C222D",
    muted: "#525B69",
    status: {
      atRisk: { fg: "#854A00", bg: "#F9E9D1" },
      overdue: { fg: "#A0241D", bg: "#F8E3E1" },
      active: { fg: "#26654B", bg: "#DFEEE6" },
      delivered: { fg: "#2F5588", bg: "#E1E8F3" },
    },
  },
  {
    id: "teal-mist",
    name: "Teal & Lavender Mist",
    tagline: "Wildcard: deep teal + lavender",
    background: "#EEF3F2",
    backgroundTo: "#ECE9F6",
    surface: "#FFFFFF",
    border: "#D5DFDD",
    primary: "#1D5B60",
    primaryHover: "#15484C",
    onPrimary: "#FFFFFF",
    accent: "#E3DEF4",
    accentText: "#3D3570",
    text: "#182426",
    muted: "#4D5D5F",
    status: {
      atRisk: { fg: "#874C00", bg: "#FAEAD2" },
      overdue: { fg: "#A2251E", bg: "#F9E4E1" },
      active: { fg: "#22654D", bg: "#DEEFE7" },
      delivered: { fg: "#4A3F8C", bg: "#E8E4F6" },
    },
  },
];

// WCAG 2.x relative luminance / contrast ratio.
function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export function contrastChecks(p: Palette): { label: string; fg: string; bg: string; ratio: number }[] {
  const pairs: [string, string, string][] = [
    ["Text / background", p.text, p.background],
    ["Text / surface", p.text, p.surface],
    ["Muted / surface", p.muted, p.surface],
    ["Muted / background", p.muted, p.background],
    ["White / primary", p.onPrimary, p.primary],
    ["Primary / surface", p.primary, p.surface],
    ["Selected pill", p.accentText, p.accent],
    ...(Object.keys(p.status) as StatusKey[]).map(
      (k): [string, string, string] => [`${STATUS_LABEL[k]} badge`, p.status[k].fg, p.status[k].bg],
    ),
  ];
  return pairs.map(([label, fg, bg]) => ({ label, fg, bg, ratio: contrast(fg, bg) }));
}
