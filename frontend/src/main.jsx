// src/main.jsx
// ─────────────────────────────────────────────────────────────────
// Entry Point — React starts here.
//
// Two providers wrap everything:
// 1. ChakraProvider  — Chakra UI components + our custom theme
// 2. AppProvider     — global state (selected user, locale)
// ─────────────────────────────────────────────────────────────────

import React from "react";
import ReactDOM from "react-dom/client";
import { ChakraProvider, extendTheme, ColorModeScript } from "@chakra-ui/react";
import { AppProvider } from "./context/AppContext";
import App from "./App";
import "./index.css";

// Custom theme using the Figma design guide colours
const theme = extendTheme({
  config: {
    initialColorMode: "light",    // start in light mode
    useSystemColorMode: false,    // ignore the OS dark/light setting
  },
  fonts: {
    heading: "Inter, -apple-system, sans-serif",
    body: "Inter, -apple-system, sans-serif",
  },
  colors: {
    // Primary — deep teal from Figma guide
    brand: {
      50:  "#e6f0f2",
      100: "#cce1e6",
      200: "#99c3cd",
      300: "#66a5b3",
      400: "#33879a",
      500: "#0F4C5C",  // main primary colour
      600: "#0c3d4a",
      700: "#092e37",
      800: "#061e25",
      900: "#030f12",
    },
    // Accent — warm orange from Figma guide
    accent: {
      50:  "#fdf0e6",
      100: "#fae1cd",
      200: "#f5c39b",
      300: "#f0a569",
      400: "#eb8737",
      500: "#E67E22",  // main accent colour
      600: "#b8651b",
      700: "#8a4c14",
      800: "#5c320e",
      900: "#2e1907",
    },
  },
  styles: {
    global: (props) => ({
      body: {
        bg: props.colorMode === "dark" ? "#121212" : "#F9F9FB",
        color: props.colorMode === "dark" ? "#EDEDED" : "#1E2A3A",
      },
    }),
  },
  components: {
    Button: {
      defaultProps: {
        colorScheme: "brand",
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* ColorModeScript MUST be before ChakraProvider — fixes dark mode flash on load */}
    <ColorModeScript initialColorMode={theme.config.initialColorMode} />
    <ChakraProvider theme={theme}>
      <AppProvider>
        <App />
      </AppProvider>
    </ChakraProvider>
  </React.StrictMode>
);