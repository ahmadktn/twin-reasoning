// src/context/AppContext.jsx
// ─────────────────────────────────────────────────────────────────
// Global App State
//
// Stores: selectedPersona, personas list, locale (en-US or en-NG)
//
// On mount: fetches the real persona list from GET /personas.
// The user cannot access the main app until they pick a persona.
//
// Any component can access these by calling: useApp()
//
// Example:
//   const { selectedPersona, personas, personasLoading, selectPersona } = useApp();
// ─────────────────────────────────────────────────────────────────

import { createContext, useContext, useState, useEffect } from "react";
import { fetchPersonas } from "../api/personas";

const AppContext = createContext(null);

/**
 * AppProvider
 * Wrap your whole app with this so every component can access global state.
 * It lives in main.jsx wrapping everything.
 */
export function AppProvider({ children }) {
  // null until the user picks one from the PersonaSelect screen
  const [selectedPersona, setSelectedPersona] = useState(null);

  // Full list loaded from GET /personas
  const [personas, setPersonas]           = useState([]);
  const [personasLoading, setPersonasLoading] = useState(true);
  const [personasError, setPersonasError]   = useState(null);

  // Language mode
  const [locale, setLocale] = useState("en-US");

  // ── Load personas from backend on mount ───────────────────────
  useEffect(() => {
    async function loadPersonas() {
      try {
        setPersonasLoading(true);
        setPersonasError(null);
        const data = await fetchPersonas();
        setPersonas(data);
      } catch (err) {
        console.error("Failed to load personas:", err);
        setPersonasError(
          "Could not connect to the backend. Make sure it is running at localhost:8000."
        );
      } finally {
        setPersonasLoading(false);
      }
    }
    loadPersonas();
  }, []);

  /**
   * selectPersona
   * Called from PersonaSelect page when the user picks a persona card.
   *
   * @param {object} persona - full persona object from the personas list
   */
  function selectPersona(persona) {
    setSelectedPersona(persona);
  }

  /**
   * toggleLocale
   * Switches between English and Nigerian Pidgin
   */
  function toggleLocale() {
    setLocale((prev) => (prev === "en-US" ? "en-NG" : "en-US"));
  }

  const value = {
    selectedPersona,      // the currently selected persona object (null until chosen)
    personas,             // full list for the selector screen
    personasLoading,      // true while fetching from backend
    personasError,        // error string if fetch failed
    selectPersona,        // function to pick a persona
    toggleLocale,         // function to toggle Naija mode
    locale,               // "en-US" or "en-NG"
    isNaija: locale === "en-NG",
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

/**
 * useApp
 * Custom hook — use this in any component to access global state
 * Throws a helpful error if used outside AppProvider
 */
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used inside AppProvider");
  }
  return context;
}