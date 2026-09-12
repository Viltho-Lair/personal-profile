"use client";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import type { ReactNode } from "react";

// MUI inherits the page palette rather than imposing one of its own.
const theme = createTheme({
  cssVariables: true,
  typography: { fontFamily: "var(--font-body-face)" },
  components: {
    MuiTypography: { defaultProps: { color: "inherit" } },
  },
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AppRouterCacheProvider options={{ enableCssLayer: true }}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </AppRouterCacheProvider>
  );
}
