# VoxTask Pro

VoxTask Pro is a professional-grade task management ecosystem. It features a voice-first interface powered by Gemini Live, a touch-optimized CarPlay experience, and a robust FastAPI backend.

## 🏗️ Architecture

The project is organized into two primary modules:

- **`/backend`**: Python FastAPI server with SQLAlchemy/SQLite persistence.
- **`/frontend`**: React source code, components, and services.

## 🚀 Quick Start

### 1. Backend (Persistence & API)
Run the backend on your local machine to enable permanent storage:
```bash
pip install -r backend/requirements.txt
python backend/main.py
```
*The server will be live at http://localhost:8000.*

### 2. Frontend (UI & Voice)
Access the web app via `index.html`. It is pre-configured to:
- Connect to your local backend (Cloud Sync).
- Fallback to `localStorage` if the backend is unreachable (Local Mode).
- Use Gemini Live API for voice commands.

## 🎙️ Voice Commands
The Voice Assistant allows hands-free task management. Simply speak:
- *"Create a task: Prepare board meeting, deadline next Monday, tags: Work, High-Priority."*
- *"Add a task to buy milk with a tag Shopping."*

## 🚗 Car Mode
Designed for high-contrast visibility and ease of use, Car Mode simplifies your task list into large touch targets, perfect for checking your schedule while on the move.

---

## 🛠️ API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/health` | `GET` | System health check |
| `/tasks` | `GET` | Fetch all tasks |
| `/tasks` | `POST` | Create a new task |
| `/tasks/{id}` | `PATCH` | Update task status or details |
| `/tasks/{id}` | `DELETE` | Remove a task |
