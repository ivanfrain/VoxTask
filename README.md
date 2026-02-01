# VoxTask Pro

VoxTask Pro is a high-performance task management ecosystem with a voice-first interface powered by Gemini Live and a dedicated CarPlay-inspired interface.

## 🏗️ Clean Architecture

The project is strictly modularized to separate concerns:

```text
/ (Project Root)
├── backend/            # Python FastAPI & Persistence
│   ├── main.py         # API Logic & SQLite Database
│   └── requirements.txt # Dependency manifest
├── frontend/           # React Web Application
│   ├── components/     # UI Layer (TaskBoard, TaskCard, TaskForm, etc.)
│   ├── services/       # API Integration Layer
│   ├── types.ts        # Shared TypeScript interfaces
│   └── App.tsx         # Main Application logic
├── index.html          # Entry HTML
├── index.tsx           # Entry React Mount
├── metadata.json       # System Permissions
└── README.md           # Documentation
```

## 🚀 Getting Started

### 1. Start the Data Layer (Backend)
The backend provides persistent storage using SQLite. It is highly recommended to use a virtual environment.

#### Create and Activate Virtual Environment
From the project root:

**On macOS / Linux:**
```bash
# Create the virtual environment
python3 -m venv venv

# Activate the virtual environment
source venv/bin/activate
```

**On Windows:**
```bash
# Create the virtual environment
python -m venv venv

# Activate the virtual environment
venv\Scripts\activate
```

#### Install Dependencies & Run
Once the virtual environment is active:
```bash
# Install required packages
pip install -r backend/requirements.txt

# Start the server
python backend/main.py
```
*The server will be live at http://localhost:8000. Keep this terminal open.*

#### 🛑 Stopping the Backend
To shut down the server and exit the virtual environment:
1. Press `Ctrl + C` in the terminal to stop the FastAPI server.
2. Run the following command to exit the virtual environment:
```bash
deactivate
```

### 2. Launch the Application
Open `index.html` in your browser.
- **Cloud Sync**: Active when the backend is running and reachable.
- **Local Mode**: Active if the backend is unreachable (uses browser `localStorage`).

## 🎙️ Voice Controls
Click the microphone icon in the bottom left to activate the Gemini-powered assistant.
- *"Add a task to review the project code by Friday with a 'priority' tag."*
- *"Create a task: Grocery shopping, description: Milk and eggs."*

## 🚗 Car Mode
Optimized for safe interaction while driving or on the move:
- High-contrast text for low-light visibility.
- Oversized touch targets for easy interaction.
- Focused view on "To Do" tasks and quick completion.

---

## 🛠️ API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/health` | `GET` | System health check |
| `/tasks` | `GET` | Fetch all tasks |
| `/tasks` | `POST` | Create a new task |
| `/tasks/{id}` | `PATCH` | Update task status or details |
| `/tasks/{id}` | `DELETE` | Remove a task |
