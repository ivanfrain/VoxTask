
# VoxTask Pro

VoxTask Pro is a high-performance task management ecosystem with a voice-first interface powered by Gemini Live and a dedicated CarPlay-inspired interface.

## 🏗️ Clean Architecture

The project is strictly modularized to separate concerns:

```text
/ (Project Root)
├── backend/            # Python FastAPI & Persistence
│   ├── main.py         # API Logic & Migration Runner
│   ├── MIGRATIONS.md   # Schema evolution log
│   └── requirements.txt # Dependency manifest
├── frontend/           # React Web Application
│   ├── components/     # UI Layer
│   ├── services/       # API Integration Layer
│   ├── types.ts        # Shared TypeScript interfaces
│   └── App.tsx         # Main Application logic
├── index.html          # Entry HTML
├── index.tsx           # Entry React Mount
└── README.md           # Documentation
```

## 🚀 Getting Started

1. **Start the Backend**:
   ```bash
   pip install -r backend/requirements.txt
   python backend/main.py
   ```
2. **Open the App**: The frontend will automatically connect to `localhost:8000`.

---

## 🛠️ Database Schema Evolution

VoxTask Pro uses a built-in migration runner to ensure existing user data is preserved when new features are added. 

### How to update the Database Schema:

When adding a new feature (e.g., adding a "priority" field to tasks):

1. **Modify the Model**: Update the `TaskModel` or `UserModel` class in `backend/main.py` with the new field.
2. **Create an Upgrader**: In the `run_migrations` function inside `backend/main.py`, define a new nested function (e.g., `migrate_1_2`) that uses `db.execute(text("ALTER TABLE ..."))`.
3. **Register Version**: Add the new version number and function to the `migrations` dictionary.
4. **Log the Change**: Update `backend/MIGRATIONS.md` with the new version and a description of the change.

On the next server restart, the backend will automatically apply the change to all connected `tasks.db` files.

---

## 🎙️ Voice Controls
Click the microphone icon in the bottom left to activate the Gemini-powered assistant.
- *"Add a task to review the project code by Friday with a 'priority' tag."*

## 🚗 Car Mode
Optimized for safe interaction: High-contrast text, oversized targets, and focused "To Do" management.
