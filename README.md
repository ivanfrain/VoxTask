# VoxTask Pro

VoxTask Pro is a task management application featuring a voice-first interface and "Car Mode" support.

## Project Structure

```text
/ (Project Root)
├── backend/            # Python/FastAPI Application
│   ├── main.py         # Backend logic & SQLite DB
│   └── requirements.txt # Python dependencies
├── frontend/           # React Frontend Source
│   ├── components/     # UI Components
│   ├── services/       # API Services
│   ├── types.ts        # Shared Type Definitions
│   └── App.tsx         # Main Application logic
├── index.html          # Web Entry Point
├── index.tsx           # React Entry Point
├── metadata.json       # App Permissions
└── README.md           # Documentation
```

## Setup Instructions

### Backend (Python)
1. Navigate to the project root.
2. Install dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```
3. Run the backend:
   ```bash
   python backend/main.py
   ```
   *Note: The server will be available at http://localhost:8000.*

### Frontend (React)
The frontend is pre-configured to run from the root `index.html`. It automatically communicates with the backend at `http://localhost:8000`. If the backend is unavailable, it uses local browser storage.

## Features
- **Voice AI**: Create tasks naturally using Gemini Live API.
- **CarPlay Mode**: High-contrast, touch-optimized interface for driving.
- **Kanban Board**: Drag-and-drop style task tracking.
- **Hybrid Sync**: Offline support via LocalStorage fallback.
