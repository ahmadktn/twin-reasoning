# BCT Hackathon – React Frontend (TwinReasoning)

This is the React frontend for the Twin-Reasoning application, built with Vite. It provides an interactive interface for users to select personas, view personalized item recommendations, and chat with digital twins in real time.

## Key Features

- **TwinChat**: A real-time chat interface powered by Server-Sent Events (SSE) that streams AI tokens and reasoning steps from the backend to provide a seamless conversational experience.
- **HomeFeed & Item Detail**: Browse dynamic recommended items based on the active persona's preferences.
- **EvalPanel**: A specialized interface (`/frontend/src/pages/EvalPanel.jsx`) for evaluating and interacting with the backend recommendation engine.

## Development Setup

If you prefer to run the frontend independently of Docker Compose:

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies (uses npm by default):
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```

The application will be accessible at http://localhost:5173. The frontend proxy is configured to direct `/chat` and `/api` requests to the FastAPI backend running on http://localhost:8000.

## Technologies Used
- React
- Vite
- Server-Sent Events (SSE) via `@microsoft/fetch-event-source`
- React Router (for navigation between feeds, chat, and evaluation panels)
