// src/api/personas.js
// ─────────────────────────────────────────────────────────────────
// Personas API — GET /personas, GET /personas/{id}
// These are the "Digital Twin" user profiles loaded from the backend.
// ─────────────────────────────────────────────────────────────────

import { API_BASE } from "./index";

// In-memory cache to avoid duplicate API calls
const cache = {
  personas: null,
  personaById: new Map(),
  twinById: new Map(),
  recsById: new Map()
};

/**
 * fetchPersonas
 * Loads the curated list of personas available for selection.
 * Called once at startup by AppContext.
 *
 * @returns {Array} - array of persona objects:
 *   { id, num_reviews, avg_rating, rating_std, review_style,
 *     products_reviewed_count, rating_distribution }
 */
export async function fetchPersonas() {
  if (cache.personas) return cache.personas;
  
  const response = await fetch(`${API_BASE}/personas`);
  if (!response.ok) {
    throw new Error(`Failed to load personas: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  cache.personas = data;
  return data;
}

/**
 * createPersona
 * Creates a new fresh persona by hitting POST /personas
 */
export async function createPersona(reviewStyle) {
  const response = await fetch(`${API_BASE}/personas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ review_style: reviewStyle, avg_rating: 4.5 }),
  });
  if (!response.ok) {
    throw new Error(`Failed to create persona: ${response.status}`);
  }
  const newPersona = await response.json();
  
  // Add to cache so it shows up in list if fetched again
  if (cache.personas) {
    cache.personas.unshift(newPersona);
  }
  return newPersona;
}

/**
 * fetchPersona
 * Gets a single persona by ID.
 * Used by the Twin Dashboard page.
 *
 * @param {string} personaId
 * @returns {object} - persona detail object
 */
export async function fetchPersona(personaId) {
  if (cache.personaById.has(personaId)) return cache.personaById.get(personaId);

  const response = await fetch(`${API_BASE}/personas/${personaId}`);
  if (!response.ok) {
    throw new Error(`Persona not found: ${personaId}`);
  }
  const data = await response.json();
  cache.personaById.set(personaId, data);
  return data;
}

/**
 * fetchTwin
 * Gets the full twin profile (richer data than personas endpoint).
 * Used by Dashboard to show review history stats.
 *
 * @param {string} personaId
 * @returns {object} - twin profile:
 *   { id, avg_rating, num_reviews, rating_std, rating_distribution,
 *     review_samples, products_reviewed_count, top_products }
 */
export async function fetchTwin(personaId) {
  if (cache.twinById.has(personaId)) return cache.twinById.get(personaId);

  const response = await fetch(`${API_BASE}/twins/${personaId}`);
  if (!response.ok) {
    throw new Error(`Twin not found: ${personaId}`);
  }
  const data = await response.json();
  cache.twinById.set(personaId, data);
  return data;
}

/**
 * fetchTwinRecommendations
 * Gets FAISS-based recommendations for a twin.
 *
 * @param {string} personaId
 * @returns {object} - { persona_id, recommendations: [...] }
 */
export async function fetchTwinRecommendations(personaId) {
  if (cache.recsById.has(personaId)) return cache.recsById.get(personaId);

  const response = await fetch(`${API_BASE}/twins/${personaId}/recommendations`);
  if (!response.ok) {
    throw new Error(`Failed to load recommendations: ${personaId}`);
  }
  const data = await response.json();
  cache.recsById.set(personaId, data);
  return data;
}
