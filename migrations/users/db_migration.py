#!/usr/bin/env python3
"""
Database migration script to add the dob column and convert payment_complete to payment_tier.
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
            
            # Check if dob column exists
            result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'dob'"))
            dob_exists = result.fetchone() is not None
            
            # Check if payment_tier column exists
            result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'payment_tier'"))
            payment_tier_exists = result.fetchone() is not None
            
            # Check if payment_complete column exists
            result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'payment_complete'"))
            payment_complete_exists = result.fetchone() is not None
            
            # Add dob column if it doesn't exist
            if not dob_exists:
                print("Adding dob column to users table...")
                conn.execute(text("ALTER TABLE users ADD COLUMN dob TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()"))
                print("dob column added successfully")
            else:
                print("dob column already exists")
            
            # Add payment_tier column if it doesn't exist
            if not payment_tier_exists:
                print("Adding payment_tier column to users table...")
                conn.execute(text("ALTER TABLE users ADD COLUMN payment_tier VARCHAR(10) DEFAULT 'none'"))
                print("payment_tier column added successfully")
            else:
                print("payment_tier column already exists")
            
            # Migrate data from payment_complete to payment_tier if both columns exist
            if payment_complete_exists and payment_tier_exists:
                print("Migrating data from payment_complete to payment_tier...")
                conn.execute(text("UPDATE users SET payment_tier = 'premium' WHERE payment_complete = TRUE AND payment_tier = 'none'"))
                print("Data migration completed successfully")
            
            # Drop payment_complete column if it exists
            if payment_complete_exists:
                print("Dropping payment_complete column...")
                conn.execute(text("ALTER TABLE users DROP COLUMN payment_complete"))
                print("payment_complete column dropped successfully")
            
            print("Database migration completed successfully")

if __name__ == "__main__":
    try:
        run_migration()
    except Exception as e:
        print(f"Error during migration: {e}")
        sys.exit(1)
