
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
python3 -m venv venv
source venv/bin/activate
```

**On Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

#### Install Dependencies & Run
Once the virtual environment is active:
```bash
pip install -r backend/requirements.txt
python backend/main.py
```
*The server will be live at http://localhost:8000.*

#### 🛑 Stopping the Backend
1. Press `Ctrl + C` in the terminal.
2. Run: `deactivate`

---

## 🔍 Troubleshooting the Backend

If the frontend shows "Local Mode" or tasks aren't saving, follow these steps:

1. **Check if the process is running**:
   Ensure your terminal shows `INFO: Starting VoxTask Pro Backend on http://localhost:8000`. If it crashes, the error message in the terminal will tell you why (e.g., "Address already in use" if another app is on port 8000).

2. **Test the Health Endpoint**:
   Open [http://localhost:8000/health](http://localhost:8000/health) in your browser. 
   - If you see `{"status": "healthy"}`, the backend is working.
   - If you see "Site can't be reached", the backend is not running or blocked by a firewall.

3. **Check the Logs**:
   The terminal running `main.py` now logs every request. Watch for `422 Unprocessable Entity` (usually means a data format mismatch) or `500 Internal Server Error` (database issues).

4. **Common Fixes**:
   - **CORS**: If the browser console shows "CORS error", ensure `CORSMiddleware` in `main.py` is configured with `allow_origins=["*"]`.
   - **Database**: If you see SQLite errors, try deleting the `tasks.db` file in the root to let the app recreate a fresh database.

---

## 🎙️ Voice Controls
Click the microphone icon in the bottom left to activate the Gemini-powered assistant.
- *"Add a task to review the project code by Friday with a 'priority' tag."*

## 🚗 Car Mode
Optimized for safe interaction: High-contrast text, oversized targets, and focused "To Do" management.
