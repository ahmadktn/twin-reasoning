// src/api/index.js
// ─────────────────────────────────────────────────────────────────
// Single source of truth for the backend base URL.
// All API modules import from here — change one line to switch environments.
// ─────────────────────────────────────────────────────────────────

export const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// Debug: print API base so you can verify the frontend is using the expected backend URL
try {
	// eslint-disable-next-line no-console
	console.log("[DEBUG] API_BASE =", API_BASE);
} catch (e) {}
