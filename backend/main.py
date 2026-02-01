
from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy import Column, String, Float, Text, create_engine
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

class TaskModel(Base):
    __tablename__ = "tasks"
    id = Column(String, primary_key=True, index=True)
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
    class Config:
        from_attributes = True

app = FastAPI(title="VoxTask Pro API")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware for logging requests
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000
    logger.info(f"{request.method} {request.url.path} - {response.status_code} ({process_time:.2f}ms)")
    return response

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": time.time()}

@app.get("/tasks", response_model=List[TaskResponse])
def read_tasks(db: Session = Depends(get_db)):
    try:
        db_tasks = db.query(TaskModel).all()
        results = []
        for t in db_tasks:
            results.append({
                "id": t.id,
                "title": t.title,
                "description": t.description,
                "deadline": t.deadline,
                "tags": json.loads(t.tags or "[]"),
                "status": t.status,
                "createdAt": t.createdAt
            })
        return results
    except Exception as e:
        logger.error(f"Error reading tasks: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@app.post("/tasks", response_model=TaskResponse)
def create_task(task: TaskCreate, db: Session = Depends(get_db)):
    try:
        db_task = TaskModel(
            id=str(uuid.uuid4()),
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
            "createdAt": db_task.createdAt
        }
    except Exception as e:
        logger.error(f"Error creating task: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/tasks/{task_id}", response_model=TaskResponse)
def update_task(task_id: str, updates: TaskUpdate, db: Session = Depends(get_db)):
    try:
        db_task = db.query(TaskModel).filter(TaskModel.id == task_id).first()
        if not db_task:
            logger.warning(f"Task not found for update: {task_id}")
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
            "title": db_task.title,
            "description": db_task.description,
            "deadline": db_task.deadline,
            "tags": json.loads(db_task.tags or "[]"),
            "status": db_task.status,
            "createdAt": db_task.createdAt
        }
    except Exception as e:
        logger.error(f"Error updating task {task_id}: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/tasks/{task_id}")
def delete_task(task_id: str, db: Session = Depends(get_db)):
    try:
        db_task = db.query(TaskModel).filter(TaskModel.id == task_id).first()
        if not db_task:
            raise HTTPException(status_code=404, detail="Task not found")
        db.delete(db_task)
        db.commit()
        logger.info(f"Task deleted: {task_id}")
        return {"status": "success", "id": task_id}
    except Exception as e:
        logger.error(f"Error deleting task {task_id}: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting VoxTask Pro Backend on http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)
