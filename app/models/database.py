import os
from sqlmodel import SQLModel, Session, create_engine
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Use SQLite for local development
DATABASE_URL = "sqlite:///./pathlight.db"

# Create engine with SQLite
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

# Function to create tables
def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

# Function to get a database session
def get_session():
    with Session(engine) as session:
        yield session
