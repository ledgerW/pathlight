from typing import Optional, List
from datetime import datetime
from sqlmodel import Field, SQLModel, Relationship
import uuid
from pydantic import validator


class User(SQLModel, table=True):
    __tablename__ = "users"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str
    email: str = Field(unique=True)
    dob: datetime  # Date of birth
    progress_state: str = Field(default="0")  # Stores the current question number
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    payment_tier: str = Field(default="none")  # none, basic, premium
    
    # Relationships
    form_responses: List["FormResponse"] = Relationship(back_populates="user")
    result: Optional["Result"] = Relationship(back_populates="user")
    
    # Validator to convert string date to datetime
    @validator('dob', pre=True)
    def parse_dob(cls, value):
        if isinstance(value, str):
            try:
                # Try to parse ISO format date string
                return datetime.fromisoformat(value.replace('Z', '+00:00'))
            except ValueError:
                try:
                    # Fallback to strptime for other formats
                    return datetime.strptime(value, "%Y-%m-%dT%H:%M:%S.%fZ")
                except ValueError:
                    # Another fallback for simpler format
                    return datetime.strptime(value, "%Y-%m-%d")
        return value


class FormResponse(SQLModel, table=True):
    __tablename__ = "form_responses"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id")
    question_number: int
    response: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    user: User = Relationship(back_populates="form_responses")
    
    # Validator to convert string UUID to UUID object
    @validator('user_id', pre=True)
    def parse_user_id(cls, value):
        if isinstance(value, str):
            try:
                return uuid.UUID(value)
            except ValueError:
                raise ValueError(f"Invalid UUID format: {value}")
        return value


class Result(SQLModel, table=True):
    __tablename__ = "results"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", unique=True)
    basic_plan: str  # Stores SummaryOutput as JSON
    full_plan: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_generated_at: datetime = Field(default_factory=datetime.utcnow)
    regeneration_count: int = Field(default=0)  # Track number of regenerations
    
    # Relationships
    user: User = Relationship(back_populates="result")
