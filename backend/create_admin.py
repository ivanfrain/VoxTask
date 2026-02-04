
import sys
import os
import uuid
import getpass

# Add the current folder to sys.path so 'import main' works from root
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from main import UserModel, SessionLocal, pwd_context, run_migrations, engine, Base
from sqlalchemy.orm import Session

def create_admin():
    """
    CLI utility to create an administrator user manually.
    Usage: python backend/create_admin.py
    """
    print("\n" + "="*40)
    print("   VOXTASK PRO: ADMIN SETUP UTILITY")
    print("="*40 + "\n")

    # Ensure DB and tables exist before creating user
    db = SessionLocal()
    try:
        print("[1/3] Initializing database schema...")
        run_migrations(db)
        
        print("\n[2/3] Admin Credentials")
        name = input("  Enter Full Name: ").strip()
        if not name:
            print("  Error: Name cannot be empty.")
            return

        email = input("  Enter Email Address: ").strip().lower()
        if not email:
            print("  Error: Email cannot be empty.")
            return

        # Check for existing user
        existing_user = db.query(UserModel).filter(UserModel.email == email).first()
        if existing_user:
            print(f"  Error: User with email '{email}' already exists.")
            return

        password = getpass.getpass("  Enter Password: ")
        if len(password) < 6:
            print("  Error: Password must be at least 6 characters.")
            return
            
        confirm = getpass.getpass("  Confirm Password: ")
        if password != confirm:
            print("  Error: Passwords do not match.")
            return

        print("\n[3/3] Finalizing registration...")
        new_admin = UserModel(
            id=str(uuid.uuid4()),
            email=email,
            name=name,
            password_hash=pwd_context.hash(password),
            tier="pro",
            is_admin=True,
            is_blocked=False
        )
        
        db.add(new_admin)
        db.commit()
        
        print("\n" + "-"*40)
        print(f"SUCCESS: Admin user '{name}' created!")
        print(f"You can now log in at http://localhost:5173 (standard Vite port)")
        print("-"*40 + "\n")

    except Exception as e:
        print(f"\nCRITICAL ERROR: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    try:
        create_admin()
    except KeyboardInterrupt:
        print("\n\nOperation cancelled by user.")
        sys.exit(0)
