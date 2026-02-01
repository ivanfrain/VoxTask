
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy import Column, String, Float, Text, create_engine
from sqlalchemy.orm import sessionmaker, Session, declarative_base
import uuid
import time
import json

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

Base.metadata.create_all(bind=engine)

class TaskBase(BaseModel):
    title: str
    description: str
    deadline: str
    tags: List[str]
    status: str

class TaskCreate(TaskBase):
    pass

class TaskResponse(TaskBase):
    id: str
    createdAt: float
    class Config:
        from_attributes = True

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.get("/tasks", response_model=List[TaskResponse])
def read_tasks(db: Session = Depends(get_db)):
    db_tasks = db.query(TaskModel).all()
    return [{"id": t.id, "title": t.title, "description": t.description, "deadline": t.deadline, "tags": json.loads(t.tags or "[]"), "status": t.status, "createdAt": t.createdAt} for t in db_tasks]

@app.post("/tasks", response_model=TaskResponse)
def create_task(task: TaskCreate, db: Session = Depends(get_db)):
    db_task = TaskModel(id=str(uuid.uuid4()), title=task.title, description=task.description, deadline=task.deadline, tags=json.dumps(task.tags), status=task.status, createdAt=time.time())
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return {**task.dict(), "id": db_task.id, "createdAt": db_task.createdAt}

@app.patch("/tasks/{task_id}", response_model=TaskResponse)
def update_task(task_id: str, updates: TaskCreate, db: Session = Depends(get_db)):
    db_task = db.query(TaskModel).filter(TaskModel.id == task_id).first()
    if not db_task: raise HTTPException(404)
    for k, v in updates.dict().items(): setattr(db_task, k, json.dumps(v) if k == "tags" else v)
    db.commit()
    return {**updates.dict(), "id": db_task.id, "createdAt": db_task.createdAt}

@app.delete("/tasks/{task_id}")
def delete_task(task_id: str, db: Session = Depends(get_db)):
    db_task = db.query(TaskModel).filter(TaskModel.id == task_id).first()
    if not db_task: raise HTTPException(404)
    db.delete(db_task)
    db.commit()
    return {"status": "success"}
