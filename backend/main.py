
from fastapi import FastAPI, HTTPException, Depends, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy import Column, String, Float, Text, create_engine, ForeignKey
from sqlalchemy.orm import sessionmaker, Session, declarative_base
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

SQLALCHEMY_DATABASE_URL = "sqlite:///./tasks.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class UserModel(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, index=True) # Google Sub ID
    email = Column(String, unique=True, index=True)
    name = Column(String)
    picture = Column(String)
    tier = Column(String, default="free") # 'free' or 'pro'

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

# Create tables
try:
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables initialized successfully.")
except Exception as e:
    logger.error(f"Failed to initialize database: {e}")

# Pydantic Models
class UserSync(BaseModel):
    id: str
    email: str
    name: str
    picture: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    picture: str
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

app = FastAPI(title="VoxTask Pro API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_current_user_id(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    # In a real app, verify the Google JWT here. 
    # For this demo, we assume the token IS the user's Google ID.
    token = authorization.replace("Bearer ", "")
    return token

@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": time.time()}

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
    # Free tier limit
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
        **task.dict(),
        "id": db_task.id,
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
