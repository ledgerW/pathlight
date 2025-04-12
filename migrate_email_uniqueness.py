#!/usr/bin/env python3
"""
Database migration script to add a uniqueness constraint to the email column in the users table.
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
    """Run the database migration to add email uniqueness constraint"""
    with engine.connect() as conn:
        # Start a transaction
        with conn.begin():
            print("Starting email uniqueness migration...")
            
            # Check if there are duplicate emails in the users table
            print("Checking for duplicate emails...")
            result = conn.execute(text("""
                SELECT email, COUNT(*) 
                FROM users 
                GROUP BY email 
                HAVING COUNT(*) > 1
            """))
            
            duplicates = result.fetchall()
            
            if duplicates:
                print(f"Found {len(duplicates)} emails with duplicates:")
                for email, count in duplicates:
                    print(f"  - {email}: {count} occurrences")
                
                print("\nResolving duplicate emails...")
                
                # For each duplicate email, keep the most recently updated record and delete others
                for email, _ in duplicates:
                    # Find all user IDs with this email, ordered by updated_at (most recent first)
                    result = conn.execute(text("""
                        SELECT id FROM users 
                        WHERE email = :email 
                        ORDER BY updated_at DESC
                    """), {"email": email})
                    
                    user_ids = [str(row[0]) for row in result.fetchall()]
                    
                    if len(user_ids) <= 1:
                        continue
                    
                    # Keep the first (most recent) user and delete the rest
                    keep_id = user_ids[0]
                    delete_ids = user_ids[1:]
                    
                    print(f"  - For email {email}: keeping user {keep_id}, removing {len(delete_ids)} duplicate(s)")
                    
                    # Delete duplicate users
                    # First, handle any foreign key constraints by updating or deleting related records
                    for delete_id in delete_ids:
                        # Update form_responses to point to the kept user
                        conn.execute(text("""
                            UPDATE form_responses 
                            SET user_id = :keep_id 
                            WHERE user_id = :delete_id
                        """), {"keep_id": keep_id, "delete_id": delete_id})
                        
                        # Delete any results for the duplicate users
                        conn.execute(text("""
                            DELETE FROM results 
                            WHERE user_id = :delete_id
                        """), {"delete_id": delete_id})
                        
                        # Now delete the duplicate user
                        conn.execute(text("""
                            DELETE FROM users 
                            WHERE id = :delete_id
                        """), {"delete_id": delete_id})
            else:
                print("No duplicate emails found.")
            
            # Add uniqueness constraint to email column
            print("Adding uniqueness constraint to email column...")
            try:
                conn.execute(text("""
                    ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email)
                """))
                print("Email uniqueness constraint added successfully")
            except Exception as e:
                if "already exists" in str(e):
                    print("Email uniqueness constraint already exists")
                else:
                    raise
            
            print("Email uniqueness migration completed successfully")

if __name__ == "__main__":
    try:
        run_migration()
    except Exception as e:
        print(f"Error during migration: {e}")
        sys.exit(1)
