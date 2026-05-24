// src/api/taskB.js
// ─────────────────────────────────────────────────────────────────
// Task B API — Conversational Recommendations
//
// Calls POST /chat/recommend — stateless.
// The backend needs the FULL message history on every request.
// The frontend accumulates messages in React state and passes them all.
//
// Request:  { persona_id, messages: [{role, content}], top_k }
// Response: { reply, recommendations: [{rank, product_id, relevance_score, explanation}] }
// ─────────────────────────────────────────────────────────────────

import { API_BASE } from "./index";

/**
 * sendMessage
 * Sends the full conversation history to the backend and gets a reply + recommendations.
 * NOTE: This is STATELESS — pass the complete messages array every call.
 *
 * @param {string} personaId   - real backend persona ID
 * @param {Array}  messages    - full history: [{role: "user"|"assistant", content: "..."}]
 * @param {number} topK        - max recommendations to return (1-20, default 5)
 * @returns {object} ChatResponse:
 *   { reply: string, recommendations: [{rank, product_id, relevance_score, explanation}] }
 */
export async function sendMessage(personaId, messages, topK = 5, naijaMode = false) {
  const response = await fetch(`${API_BASE}/chat/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      persona_id: personaId,
      messages,
      top_k: topK,
      naija_mode: naijaMode,
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => response.statusText);
    throw new Error(`Chat API error (${response.status}): ${err}`);
  }

  return response.json();
}

/**
 * sendMessageStream
 * Streams the conversation reply + recommendations using Server-Sent Events.
 */
import { fetchEventSource } from '@microsoft/fetch-event-source';

export async function sendMessageStream(personaId, messages, topK = 5, naijaMode = false, onChunk, onRecs) {
  return new Promise((resolve, reject) => {
    class StopError extends Error {
      constructor() {
        super("StopError");
        this.name = "StopError";
      }
    }
    const ctrl = new AbortController();
    
    fetchEventSource(`${API_BASE}/chat/recommend_stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        persona_id: personaId,
        messages,
        top_k: topK,
        naija_mode: naijaMode,
      }),
      signal: ctrl.signal,
      onmessage(ev) {
        if (!ev.data) return;
        try {
          const data = JSON.parse(ev.data);
          if (data.type === "chunk") {
            onChunk(data.text);
          } else if (data.type === "recs") {
            onRecs(data.recommendations);
          }
        } catch (e) {
          console.error("Failed to parse SSE data", e);
        }
      },
      onerror(err) {
        if (err instanceof StopError || err.name === "AbortError") {
          throw err; // Special error to stop retrying, fetchEventSource will catch this and stop
        }
        reject(err);
        throw err; // Stop retrying on real errors
      },
      onclose() {
        resolve();
        ctrl.abort(); // Cancel the request
        throw new StopError(); // This tells fetchEventSource not to reconnect
      }
    });
  }).catch((err) => {
    if (err.name === "AbortError" || err.message === "StopError") return;
    throw err;
  });
}