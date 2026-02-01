
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy import Column, String, Float, Text, create_engine
from sqlalchemy.orm import sessionmaker, Session, declarative_base
import uuid
import time
import json

# Database Configuration
SQLALCHEMY_DATABASE_URL = "sqlite:///./tasks.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Database Model
class TaskModel(Base):
    __tablename__ = "tasks"
    id = Column(String, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(Text)
    deadline = Column(String)
    tags = Column(Text)  # Stored as JSON string
    status = Column(String)
    createdAt = Column(Float)

Base.metadata.create_all(bind=engine)

# Pydantic Schemas
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

class TaskResponse(TaskBase):
    id: str
    createdAt: float

    class Config:
        from_attributes = True

# FastAPI App
app = FastAPI(title="VoxTask Pro API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
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
    db_tasks = db.query(TaskModel).all()
    results = []
    for task in db_tasks:
        task_dict = {
            "id": task.id,
            "title": task.title,
            "description": task.description,
            "deadline": task.deadline,
            "tags": json.loads(task.tags or "[]"),
            "status": task.status,
            "createdAt": task.createdAt
        }
        results.append(task_dict)
    return results

@app.post("/tasks", response_model=TaskResponse)
def create_task(task: TaskCreate, db: Session = Depends(get_db)):
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
        "id": db_task.id,
        "title": db_task.title,
        "description": db_task.description,
        "deadline": db_task.deadline,
        "tags": task.tags,
        "status": db_task.status,
        "createdAt": db_task.createdAt
    }

@app.patch("/tasks/{task_id}", response_model=TaskResponse)
def update_task(task_id: str, updates: TaskUpdate, db: Session = Depends(get_db)):
    db_task = db.query(TaskModel).filter(TaskModel.id == task_id).first()
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
        "title": db_task.title,
        "description": db_task.description,
        "deadline": db_task.deadline,
        "tags": json.loads(db_task.tags),
        "status": db_task.status,
        "createdAt": db_task.createdAt
    }

@app.delete("/tasks/{task_id}")
def delete_task(task_id: str, db: Session = Depends(get_db)):
    db_task = db.query(TaskModel).filter(TaskModel.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(db_task)
    db.commit()
    return {"status": "success", "message": f"Task {task_id} deleted"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
