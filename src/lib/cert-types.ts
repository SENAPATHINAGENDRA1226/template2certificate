export type TextAlign = "left" | "center" | "right";

export interface Placeholder {
  id: string;
  label: string;
  /** relative to natural template size, 0..1 (top-left of box) */
  xRel: number;
  yRel: number;
  /** box width relative to natural width, 0..1 */
  wRel: number;
  /** font size relative to natural template height, 0..1 */
  fontRel: number;
  fontFamily: string;
  color: string;
  align: TextAlign;
  bold: boolean;
  italic: boolean;
  /** optional static text used when no column mapped */
  sample: string;
}

export interface TemplateProfile {
  id: string;
  name: string;
  placeholders: Placeholder[];
  createdAt: number;
}

export const FONT_FAMILIES = [
  "Georgia",
  "Times New Roman",
  "Playfair Display",
  "Helvetica",
  "Arial",
  "Courier New",
  "Garamond",
  "Trebuchet MS",
];

export function createPlaceholder(partial?: Partial<Placeholder>): Placeholder {
  return {
    id: crypto.randomUUID(),
    label: "New Field",
    xRel: 0.3,
    yRel: 0.45,
    wRel: 0.4,
    fontRel: 0.05,
    fontFamily: "Georgia",
    color: "#1a1a2e",
    align: "center",
    bold: false,
    italic: false,
    sample: "Sample Text",
    ...partial,
  };
}