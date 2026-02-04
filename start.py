
import subprocess
import sys
import os
import time
import threading

def run_command(command, prefix, color_code, cwd=None, env=None):
    """Runs a command and prints its output with a colored prefix."""
    full_env = os.environ.copy()
    if env:
        full_env.update(env)

    # Use shell=True to support npm commands on all OS
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
    
    try:
        for line in iter(process.stdout.readline, ''):
            print(f"\033[{color_code}m{prefix}\033[0m {line.strip()}")
    except Exception as e:
        print(f"Error reading output: {e}")
    finally:
        process.stdout.close()
        process.wait()

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(root_dir, "backend")

    print("\n" + "="*50)
    print("   VOXTASK PRO: LOCAL DEVELOPMENT STACK")
    print("="*50 + "\n")

    # Ensure we are in the root directory for consistency
    os.chdir(root_dir)

    # 1. Dependency Check
    node_modules_path = os.path.join(root_dir, "node_modules")
    vite_plugin_path = os.path.join(node_modules_path, "@vitejs", "plugin-react")
    
    if not os.path.exists(node_modules_path) or not os.path.exists(vite_plugin_path):
        print(" [!] Frontend dependencies missing or incomplete. Running 'npm install'...")
        subprocess.run("npm install", shell=True, cwd=root_dir)

    # 2. Database Path Clarification
    db_path = os.path.join(backend_dir, "tasks.db")
    print(f" [*] Backend DB location: {db_path}")

    threads = []
    
    # 3. Launch Backend (FastAPI) - Color: Blue (34)
    backend_env = {"PYTHONPATH": backend_dir}
    # Wrap executable in quotes to handle paths with spaces
    backend_cmd = f'"{sys.executable}" main.py'
    t_backend = threading.Thread(
        target=run_command, 
        args=(backend_cmd, "[BACKEND]", "34", backend_dir, backend_env),
        daemon=True
    )
    threads.append(t_backend)

    # 4. Launch Frontend (Vite) - Color: Green (32)
    frontend_cmd = "npm run dev"
    t_frontend = threading.Thread(
        target=run_command, 
        args=(frontend_cmd, "[FRONTEND]", "32", root_dir),
        daemon=True
    )
    threads.append(t_frontend)

    print(f" [*] Project root: {root_dir}")
    print(" [*] Starting stack (Ctrl+C to stop)...\n")
    
    for t in threads:
        t.start()

    try:
        while True:
            time.sleep(1)
            # If a process crashes, we might want to know
            if not any(t.is_alive() for t in threads):
                print(" [!] One or more processes stopped unexpectedly.")
                break
    except KeyboardInterrupt:
        print("\n\n [!] Stopping development stack...")
    finally:
        # Use os._exit to immediately kill all daemon threads and child processes
        os._exit(0)

if __name__ == "__main__":
    main()
