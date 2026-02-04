
import subprocess
import sys
import os
import time
import threading

def run_command(command, prefix, color_code, cwd=None, env=None):
    """Runs a command and prints its output with a colored prefix."""
    # Ensure current environment is passed down
    full_env = os.environ.copy()
    if env:
        full_env.update(env)

    process = subprocess.Popen(
        command,
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        cwd=cwd,
        env=full_env
    )
    
    for line in iter(process.stdout.readline, ''):
        print(f"\033[{color_code}m{prefix}\033[0m {line.strip()}")
    process.stdout.close()
    process.wait()

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(root_dir, "backend")

    print("\n" + "="*50)
    print("   VOXTASK PRO: LOCAL DEVELOPMENT STACK")
    print("="*50 + "\n")

    # Check for node_modules in root
    if not os.path.exists(os.path.join(root_dir, "node_modules")):
        print(" [!] node_modules not found. Running 'npm install'...")
        subprocess.run("npm install", shell=True, cwd=root_dir)

    # Check for backend database/admin in backend/
    db_path = os.path.join(backend_dir, "tasks.db")
    if not os.path.exists(db_path):
        print(f" [!] Database not found at {db_path}.")
        print(" [!] You may want to run 'python backend/create_admin.py' first.")

    threads = []
    
    # 1. Backend (FastAPI) - Color: Blue (34)
    # We set PYTHONPATH to include the backend directory so internal imports work
    backend_env = {"PYTHONPATH": backend_dir}
    backend_cmd = f"{sys.executable} main.py"
    t_backend = threading.Thread(
        target=run_command, 
        args=(backend_cmd, "[BACKEND]", "34", backend_dir, backend_env)
    )
    threads.append(t_backend)

    # 2. Frontend (Vite) - Color: Green (32)
    frontend_cmd = "npm run dev"
    t_frontend = threading.Thread(
        target=run_command, 
        args=(frontend_cmd, "[FRONTEND]", "32", root_dir)
    )
    threads.append(t_frontend)

    print(f" [*] Root: {root_dir}")
    print(f" [*] Backend Directory: {backend_dir}")
    print(" [*] Starting Stack...")
    
    for t in threads:
        t.start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n\n [!] Stopping development stack...")
        # Force exit
        os._exit(0)

if __name__ == "__main__":
    main()
