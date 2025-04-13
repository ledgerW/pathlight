#!/usr/bin/env python3
"""
Direct database migration script using psycopg2 to:
1. Add the basic_plan column to the results table
2. Migrate data from summary to basic_plan
3. Drop the summary column
"""

import os
import json
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get database connection parameters from environment
DB_HOST = os.getenv("PGHOST")
DB_PORT = os.getenv("PGPORT")
DB_NAME = os.getenv("PGDATABASE")
DB_USER = os.getenv("PGUSER")
DB_PASSWORD = os.getenv("PGPASSWORD")

def migrate_database():
    """Perform the database migration using direct psycopg2 connection"""
    print("Starting direct database migration...")
    
    # Connect to the database
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        print("Connected to the database")
        
        # Create a cursor
        cursor = conn.cursor()
        
        # Step 1: Check if basic_plan column already exists
        try:
            cursor.execute("SELECT basic_plan FROM results LIMIT 1;")
            print("basic_plan column already exists, skipping column addition")
        except psycopg2.errors.UndefinedColumn:
            # Column doesn't exist, add it
            conn.rollback()  # Reset the transaction
            cursor.execute("ALTER TABLE results ADD COLUMN basic_plan TEXT;")
            conn.commit()
            print("Added basic_plan column to results table")
        
        # Step 2: Check if summary column exists and migrate data
        try:
            cursor.execute("SELECT id, summary FROM results;")
            results = cursor.fetchall()
            print(f"Found {len(results)} results to migrate")
            
            for result in results:
                result_id, summary = result
                
                # Extract mantra if available
                summary_text = summary if summary else ""
                mantra = ""
                
                if summary_text and "Mantra:" in summary_text:
                    parts = summary_text.split("Mantra:")
                    summary_text = parts[0].strip()
                    mantra = parts[1].strip()
                
                # Create basic_plan JSON
                basic_plan = {
                    "purpose": summary_text,
                    "mantra": mantra
                }
                
                # Convert to JSON string
                basic_plan_json = json.dumps(basic_plan)
                
                # Update the result
                cursor.execute(
                    "UPDATE results SET basic_plan = %s WHERE id = %s",
                    (basic_plan_json, result_id)
                )
                print(f"Migrated result {result_id}")
            
            conn.commit()
            print("Data migration completed successfully")
            
            # Step 3: Drop the summary column
            cursor.execute("ALTER TABLE results DROP COLUMN summary;")
            conn.commit()
            print("Dropped summary column from results table")
            
        except psycopg2.errors.UndefinedColumn:
            # summary column doesn't exist
            conn.rollback()  # Reset the transaction
            print("summary column doesn't exist, skipping data migration and column drop")
        
        print("Migration completed successfully!")
        
    except Exception as e:
        print(f"Error during migration: {str(e)}")
        if 'conn' in locals() and conn:
            conn.rollback()
        raise
    finally:
        # Close the connection
        if 'conn' in locals() and conn:
            conn.close()
            print("Database connection closed")

if __name__ == "__main__":
    # Ask for confirmation
    print("This will modify the results table to replace the 'summary' field with 'basic_plan'")
    print("Make sure you have a backup of your database before proceeding.")
    confirm = input("Do you want to proceed? (y/n): ")
    
    if confirm.lower() == 'y':
        try:
            # Run the migration
            migrate_database()
        except Exception as e:
            print(f"Migration failed: {str(e)}")
            print("Please restore your database from backup if needed.")
    else:
        print("Migration cancelled.")
