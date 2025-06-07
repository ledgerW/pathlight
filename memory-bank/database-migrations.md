# Database Migrations and PostgreSQL Usage

This document outlines the database migration patterns and PostgreSQL usage in the Pathlight project.

## Database Configuration

The project uses PostgreSQL as its primary database system. The database connection is configured in `app/models/database.py`:

```python
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
```

## Migration Pattern

Database migrations in this project follow a specific pattern using SQLAlchemy and direct SQL execution. Here's the standard template for creating a migration script:

```python
#!/usr/bin/env python3
"""
Database migration script to [describe the purpose].
"""

import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Use PostgreSQL database
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("Error: DATABASE_URL environment variable not set")
    sys.exit(1)

# Create engine with PostgreSQL
engine = create_engine(DATABASE_URL)

def run_migration():
    """Run the database migration"""
    with engine.connect() as conn:
        # Start a transaction
        with conn.begin():
            print("Starting database migration...")
            
            # Check if column exists
            result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'table_name' AND column_name = 'column_name'"))
            column_exists = result.fetchone() is not None
            
            # Add column if it doesn't exist
            if not column_exists:
                print("Adding column to table...")
                conn.execute(text("ALTER TABLE table_name ADD COLUMN column_name DATA_TYPE DEFAULT default_value"))
                print("Column added successfully")
            else:
                print("Column already exists")
            
            print("Database migration completed successfully")

if __name__ == "__main__":
    try:
        run_migration()
    except Exception as e:
        print(f"Error during migration: {e}")
        sys.exit(1)
```

## Running Migrations

Always use Poetry to run migration scripts:

```bash
poetry run python migration_script.py
```

## Common Migration Operations

### Adding a Column

```sql
ALTER TABLE table_name ADD COLUMN column_name DATA_TYPE DEFAULT default_value;
```

### Removing a Column

```sql
ALTER TABLE table_name DROP COLUMN column_name;
```

### Modifying a Column

```sql
ALTER TABLE table_name ALTER COLUMN column_name TYPE new_data_type;
ALTER TABLE table_name ALTER COLUMN column_name SET DEFAULT new_default_value;
```

### Renaming a Column

```sql
ALTER TABLE table_name RENAME COLUMN old_column_name TO new_column_name;
```

### Data Migration

```sql
UPDATE table_name SET target_column = source_column WHERE condition;
```

## Important Notes

1. **Always Check First**: Before making any changes, always check if the column/table already exists to avoid errors.

2. **Use Transactions**: Always wrap migrations in transactions to ensure atomicity.

3. **Error Handling**: Include proper error handling to catch and report issues.

4. **Documentation**: Update the memory bank after creating and running migrations.

5. **SQLite vs PostgreSQL**: The project uses PostgreSQL in both development and production. Do not use SQLite-specific syntax in migrations.

## Example Migrations

### Adding regeneration_count to Results Table

```python
#!/usr/bin/env python3
"""
Database migration script to add regeneration_count column to the results table.
"""

import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Use PostgreSQL database
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("Error: DATABASE_URL environment variable not set")
    sys.exit(1)

# Create engine with PostgreSQL
engine = create_engine(DATABASE_URL)

def run_migration():
    """Run the database migration"""
    with engine.connect() as conn:
        # Start a transaction
        with conn.begin():
            print("Starting database migration...")
            
            # Check if regeneration_count column exists
            result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'results' AND column_name = 'regeneration_count'"))
            column_exists = result.fetchone() is not None
            
            # Add regeneration_count column if it doesn't exist
            if not column_exists:
                print("Adding regeneration_count column to results table...")
                conn.execute(text("ALTER TABLE results ADD COLUMN regeneration_count INTEGER DEFAULT 0"))
                print("regeneration_count column added successfully")
            else:
                print("regeneration_count column already exists")
            
            print("Database migration completed successfully")

if __name__ == "__main__":
    try:
        run_migration()
    except Exception as e:
        print(f"Error during migration: {e}")
        sys.exit(1)
```

This document will be updated as new migration patterns and database operations are implemented.
