#!/usr/bin/env python3
"""
Database migration script to update the Result table:
- Replace 'summary' field with 'basic_plan' field that stores SummaryOutput as JSON
"""

import os
import json
from sqlmodel import Session, SQLModel, create_engine, select
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

def migrate_results():
    """Migrate the Result table to use basic_plan instead of summary"""
    with Session(engine) as session:
        # Get all results
        results = session.exec(select(Result)).all()
        
        print(f"Found {len(results)} results to migrate")
        
        for result in results:
            # Convert existing summary to basic_plan JSON format
            try:
                # Extract mantra if available
                mantra = ""
                if hasattr(result, 'summary') and result.summary:
                    if "Mantra:" in result.summary:
                        parts = result.summary.split("Mantra:")
                        summary = parts[0].strip()
                        mantra = parts[1].strip()
                    else:
                        summary = result.summary
                else:
                    summary = ""
                
                # Create basic_plan JSON
                basic_plan = {
                    "purpose": summary,
                    "mantra": mantra
                }
                
                # Convert to JSON string
                basic_plan_json = json.dumps(basic_plan)
                
                # Update the result
                result.basic_plan = basic_plan_json
                session.add(result)
                
                print(f"Migrated result {result.id}")
                
            except Exception as e:
                print(f"Error migrating result {result.id}: {str(e)}")
        
        # Commit the changes
        session.commit()
        print("Migration completed successfully")

if __name__ == "__main__":
    # Run the migration
    migrate_results()
