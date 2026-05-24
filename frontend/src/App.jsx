// src/App.jsx
// ─────────────────────────────────────────────────────────────────
// Router — maps URL paths to page components
//
// /            → HomeFeed
// /item/:id    → ItemDetail
// /chat        → TwinChat
// /dashboard   → Dashboard
// /eval        → EvalPanel (hidden from nav, judges only)
//
// If no persona has been selected yet, PersonaSelect is shown instead.
// Header and Footer live outside Routes so they appear on every page.
// ─────────────────────────────────────────────────────────────────

import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Box } from "@chakra-ui/react";
import { useApp } from "./context/AppContext";
import Header from "./components/Header";
import Footer from "./components/Footer";
import PersonaSelect from "./pages/PersonaSelect";
import HomeFeed from "./pages/HomeFeed";
import ItemDetail from "./pages/ItemDetail";
import TwinChat from "./pages/TwinChat";
import Dashboard from "./pages/Dashboard";
import EvalPanel from "./pages/EvalPanel";

export default function App() {
  const { selectedPersona } = useApp();

  // ── Gate: show persona selector until a twin is chosen ────────
  if (!selectedPersona) {
    return <PersonaSelect />;
  }

  // ── Main app ──────────────────────────────────────────────────
  return (
    <BrowserRouter>
      {/* Header is outside Routes — appears on every page */}
      <Header />

      {/* Main content area — fills the screen between header and footer */}
      <Box
        as="main"
        minH="calc(100vh - 120px)"
        bg="gray.50"
        _dark={{ bg: "gray.900" }}
      >
        <Routes>
          <Route path="/"            element={<HomeFeed />}   />
          <Route path="/item/:itemId" element={<ItemDetail />} />
          <Route path="/chat"        element={<TwinChat />}   />
          <Route path="/dashboard"   element={<Dashboard />}  />
          <Route path="/eval"        element={<EvalPanel />}  />
        </Routes>
      </Box>

      {/* Footer is outside Routes — appears on every page */}
      <Footer />
    </BrowserRouter>
  );
}