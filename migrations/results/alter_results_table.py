#!/usr/bin/env python3
"""
Database migration script to alter the results table structure:
- Add the new basic_plan column
- Migrate data from summary to basic_plan
- Drop the summary column
"""

import os
import json
from sqlalchemy import text
from sqlmodel import Session, create_engine
from app.models.models import Result
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable not set")

# Create engine
engine = create_engine(DATABASE_URL)

def alter_table():
    """Alter the results table structure"""
    # First, determine the database type
    is_sqlite = False
    try:
        # Create a separate session just for detection
        with Session(engine) as detect_session:
            try:
                # Try to detect SQLite
                db_type = detect_session.execute(text("SELECT sqlite_version();")).scalar()
                is_sqlite = True
                print("Detected SQLite database")
            except Exception:
                # If that fails, it's not SQLite
                is_sqlite = False
                print("Detected non-SQLite database (PostgreSQL or other)")
            detect_session.commit()
    except Exception as e:
        print(f"Error detecting database type: {str(e)}")
        return
    
    # Now proceed with the migration in a new session
    with Session(engine) as session:
        try:
            # SQLite-compatible approach for altering tables
            
            if is_sqlite:
                print("Detected SQLite database, using SQLite-compatible migration")
                
                # For SQLite, we need to:
                # 1. Create a new table with the desired structure
                # 2. Copy data from the old table
                # 3. Drop the old table
                # 4. Rename the new table
                
                # Create a new table with the desired structure
                session.execute(text("""
                    CREATE TABLE results_new (
                        id TEXT PRIMARY KEY,
                        user_id TEXT UNIQUE,
                        basic_plan TEXT,
                        full_plan TEXT,
                        created_at TIMESTAMP
                    );
                """))
                print("Created new results table")
                
                # Copy data from the old table, transforming summary to basic_plan
                results = session.exec(text("SELECT id, user_id, summary, full_plan, created_at FROM results")).all()
                print(f"Found {len(results)} results to migrate")
                
                for result in results:
                    # Extract mantra if available
                    summary = result.summary if result.summary else ""
                    mantra = ""
                    
                    if summary and "Mantra:" in summary:
                        parts = summary.split("Mantra:")
                        summary = parts[0].strip()
                        mantra = parts[1].strip()
                    
                    # Create basic_plan JSON
                    basic_plan = {
                        "purpose": summary,
                        "mantra": mantra
                    }
                    
                    # Convert to JSON string
                    basic_plan_json = json.dumps(basic_plan)
                    
                    # Insert into new table
                    session.execute(
                        text("""
                            INSERT INTO results_new (id, user_id, basic_plan, full_plan, created_at)
                            VALUES (:id, :user_id, :basic_plan, :full_plan, :created_at)
                        """),
                        {
                            "id": result.id,
                            "user_id": result.user_id,
                            "basic_plan": basic_plan_json,
                            "full_plan": result.full_plan,
                            "created_at": result.created_at
                        }
                    )
                    print(f"Migrated result {result.id}")
                
                # Commit the changes
                session.commit()
                
                # Drop the old table and rename the new one
                session.execute(text("DROP TABLE results;"))
                session.execute(text("ALTER TABLE results_new RENAME TO results;"))
                
                # Final commit
                session.commit()
                print("Table structure migration completed successfully")
                
            else:
                # For other databases, we can use standard ALTER TABLE
                print("Using standard ALTER TABLE for non-SQLite database")
                
                # 1. Check if basic_plan column already exists
                try:
                    # Try to select from the basic_plan column
                    session.execute(text("SELECT basic_plan FROM results LIMIT 1;"))
                    print("basic_plan column already exists, skipping column addition")
                except Exception:
                    # Column doesn't exist, add it
                    session.execute(text("ALTER TABLE results ADD COLUMN basic_plan TEXT;"))
                    print("Added basic_plan column to results table")
                
                # 2. Check if summary column exists before migrating data
                try:
                    # Try to select from the summary column
                    session.execute(text("SELECT summary FROM results LIMIT 1;"))
                    
                    # If we get here, the column exists, so migrate the data
                    # Get all results
                    results = session.exec(text("SELECT id, summary FROM results")).all()
                    print(f"Found {len(results)} results to migrate")
                    
                    for result in results:
                        # Extract mantra if available
                        summary = result.summary if result.summary else ""
                        mantra = ""
                        
                        if summary and "Mantra:" in summary:
                            parts = summary.split("Mantra:")
                            summary = parts[0].strip()
                            mantra = parts[1].strip()
                        
                        # Create basic_plan JSON
                        basic_plan = {
                            "purpose": summary,
                            "mantra": mantra
                        }
                        
                        # Convert to JSON string
                        basic_plan_json = json.dumps(basic_plan)
                        
                        # Update the result
                        session.execute(
                            text("UPDATE results SET basic_plan = :basic_plan WHERE id = :id"),
                            {"basic_plan": basic_plan_json, "id": result.id}
                        )
                        print(f"Migrated result {result.id}")
                    
                    print("Data migration completed successfully")
                except Exception as e:
                    print(f"summary column doesn't exist or error occurred: {str(e)}")
                    print("Skipping data migration")
                
                # Commit the changes
                session.commit()
                print("Data migration completed successfully")
                
                # 3. Check if summary column exists before dropping it
                try:
                    # Try to select from the summary column
                    session.execute(text("SELECT summary FROM results LIMIT 1;"))
                    # If we get here, the column exists, so drop it
                    session.execute(text("ALTER TABLE results DROP COLUMN summary;"))
                    print("Dropped summary column from results table")
                except Exception:
                    # Column doesn't exist, skip dropping
                    print("summary column doesn't exist, skipping column drop")
                
                # Final commit
                session.commit()
                print("Table structure migration completed successfully")
            
        except Exception as e:
            print(f"Error during migration: {str(e)}")
            session.rollback()
            raise

if __name__ == "__main__":
    # Run the migration
    alter_table()
