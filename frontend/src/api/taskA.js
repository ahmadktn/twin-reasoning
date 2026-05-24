// src/api/taskA.js
// ─────────────────────────────────────────────────────────────────
// Task A API — Review Generation
//
// Calls the real backend at VITE_API_BASE_URL (default: localhost:8000)
//
// Two modes:
//   simulateReview()   → POST /reviews/generate/sync   (full result at once)
//   streamReview()     → POST /reviews/generate         (SSE: reasoning + tokens)
// ─────────────────────────────────────────────────────────────────

import { API_BASE } from "./index";

// Cache for simulateReview to avoid redundant API calls
const reviewCache = new Map();

/**
 * simulateReview
 * Non-streaming: generates a review for one persona + one product.
 * Returns the full result in a single response.
 *
 * @param {string} personaId   - real backend persona ID (e.g. "AG73BVBKUOH22USSFJA5ZWL7AKXA")
 * @param {string} productId   - product identifier (e.g. "B00YQ6X8EO")
 * @param {number|null} targetRating  - 1-5 or null to let the model predict
 * @returns {object} ReviewResult:
 *   { persona_id, product_id, predicted_rating, review, confidence }
 */
export async function simulateReview(personaId, productId, targetRating = null) {
  const cacheKey = `${personaId}_${productId}_${targetRating}`;
  if (reviewCache.has(cacheKey)) return reviewCache.get(cacheKey);

  const body = { persona_id: personaId, product_id: productId };
  if (targetRating !== null) body.target_rating = targetRating;

  const response = await fetch(`${API_BASE}/reviews/generate/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => response.statusText);
    throw new Error(`Review generation failed (${response.status}): ${err}`);
  }

  const data = await response.json();
  reviewCache.set(cacheKey, data);
  return data;
}

/**
 * streamReview
 * Streaming mode — connects to POST /reviews/generate which returns SSE events.
 * Calls callbacks for each event type so the UI can update live.
 *
 * SSE event types the server sends:
 *   { type: "reasoning", step: N, text: "..." }
 *   { type: "token",     text: "..." }
 *   { type: "result",    rating: N, review: "...", confidence: 0.9 }
 *
 * @param {string}   personaId
 * @param {string}   productId
 * @param {number|null} targetRating
 * @param {Function} onReasoning  - called with { step, text } for each reasoning step
 * @param {Function} onToken      - called with each text token string
 * @param {Function} onResult     - called with the final { rating, review, confidence }
 */
export async function streamReview(personaId, productId, targetRating, onReasoning, onToken, onResult) {
  const body = { persona_id: personaId, product_id: productId };
  if (targetRating !== null) body.target_rating = targetRating;

  const response = await fetch(`${API_BASE}/reviews/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Stream failed: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop(); // keep incomplete line in buffer

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") return;

      try {
        const event = JSON.parse(data);
        if (event.type === "reasoning") onReasoning?.({ step: event.step, text: event.text });
        else if (event.type === "token") onToken?.(event.text);
        else if (event.type === "result") onResult?.(event);
      } catch {
        // ignore malformed SSE lines
      }
    }
  }
}