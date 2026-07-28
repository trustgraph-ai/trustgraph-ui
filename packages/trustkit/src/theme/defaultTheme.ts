import { palette, semantic, text, surface, border } from "./colors";
import type { Theme } from "./types";

export const defaultTheme: Theme = {
  palette: { ...palette },
  semantic: { ...semantic },
  text: { ...text },
  surface: { ...surface },
  border: { ...border },
};
