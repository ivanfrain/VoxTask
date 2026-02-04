
import subprocess
import sys
import os
import time
import threading

def run_command(command, prefix, color_code):
    """Runs a command and prints its output with a colored prefix."""
    process = subprocess.Popen(
        command,
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )
    
    for line in iter(process.stdout.readline, ''):
        print(f"\033[{color_code}m{prefix}\033[0m {line.strip()}")
    process.stdout.close()
    process.wait()

def main():
    print("\n" + "="*50)
    print("   VOXTASK PRO: LOCAL DEVELOPMENT STACK")
    print("="*50 + "\n")

    # Check for node_modules
    if not os.path.exists("node_modules"):
        print(" [!] node_modules not found. Running 'npm install'...")
        subprocess.run("npm install", shell=True)

    # Check for backend database/admin
    if not os.path.exists("backend/tasks.db"):
        print(" [!] Database not found. You may want to run 'python backend/create_admin.py' first.")

    threads = []
    
    # 1. Backend (FastAPI) - Color: Blue (34)
    backend_cmd = f"{sys.executable} backend/main.py"
    t_backend = threading.Thread(target=run_command, args=(backend_cmd, "[BACKEND]", "34"))
    threads.append(t_backend)

    # 2. Frontend (Vite) - Color: Green (32)
    frontend_cmd = "npm run dev"
    t_frontend = threading.Thread(target=run_command, args=(frontend_cmd, "[FRONTEND]", "32"))
    threads.append(t_frontend)

    print(" [*] Starting Backend and Frontend...")
    for t in threads:
        t.start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n\n [!] Stopping development stack...")
        sys.exit(0)

if __name__ == "__main__":
    main()
