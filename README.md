# PromptLab AI – LLM Prompt Testing & Optimization Platform

PromptLab AI is a complete, production-ready full-stack application designed for prompt engineering. It allows you to test, compare, evaluate, and optimize prompts across various Large Language Models.

## 🚀 Features

- **Prompt Playground**: Test prompts with customizable parameters (temperature, max tokens, model).
- **A/B Testing**: Compare two prompt variations side-by-side to evaluate output differences.
- **Prompt History Dashboard**: View all past executed prompts, their parameters, latency, and outputs.
- **AI Suggestions Engine**: Get automatic AI-driven suggestions to improve your prompts.
- **Modern UI**: Built with React, Tailwind CSS, Framer Motion, featuring a dark glassmorphism aesthetic.
- **Secure Authentication**: JWT-based authentication with bcrypt password hashing.

## 🧱 Tech Stack

### Backend
- **Framework**: Python / FastAPI
- **Database**: SQLite (local) / SQLAlchemy ORM
- **Authentication**: JWT & bcrypt
- **AI Integration**: OpenAI SDK (supports LLama/Local via custom base URLs)

### Frontend
- **Framework**: React.js + Vite (TypeScript)
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **State Management**: Zustand
- **Charts**: Recharts

## 🛠️ Setup Instructions

### 1. Backend Setup

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # Windows:
   .\venv\Scripts\activate
   # Mac/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Set up environment variables:
   Ensure your `.env` file in the `backend` directory contains your real `OPENAI_API_KEY`. (If left as "dummy_key", the app will use mock responses for testing).
   
5. Run the server:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

### 2. Frontend Setup

1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:3000`.

## 🐳 Docker Deployment

The application includes a complete Docker setup for easy production deployment.

To spin up both frontend and backend containers:

```bash
docker-compose up --build
```
- The React app will be served by NGINX on `http://localhost:3000`
- The FastAPI backend will run on `http://localhost:8000` (requests are automatically proxied via NGINX).

## 📁 Project Structure

- `backend/`: FastAPI application, database models, schemas, and API routes.
- `frontend/`: React Vite application, pages, components, and state management.
- `docker-compose.yml`: Docker Compose configuration.

---
Built as a resume-worthy, highly scalable full-stack application demonstrating advanced AI engineering and product design.
