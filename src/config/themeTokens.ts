import { theme, type ThemeConfig} from "antd"

type ThemeMode = "light" | "medium" | "dark";
type ColorPalette = "indigo-coral" | "charcoal-blue";

const paletteColors: Record<ColorPalette, Record<ThemeMode, { primary: string; accent: string }>> = {
  "indigo-coral": {
    light:  { primary: "#3B5BA0", accent: "#C1543A" },
    medium: { primary: "#3B5BA0", accent: "#AD4A32" },
    dark:   { primary: "#7C9CE0", accent: "#E08462" },
  },
  "charcoal-blue": {
    light:  { primary: "#3A4750", accent: "#3E7CB1" },
    medium: { primary: "#3A4750", accent: "#356E9E" },
    dark:   { primary: "#8FA0AA", accent: "#6BAEDD" },
  },
};

const modeSurfaces: Record<ThemeMode, { bg: string; container: string }> = {
  light:  { bg: "#FBFAF8", container: "#FFFFFF" },
  medium: { bg: "#E7E4DC", container: "#F1EEE7" },
  dark:   { bg: "#10161A", container: "#182022" },
};


export function buildThemeConfig(mode: ThemeMode, palette: ColorPalette): ThemeConfig {
  const colors = paletteColors[palette][mode];
  const surfaces = modeSurfaces[mode];

  return {
    algorithm: mode === "dark" ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorPrimary: colors.primary,
      colorInfo: colors.primary,
      colorBgBase: surfaces.bg,
      colorBgContainer: surfaces.container,
      colorError: mode === "dark" ? "#E17357" : "#B3432E",
      fontFamily: "'IBM Plex Sans', sans-serif",
      borderRadius: 8,
    },
    components: {
      Layout: {
        siderBg: mode === "dark" ? "#0B1210" : "#14201D",
      },
      Menu: {
        darkItemSelectedBg: colors.primary,
        darkItemSelectedColor: "#FFFFFF",
      }
    },
  };
}