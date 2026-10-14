import {create} from "zustand";
import {persist} from "zustand/middleware";

type ThemeMode = "light" | "medium" | "dark";
type ColorPalette = "indigo-coral" | "charcoal-blue";

interface ThemeState {
    mode : ThemeMode;
    palette : ColorPalette;
    setMode: (mode: ThemeMode) => void;
    setPalette: (palette : ColorPalette) => void;
}

export const useThemeStore = create<ThemeState>() (
    persist(
        (set) => ({
            mode : "light",
            palette: "indigo-coral",
            setMode: (mode) => set({ mode }),
            setPalette: (palette) => set({palette}),
        }),
        {name : "billsoft-theme"} //localstorage-key
    )
)