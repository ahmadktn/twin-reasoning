// src/api/metrics.js
// ─────────────────────────────────────────────────────────────────
// Metrics API — GET /metrics
// Returns pre-computed Task A + B evaluation metrics.
// ─────────────────────────────────────────────────────────────────

import { API_BASE } from "./index";

/**
 * fetchMetrics
 * Fetches evaluation metrics from the backend.
 *
 * @returns {object} - metrics object with shape from backend:
 *   {
 *     timestamp, rating_metrics, review_metrics, summary
 *   }
 *   Note: the backend /metrics endpoint returns whatever is in data/metrics.json
 */
export async function fetchMetrics() {
  const response = await fetch(`${API_BASE}/metrics`);
  if (!response.ok) {
    throw new Error(`Failed to load metrics: ${response.status} ${response.statusText}`);
  }
  return response.json();
}
