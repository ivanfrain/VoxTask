
# VoxTask Pro

VoxTask Pro is a high-performance task management ecosystem with a voice-first interface powered by Gemini Live and a dedicated CarPlay-inspired interface.

## 🏗️ Clean Architecture

The project is strictly modularized to separate concerns:

```text
/ (Project Root)
├── backend/            # Python FastAPI & Persistence
│   ├── main.py         # API Logic & Migration Runner
│   ├── create_admin.py # CLI Admin Creation Tool
│   ├── MIGRATIONS.md   # Schema evolution log
│   └── requirements.txt # Dependency manifest
├── frontend/           # React Web Application
│   ├── components/     # UI Layer
│   ├── services/       # API Integration Layer
│   ├── types.ts        # Shared TypeScript interfaces
│   └── App.tsx         # Main Application logic
├── index.html          # Entry HTML
├── index.tsx           # Entry React Mount
├── package.json        # Frontend CLI Configuration
├── start.py            # Unified Dev Stack Launcher
└── README.md           # Documentation
```

## 🚀 Getting Started

### ⚡ Quick Start (Recommended)
Launch the entire stack (Backend + Frontend) with one command:
```bash
python start.py
```

### 🛠️ Manual Launch

#### 1. Backend Setup
```bash
pip install -r backend/requirements.txt
python backend/main.py
```

#### 2. Frontend Setup
```bash
npm install
npm run dev
```

#### 3. Create an Admin User
```bash
python backend/create_admin.py
```

---

## 🛠️ Database Schema Evolution

VoxTask Pro uses a built-in migration runner to ensure existing user data is preserved when new features are added. 

### How to update the Database Schema:

1. **Modify the Model**: Update the `TaskModel` or `UserModel` class in `backend/main.py`.
2. **Create an Upgrader**: Add a new migration function in `run_migrations`.
3. **Log the Change**: Update `backend/MIGRATIONS.md`.

---

## 🎙️ Voice Controls
Click the microphone icon in the bottom left to activate the Gemini-powered assistant.
- *"Add a task to review the project code by Friday with a 'priority' tag."*

## 🚗 Car Mode
Optimized for safe interaction: High-contrast text, oversized targets, and focused "To Do" management.
