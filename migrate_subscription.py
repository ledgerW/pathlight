#!/usr/bin/env python3
"""
Database migration script to add subscription-related columns to the users table.
This script adds:
1. subscription_id column
2. subscription_status column
3. subscription_end_date column
4. Updates payment_tier values from 'basic'/'premium' to 'purpose'/'plan'
"""

import os
import sys
from datetime import datetime
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
            print("Starting database migration for subscription support...")
            
            # Check if subscription_id column exists
            result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'subscription_id'"))
            subscription_id_exists = result.fetchone() is not None
            
            # Add subscription_id column if it doesn't exist
            if not subscription_id_exists:
                print("Adding subscription_id column to users table...")
                conn.execute(text("ALTER TABLE users ADD COLUMN subscription_id TEXT DEFAULT NULL"))
                print("subscription_id column added successfully")
            else:
                print("subscription_id column already exists")
            
            # Check if subscription_status column exists
            result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'subscription_status'"))
            subscription_status_exists = result.fetchone() is not None
            
            # Add subscription_status column if it doesn't exist
            if not subscription_status_exists:
                print("Adding subscription_status column to users table...")
                conn.execute(text("ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT NULL"))
                print("subscription_status column added successfully")
            else:
                print("subscription_status column already exists")
            
            # Check if subscription_end_date column exists
            result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'subscription_end_date'"))
            subscription_end_date_exists = result.fetchone() is not None
            
            # Add subscription_end_date column if it doesn't exist
            if not subscription_end_date_exists:
                print("Adding subscription_end_date column to users table...")
                conn.execute(text("ALTER TABLE users ADD COLUMN subscription_end_date TIMESTAMP DEFAULT NULL"))
                print("subscription_end_date column added successfully")
            else:
                print("subscription_end_date column already exists")
            
            # Update payment_tier values
            print("Updating payment_tier values...")
            conn.execute(text("UPDATE users SET payment_tier = 'purpose' WHERE payment_tier = 'basic'"))
            conn.execute(text("UPDATE users SET payment_tier = 'plan' WHERE payment_tier = 'premium'"))
            print("payment_tier values updated successfully")
            
            print("Database migration completed successfully")

if __name__ == "__main__":
    try:
        run_migration()
    except Exception as e:
        print(f"Error during migration: {e}")
        sys.exit(1)
