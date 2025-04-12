import os
from sqlmodel import SQLModel, Session, create_engine
from dotenv import load_dotenv
from sqlalchemy.pool import QueuePool

# Load environment variables
load_dotenv()

# Use PostgreSQL database
DATABASE_URL = os.getenv("DATABASE_URL")

# Create engine with PostgreSQL and connection pooling
engine = create_engine(
    DATABASE_URL,
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=1800,
    pool_pre_ping=True,
    poolclass=QueuePool,
    connect_args={"sslmode": "prefer"}  # Use SSL but don't require it
)

# Function to create tables
def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

# Function to get a database session
def get_session():
    with Session(engine) as session:
        try:
            yield session
        except Exception as e:
            session.rollback()
            print(f"Database session error: {str(e)}")
            raise
