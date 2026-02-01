# VoxTask Pro

VoxTask Pro is a high-performance task management ecosystem with a voice-first interface powered by Gemini Live and a dedicated CarPlay-inspired interface.

## 🏗️ Clean Architecture

The project is now strictly modularized:

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
The backend provides persistent storage using SQLite.
```bash
pip install -r backend/requirements.txt
python backend/main.py
```

### 2. Launch the Application
Open `index.html` in your browser.
- **Cloud Sync**: Active when the backend is running.
- **Local Mode**: Active if the backend is unreachable (uses `localStorage`).

## 🎙️ Voice Controls
Click the microphone icon to activate the Gemini-powered assistant.
- *"Add a task to review the project code by Friday with a 'priority' tag."*
- *"Create a task: Grocery shopping, description: Milk and eggs."*

## 🚗 Car Mode
Optimized for safe interaction:
- High-contrast text.
- Oversized touch targets.
- Focus on "To Do" and "Done" actions.
