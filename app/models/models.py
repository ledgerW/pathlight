from typing import Optional, List
from datetime import datetime
from sqlmodel import Field, SQLModel, Relationship
import uuid


class User(SQLModel, table=True):
    __tablename__ = "users"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str
    email: str
    progress_state: str = Field(default="0")  # Stores the current question number
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    payment_complete: bool = Field(default=False)
    
    # Relationships
    form_responses: List["FormResponse"] = Relationship(back_populates="user")
    result: Optional["Result"] = Relationship(back_populates="user")


class FormResponse(SQLModel, table=True):
    __tablename__ = "form_responses"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id")
    question_number: int
    response: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    user: User = Relationship(back_populates="form_responses")


class Result(SQLModel, table=True):
    __tablename__ = "results"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", unique=True)
    summary: str
    full_plan: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    user: User = Relationship(back_populates="result")
