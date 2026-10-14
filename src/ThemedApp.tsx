import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider } from "antd";
import { useThemeStore } from "./store/themeStore";
import { buildThemeConfig } from "./config/themeTokens";
import { App } from "./App";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function ThemedApp() {
  const mode = useThemeStore((s) => s.mode);
  const palette = useThemeStore((s) => s.palette);

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={buildThemeConfig(mode, palette)}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ConfigProvider>
    </QueryClientProvider>
  );
}