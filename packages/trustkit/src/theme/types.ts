export interface ThemePalette {
  emerald: string;
  pink: string;
  blue: string;
  amber: string;
  purple: string;
  rose: string;
  cyan: string;
  red: string;
  orange: string;
}

export interface ThemeSemantic {
  success: string;
  error: string;
  warning: string;
  info: string;
  thinking: string;
  observation: string;
  answer: string;
  user: string;
}

export interface ThemeText {
  primary: string;
  secondary: string;
  muted: string;
  subtle: string;
  faint: string;
  disabled: string;
  hint: string;
}

export interface ThemeSurface {
  base: string;
  overlay: string;
  overlayLight: string;
  card: string;
  cardHover: string;
}

export interface ThemeBorder {
  subtle: string;
  default: string;
  medium: string;
  grid: string;
}

export interface ThemeFont {
  mono: string;
  sans: string;
}

export interface Theme {
  palette: ThemePalette;
  semantic: ThemeSemantic;
  text: ThemeText;
  surface: ThemeSurface;
  border: ThemeBorder;
  font: ThemeFont;
}

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
