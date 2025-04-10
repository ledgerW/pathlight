import os
from sqlmodel import SQLModel, Session, create_engine
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Use PostgreSQL database
DATABASE_URL = os.getenv("DATABASE_URL")

# Create engine with PostgreSQL
engine = create_engine(DATABASE_URL)

# Function to create tables
def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

# Function to get a database session
def get_session():
    with Session(engine) as session:
        yield session
