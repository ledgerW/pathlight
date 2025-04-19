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
