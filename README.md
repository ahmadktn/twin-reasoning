# Twin-Reasoning Platform

A full-stack application for conversational recommendation, combining a FastAPI backend with a React frontend. The project provides streaming AI personas, personalized item recommendations powered by FAISS, and real-time chat evaluation.

## Project Structure

- `/backend` - The FastAPI application handling the core logic, LLM streaming (SSE), recommendation ranking, and FAISS indexing.
- `/frontend` - The React application providing the conversational interface (TwinChat), persona selection, and the EvalPanel for real-time interaction testing.
- `docker-compose.yml` - A unified deployment configuration to run both the frontend and backend simultaneously.

## Getting Started

### Prerequisites
- Docker and `docker-compose` installed on your machine.
- An LLM provider API key (e.g., OpenRouter, Anthropic) if you want to use the cloud models.

### Setup & Run
1. Configure your environment by creating `.env` files:
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env to include your API keys and configuration (e.g. LLM_API_KEY)
   ```

2. Start the entire stack using Docker Compose:
   ```bash
   docker-compose up --build
   ```

3. The application components will be available at:
   - **Frontend UI**: http://localhost:5173 (or your configured Docker port)
   - **Backend API**: http://localhost:8000
   - **API Documentation**: http://localhost:8000/docs

For detailed instructions on developing each part of the stack, see their respective READMEs:
- [Backend Documentation](./backend/README.md)
- [Frontend Documentation](./frontend/README.md)
