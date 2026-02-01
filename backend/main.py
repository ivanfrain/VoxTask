
from fastapi import FastAPI, HTTPException, Depends, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from sqlalchemy import Column, String, Float, Text, create_engine, ForeignKey, inspect, text
from sqlalchemy.orm import sessionmaker, Session, declarative_base
from passlib.context import CryptContext
import uuid
import time
import json
import logging
import sys

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# Password hashing configuration
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SQLALCHEMY_DATABASE_URL = "sqlite:///./tasks.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- SCHEMA DEFINITIONS ---

class SchemaMigrationModel(Base):
    __tablename__ = "schema_migrations"
    version = Column(Float, primary_key=True)
    applied_at = Column(Float)

class UserModel(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    picture = Column(String, nullable=True)
    password_hash = Column(String, nullable=True)
    tier = Column(String, default="free")

class TaskModel(Base):
    __tablename__ = "tasks"
    id = Column(String, primary_key=True, index=True)
    owner_id = Column(String, ForeignKey("users.id"), index=True)
    title = Column(String, index=True)
    description = Column(Text)
    deadline = Column(String)
    tags = Column(Text)
    status = Column(String)
    createdAt = Column(Float)

# --- MIGRATION LOGIC ---

def run_migrations(db: Session):
    """
    Handles database evolution by applying incremental changes.
    To add a new column/table: 
    1. Update the Model above.
    2. Add a new version function to the 'migrations' dict below.
    """
    current_version = 0.0
    
    # Ensure migration table exists
    if not inspect(engine).has_table("schema_migrations"):
        Base.metadata.create_all(bind=engine, tables=[SchemaMigrationModel.__table__])
    
    version_row = db.query(SchemaMigrationModel).order_by(SchemaMigrationModel.version.desc()).first()
    if version_row:
        current_version = version_row.version

    # Migration Definitions
    # Version 1.0: Initial setup (handled by create_all)
    # Version 1.1: Added password_hash to UserModel
    
    def migrate_1_1():
        logger.info("Applying Migration 1.1: Add password_hash to users")
        try:
            db.execute(text("ALTER TABLE users ADD COLUMN password_hash TEXT"))
        except Exception as e:
            logger.warning(f"Column password_hash might already exist: {e}")

    migrations = {
        1.1: migrate_1_1,
        # Add future migrations here: 1.2: migrate_1_2,
    }

    # Run missing migrations
    sorted_versions = sorted(migrations.keys())
    for v in sorted_versions:
        if v > current_version:
            logger.info(f"Applying migration version {v}...")
            migrations[v]()
            db.add(SchemaMigrationModel(version=v, applied_at=time.time()))
            db.commit()
            current_version = v

    # Final sweep to catch any new tables defined in models
    Base.metadata.create_all(bind=engine)
    logger.info(f"Database schema is up to date (Version {current_version})")

# --- API MODELS ---

class UserSync(BaseModel):
    id: str
    email: str
    name: str
    picture: str

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    picture: Optional[str]
    tier: str

class TaskBase(BaseModel):
    title: str
    description: str
    deadline: str
    tags: List[str]
    status: str

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    deadline: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = None

class TaskResponse(BaseModel):
    id: str
    title: str
    description: str
    deadline: str
    tags: List[str]
    status: str
    createdAt: float
    owner_id: str
    class Config:
        from_attributes = True

# --- APP INITIALIZATION ---

app = FastAPI(title="VoxTask Pro API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup DB Check
@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    try:
        run_migrations(db)
    finally:
        db.close()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_current_user_id(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    token = authorization.replace("Bearer ", "")
    return token

@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": time.time()}

# --- AUTH ENDPOINTS ---

@app.post("/auth/register", response_model=UserResponse)
def register_user(user_data: UserRegister, db: Session = Depends(get_db)):
    db_user = db.query(UserModel).filter(UserModel.email == user_data.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_user = UserModel(
        id=str(uuid.uuid4()),
        email=user_data.email,
        name=user_data.name,
        password_hash=pwd_context.hash(user_data.password),
        tier="free"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/auth/login", response_model=UserResponse)
def login_user(credentials: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(UserModel).filter(UserModel.email == credentials.email).first()
    if not db_user or not db_user.password_hash:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not pwd_context.verify(credentials.password, db_user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    return db_user

@app.post("/users/sync", response_model=UserResponse)
def sync_user(user_data: UserSync, db: Session = Depends(get_db)):
    db_user = db.query(UserModel).filter(UserModel.id == user_data.id).first()
    if not db_user:
        db_user = UserModel(
            id=user_data.id,
            email=user_data.email,
            name=user_data.name,
            picture=user_data.picture,
            tier="free"
        )
        db.add(db_user)
    else:
        db_user.name = user_data.name
        db_user.picture = user_data.picture
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/users/upgrade", response_model=UserResponse)
def upgrade_user(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    db_user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    db_user.tier = "pro"
    db.commit()
    db.refresh(db_user)
    return db_user

# --- TASK ENDPOINTS ---

@app.get("/tasks", response_model=List[TaskResponse])
def read_tasks(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    db_tasks = db.query(TaskModel).filter(TaskModel.owner_id == user_id).all()
    results = []
    for t in db_tasks:
        results.append({
            "id": t.id,
            "title": t.title,
            "description": t.description,
            "deadline": t.deadline,
            "tags": json.loads(t.tags or "[]"),
            "status": t.status,
            "createdAt": t.createdAt,
            "owner_id": t.owner_id
        })
    return results

@app.post("/tasks", response_model=TaskResponse)
def create_task(task: TaskCreate, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    db_user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if db_user and db_user.tier == "free":
        task_count = db.query(TaskModel).filter(TaskModel.owner_id == user_id).count()
        if task_count >= 10:
            raise HTTPException(status_code=403, detail="Free tier limit reached (10 tasks). Upgrade to Pro!")

    db_task = TaskModel(
        id=str(uuid.uuid4()),
        owner_id=user_id,
        title=task.title,
        description=task.description,
        deadline=task.deadline,
        tags=json.dumps(task.tags),
        status=task.status,
        createdAt=time.time()
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return {
        "id": db_task.id,
        "title": db_task.title,
        "description": db_task.description,
        "deadline": db_task.deadline,
        "tags": json.loads(db_task.tags),
        "status": db_task.status,
        "createdAt": db_task.createdAt,
        "owner_id": db_task.owner_id
    }

@app.patch("/tasks/{task_id}", response_model=TaskResponse)
def update_task(task_id: str, updates: TaskUpdate, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    db_task = db.query(TaskModel).filter(TaskModel.id == task_id, TaskModel.owner_id == user_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_data = updates.dict(exclude_unset=True)
    for key, value in update_data.items():
        if key == "tags":
            setattr(db_task, key, json.dumps(value))
        else:
            setattr(db_task, key, value)
    
    db.commit()
    db.refresh(db_task)
    return {
        "id": db_task.id,
        "owner_id": db_task.owner_id,
        "title": db_task.title,
        "description": db_task.description,
        "deadline": db_task.deadline,
        "tags": json.loads(db_task.tags or "[]"),
        "status": db_task.status,
        "createdAt": db_task.createdAt
    }

@app.delete("/tasks/{task_id}")
def delete_task(task_id: str, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    db_task = db.query(TaskModel).filter(TaskModel.id == task_id, TaskModel.owner_id == user_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(db_task)
    db.commit()
    return {"status": "success"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
