// Enterprise dashboard hex palette for charts — matches the hardcoded hex
// colors already used throughout enterprise/ui.tsx (#1d4ed8 primary etc.),
// not the CSS-variable tokens packages/ui primitives use.
export const CHART_COLORS = {
  primary: "#1d4ed8",
  secondary: "#0ea5e9",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  accent: "#8b5cf6",
} as const;

export const CATEGORICAL_PALETTE: string[] = [
  CHART_COLORS.primary,
  CHART_COLORS.secondary,
  CHART_COLORS.success,
  CHART_COLORS.warning,
  CHART_COLORS.danger,
  CHART_COLORS.accent,
];
