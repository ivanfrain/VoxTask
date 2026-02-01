# VoxTask Pro

VoxTask Pro is a high-performance task management application featuring a voice-first interface powered by the Gemini Live API, a Kanban-style dashboard, and a dedicated "Car Mode" for a hands-free, CarPlay-inspired experience.

## Architecture

The application uses a hybrid storage architecture:
- **Primary Backend**: A FastAPI (Python) server with SQLite persistence.
- **Secondary Fallback**: LocalStorage browser cache for offline-first resilience.
- **AI Interface**: Google Gemini Live API for real-time voice task creation.

---

## Getting Started

### 1. Backend Setup (Python)

The backend is built with FastAPI and SQLAlchemy. It provides a RESTful API for CRUD operations on tasks.

#### Prerequisites
- Python 3.8 or higher.
- pip (Python package manager).

#### Installation
1. Install the required dependencies:
   ```bash
   pip install fastapi uvicorn sqlalchemy pydantic
   ```

#### Running the Backend
1. Start the server by running `main.py`:
   ```bash
   python main.py
   ```
   *Alternatively, use uvicorn directly:*
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

2. The server will be available at `http://localhost:8000`.
3. **Interactive API Documentation**: Once the server is running, visit `http://localhost:8000/docs` to view the Swagger UI and test the API endpoints.

---

### 2. Frontend Setup (React)

The frontend is a React application using Tailwind CSS for styling and ESM modules for dependency management.

#### Prerequisites
- A modern web browser.
- An environment capable of serving the `index.html` file.

#### Environment Variables
The application requires a Google Gemini API Key for the Voice Assistant feature. This is typically injected into the environment as `process.env.API_KEY`.

#### Running the Frontend
- Simply open the `index.html` in a local development server or your preferred web development environment.
- Ensure the backend is running at `http://localhost:8000` for full cloud-sync functionality. If the backend is unreachable, the app will automatically switch to **Local Mode**.

---

## Key Features

### 🎙️ Voice Assistant
- Click the microphone icon in the bottom-left corner.
- Speak naturally: *"Create a task to finish the project report with a tag 'Work' for Friday."*
- The assistant will extract the title, description, deadline, and tags automatically and create the task.

### 🚗 Car Mode
- Designed for safety and ease of use while driving.
- High-contrast UI with large touch targets.
- Displays a simplified view of tasks by category (To Do, In Progress, etc.).
- Accessible via the "Car Mode" button in the header or the floating car icon on mobile.

### 📋 Kanban Board
- Manage tasks across four statuses: **Todo**, **In Progress**, **On Hold**, and **Done**.
- Quick-action buttons to transition tasks between states.
- Fully responsive design for desktop and mobile devices.

### ☁️ Hybrid Sync
- **Online**: Data is saved to the SQLite database via the FastAPI backend.
- **Offline**: Data is safely stored in the browser's `localStorage`.
- **Automatic Recovery**: The app polls the backend and will offer to re-sync when connection is restored.

---

## API Endpoints

- `GET /health`: Check server status.
- `GET /tasks`: Retrieve all tasks.
- `POST /tasks`: Create a new task.
- `PATCH /tasks/{id}`: Update an existing task.
- `DELETE /tasks/{id}`: Remove a task.
